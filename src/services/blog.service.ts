/**
 * 블로그 서비스 팩토리
 *
 * Prisma 클라이언트를 외부에서 주입받아 독립적으로 동작한다.
 * @withwiz/blog-system 및 @withwiz/pms 에 대한 의존성이 없다.
 */
import type {
  BlogListItem,
  BlogDetail,
  BlogNav,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  Attachment,
  DashboardStats,
} from '../types/blog';
import type { Tag } from '../types/tag';
import type { PaginatedResult } from '../types/common';
import type { PrismaClientLike, StorageAdapter } from '../types/config';
import { buildPaginatedResult } from '../utils/pagination';
import { sanitizeHtmlContent } from '../utils/html-sanitizer';
import { BlogError, BLOG_ERROR_CODES } from '../errors';
import {
  type PrismaDelegate,
  listSelect,
  tagInclude,
  detailSelect,
  navSelect,
  toListItem,
  flattenTags,
  toDetail,
  uniqueSlug,
} from './blog.service.internal';

// Prisma 덕타이핑 / select 정의 / 행→DTO 매퍼 / uniqueSlug 는
// ./blog.service.internal 로 분리되었다 (동작 불변).

// ── 서비스 설정 ──

export interface BlogServiceConfig {
  modelName: string;
  enableTags?: boolean;
  /** 태그 모델명 (default: 'tag') */
  tagModelName?: string;
  /** PostTag 중계 모델명 (default: 'postTag') */
  postTagModelName?: string;
  storage?: StorageAdapter;
  sanitizeContent?: (html: string | null | undefined) => string | null;
  onViewCount?: (entityType: string, ids: string[]) => Promise<Map<string, number>>;
}

// ── 서비스 인터페이스 ──

export interface BlogService {
  listPublished(options: {
    page: number;
    limit: number;
    category?: string;
    search?: string;
    tagSlug?: string;
    tagSlugs?: string[];
  }): Promise<PaginatedResult<BlogListItem>>;

  getPublishedBySlug(slug: string): Promise<BlogDetail | null>;

  getFeatured(limit?: number): Promise<BlogListItem[]>;

  getAdjacentPosts(currentId: string): Promise<{ prev: BlogNav | null; next: BlogNav | null }>;

  checkSlugAvailable(slug: string, excludeId?: string): Promise<boolean>;

  listAll(options: {
    page: number;
    limit: number;
    category?: string;
    published?: string;
    search?: string;
    sortBy?:
      | 'title'
      | 'category'
      | 'published'
      | 'featured'
      | 'author'
      | 'createdAt'
      | 'publishedAt'
      | 'updatedAt';
    sortDir?: 'asc' | 'desc';
  }): Promise<PaginatedResult<BlogListItem>>;

  getById(id: string): Promise<BlogDetail | null>;

  create(data: CreateBlogPostInput, authorId: string): Promise<BlogDetail>;

  update(id: string, data: UpdateBlogPostInput): Promise<BlogDetail>;

  remove(id: string): Promise<void>;

  removeMany(ids: string[]): Promise<number>;

  togglePublish(id: string): Promise<{ published: boolean; publishedAt: Date | null }>;

  bulkUpdatePublished(ids: string[], published: boolean): Promise<number>;

  bulkUpdateFeatured(ids: string[], featured: boolean): Promise<number>;

  getDashboardStats(): Promise<DashboardStats>;
}

// ── 입력 필드 허용 목록 ──

/**
 * 관리자 생성·수정 경로가 Prisma 로 넘길 수 있는 입력 필드 (blog.validator 스키마 필드와 같은 목록).
 * 라우트는 스키마 검증으로 한 번 거르지만, 소비 프로젝트가 서비스를 직접 호출하는 경로는
 * 라우트를 거치지 않는다. 그래서 서비스에서도 이 목록만 골라 넘겨 id·authorId·중첩 쓰기 같은
 * 스키마 밖 필드가 Prisma 까지 전달되지 않게 한다.
 */
export const POST_INPUT_FIELDS = [
  'title',
  'content',
  'editorType',
  'excerpt',
  'category',
  'coverImageUrl',
  'coverImageKey',
  'attachments',
  'featured',
  'published',
  'publishedAt',
  'slug',
  'tagIds',
  'tagSlugs',
] as const satisfies ReadonlyArray<keyof CreateBlogPostInput>;

/** 입력에 있는 허용 필드만 복사한다. 값은 변환하지 않고, 없는 필드는 추가하지 않는다. */
export function pickPostInput<T extends object>(input: T): T {
  const source = input as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const key of POST_INPUT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) picked[key] = source[key];
  }
  return picked as T;
}

// ── 발행 시각 규칙 ──

/**
 * 비공개 글에는 예약(미래) 발행 시각만 남긴다.
 *
 * 스케줄러는 `published=false` 이고 `publishedAt` 이 지난 글을 예약 글로 보고 공개한다.
 * 그래서 비공개로 저장하면서 과거 시각을 남기면 다음 스케줄러 실행이 그 글을 다시 공개한다.
 * 공개 글이거나 시각이 없거나 미래 시각이면 값을 그대로 돌려준다.
 */
export function keepOnlyReservation(
  published: boolean,
  publishedAt: Date | null,
  now: Date = new Date(),
): Date | null {
  if (published || !publishedAt) return publishedAt;
  return publishedAt.getTime() > now.getTime() ? publishedAt : null;
}

// ── 팩토리 함수 ──

export function createBlogService(prisma: PrismaClientLike, config: BlogServiceConfig): BlogService {
  const delegate: PrismaDelegate = prisma[config.modelName];
  if (!delegate) {
    throw new Error(`Prisma model "${config.modelName}" not found. Check BlogServiceConfig.modelName.`);
  }

  const sanitize = config.sanitizeContent ?? sanitizeHtmlContent;
  const storage = config.storage;
  const tagsEnabled = config.enableTags === true;
  const postTagModelName = config.postTagModelName ?? 'postTag';
  const detailQuery = tagsEnabled
    ? { ...detailSelect, ...tagInclude }
    : detailSelect;

  return {
    // ── Public ──

    async listPublished(options) {
      const page = Number.isFinite(options.page) ? Math.max(1, options.page) : 1;
      const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 12;
      const skip = (page - 1) * limit;

      const where: any = {
        published: true,
        ...(options.category && { category: options.category }),
        ...(options.search && {
          OR: [
            { title: { contains: options.search, mode: 'insensitive' } },
          ],
        }),
        ...(tagsEnabled && options.tagSlug
          ? { tags: { some: { tag: { slug: options.tagSlug } } } }
          : tagsEnabled && options.tagSlugs && options.tagSlugs.length > 0
          ? { tags: { some: { tag: { slug: { in: options.tagSlugs } } } } }
          : {}),
      };

      const [items, total] = await Promise.all([
        delegate.findMany({
          where,
          select: listSelect,
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit,
        }),
        delegate.count({ where }),
      ]);

      return buildPaginatedResult(
        items.map((i: any) => toListItem(i as Record<string, unknown>)),
        total,
        page,
        limit,
      );
    },

    async getPublishedBySlug(slug) {
      const post = await delegate.findFirst({
        where: { slug, published: true },
        select: detailQuery,
      });
      if (!post) return null;
      return toDetail(post as Record<string, unknown>);
    },

    async getFeatured(limit = 1) {
      const items = await delegate.findMany({
        where: { published: true, featured: true },
        select: listSelect,
        orderBy: { publishedAt: 'desc' },
        take: limit,
      });
      return items.map((i: any) => toListItem(i as Record<string, unknown>));
    },

    async getAdjacentPosts(currentId) {
      const current = await delegate.findUnique({
        where: { id: currentId },
        select: { publishedAt: true },
      });

      if (!current?.publishedAt) return { prev: null, next: null };

      const [prev, next] = await Promise.all([
        delegate.findFirst({
          where: { published: true, publishedAt: { lt: current.publishedAt } },
          select: navSelect,
          orderBy: { publishedAt: 'desc' },
        }),
        delegate.findFirst({
          where: { published: true, publishedAt: { gt: current.publishedAt } },
          select: navSelect,
          orderBy: { publishedAt: 'asc' },
        }),
      ]);

      return {
        prev: prev as BlogNav | null,
        next: next as BlogNav | null,
      };
    },

    async checkSlugAvailable(slug, excludeId?) {
      const existing = await delegate.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      return existing === null;
    },

    // ── Admin ──

    async listAll(options) {
      const { page, limit, category, published, search, sortBy = 'updatedAt', sortDir = 'desc' } = options;
      const skip = (page - 1) * limit;

      const where: any = {
        ...(category && { category }),
        ...(published !== undefined && { published: published === 'true' }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const orderBy: any =
        sortBy === 'author'
          ? { author: { name: sortDir } }
          : { [sortBy]: sortDir };

      const [items, total] = await Promise.all([
        delegate.findMany({
          where,
          select: listSelect,
          orderBy,
          skip,
          take: limit,
        }),
        delegate.count({ where }),
      ]);

      let listItems = items.map((i: any) => toListItem(i as Record<string, unknown>));

      if (config.onViewCount) {
        const viewCountMap = await config.onViewCount(
          config.modelName.toUpperCase(),
          listItems.map((i) => i.id),
        );
        listItems = listItems.map((item) => ({
          ...item,
          viewCount: viewCountMap.get(item.id) ?? 0,
        }));
      }

      return buildPaginatedResult(listItems, total, page, limit);
    },

    async getById(id) {
      const post = await delegate.findUnique({
        where: { id },
        select: detailQuery,
      });
      if (!post) return null;
      return toDetail(post as Record<string, unknown>);
    },

    async create(data, authorId) {
      const slug = await uniqueSlug(delegate, data.slug);

      const { attachments, tagIds, tagSlugs: _tagSlugs, ...rest } = pickPostInput(data);
      void _tagSlugs;

      const postCreateData = {
        ...rest,
        slug,
        // 새니타이즈 결과가 비어도 원본으로 되돌리지 않는다 (위험 요소만 있던 본문)
        content: sanitize(data.content) ?? '',
        coverImageUrl: data.coverImageUrl || null,
        coverImageKey: data.coverImageKey || null,
        attachments: (attachments || []) as any,
        authorId,
        publishedAt: keepOnlyReservation(
          data.published === true,
          data.publishedAt ? new Date(data.publishedAt as string) : data.published ? new Date() : null,
        ),
      };

      const shouldSyncTags =
        tagsEnabled && tagIds && tagIds.length > 0 && !!prisma[postTagModelName]?.createMany;

      if (shouldSyncTags) {
        const post = await prisma.$transaction(async (tx: any) => {
          const created = await tx[config.modelName].create({
            data: postCreateData,
            select: detailSelect,
          });
          await tx[postTagModelName].createMany({
            data: (tagIds as string[]).map((tagId) => ({
              postId: (created as any).id,
              tagId,
            })),
            skipDuplicates: true,
          });
          return created;
        });
        return toDetail(post as Record<string, unknown>);
      }

      const post = await delegate.create({
        data: postCreateData,
        select: detailSelect,
      });
      return toDetail(post as Record<string, unknown>);
    },

    async update(id, data) {
      const { attachments, tagIds, tagSlugs: _tagSlugs, ...rest } = pickPostInput(data);
      void _tagSlugs;
      const updateData: any = { ...rest };

      if ('coverImageUrl' in updateData) {
        updateData.coverImageUrl = updateData.coverImageUrl || null;
      }
      if ('coverImageKey' in updateData) {
        updateData.coverImageKey = updateData.coverImageKey || null;
      }

      const hasTagSync =
        tagsEnabled &&
        tagIds !== undefined &&
        !!prisma[postTagModelName]?.deleteMany &&
        !!prisma[postTagModelName]?.createMany;

      const syncTagsInTx = async (tx: any) => {
        if (!hasTagSync) return;
        await tx[postTagModelName].deleteMany({ where: { postId: id } });
        if ((tagIds as string[]).length > 0) {
          await tx[postTagModelName].createMany({
            data: (tagIds as string[]).map((tagId) => ({ postId: id, tagId })),
            skipDuplicates: true,
          });
        }
      };

      if (attachments !== undefined) {
        updateData.attachments = attachments as any;
      }

      if (data.content !== undefined) {
        updateData.content = sanitize(data.content) ?? '';
      }

      const post = await prisma.$transaction(async (tx: any) => {
        if (data.publishedAt !== undefined) {
          updateData.publishedAt = data.publishedAt
            ? new Date(data.publishedAt as string)
            : null;
        } else if (data.published === true) {
          const existing = await tx[config.modelName].findUnique({
            where: { id },
            select: { published: true },
          });
          if (!existing?.published) {
            updateData.publishedAt = new Date();
          }
        }

        // 비공개로 저장할 때 과거 발행 시각이 남으면 스케줄러가 예약 글로 보고 다시 공개한다.
        if (data.published === false) {
          let target: Date | null;
          if ('publishedAt' in updateData) {
            target = updateData.publishedAt;
          } else {
            const existing = await tx[config.modelName].findUnique({
              where: { id },
              select: { publishedAt: true },
            });
            target = (existing?.publishedAt as Date | null | undefined) ?? null;
          }
          const kept = keepOnlyReservation(false, target);
          if (kept !== target) updateData.publishedAt = kept;
        }

        const updated = await tx[config.modelName].update({
          where: { id },
          data: updateData,
          select: detailSelect,
        });

        await syncTagsInTx(tx);
        return updated;
      });

      return toDetail(post as Record<string, unknown>);
    },

    async remove(id) {
      const post = await delegate.findUnique({
        where: { id },
        select: { coverImageKey: true, content: true, attachments: true },
      });

      if (!post) {
        throw new BlogError(BLOG_ERROR_CODES.POST_NOT_FOUND, `Post ${id} not found`, 404);
      }

      await delegate.delete({ where: { id } });

      // 스토리지 정리 (optional)
      if (!storage) return;

      const keys: string[] = [];
      if (post.coverImageKey) keys.push(post.coverImageKey as string);
      keys.push(...storage.collectKeysFromHtml(post.content as string | null));
      const attachments = (post.attachments as Attachment[] | null) || [];
      attachments.forEach((a) => { if (a.key) keys.push(a.key); });

      if (keys.length > 0) {
        await storage.deleteKeys(keys);
      }
    },

    async removeMany(ids) {
      let allKeys: string[] = [];

      if (storage) {
        const items = await delegate.findMany({
          where: { id: { in: ids } },
          select: { coverImageKey: true, content: true, attachments: true },
        });

        allKeys = items.flatMap((item: any) => {
          const keys: string[] = [];
          if (item.coverImageKey) keys.push(item.coverImageKey);
          keys.push(...storage.collectKeysFromHtml(item.content));
          const attachments = (item.attachments as Attachment[] | null) || [];
          attachments.forEach((a) => { if (a.key) keys.push(a.key); });
          return keys;
        });
      }

      const { count } = await delegate.deleteMany({
        where: { id: { in: ids } },
      });

      if (allKeys.length > 0 && storage) {
        await storage.deleteKeys([...new Set(allKeys)]);
      }

      return count;
    },

    async togglePublish(id) {
      const current = await delegate.findUnique({
        where: { id },
        select: { published: true },
      });

      if (!current) {
        throw new BlogError(BLOG_ERROR_CODES.POST_NOT_FOUND, `Post ${id} not found`, 404);
      }

      const newPublished = !current.published;
      const post = await delegate.update({
        where: { id },
        data: {
          published: newPublished,
          publishedAt: newPublished ? new Date() : null,
        },
        select: { published: true, publishedAt: true },
      });

      return post as { published: boolean; publishedAt: Date | null };
    },

    async bulkUpdatePublished(ids, published) {
      const now = new Date();
      return prisma.$transaction(async (tx: any) => {
        const model = tx[config.modelName];
        if (published) {
          // togglePublish 와 같이 발행 시각이 없는 글은 지금 시각으로 공개한다.
          await model.updateMany({
            where: { id: { in: ids }, publishedAt: null },
            data: { published: true, publishedAt: now, updatedAt: now },
          });
        } else {
          // 과거 발행 시각을 지우지 않으면 스케줄러가 예약 글로 보고 다시 공개한다.
          // 미래 시각은 예약이므로 유지한다.
          await model.updateMany({
            where: { id: { in: ids }, publishedAt: { lte: now } },
            data: { published: false, publishedAt: null, updatedAt: now },
          });
        }
        const result = await model.updateMany({
          where: { id: { in: ids } },
          data: { published, updatedAt: now },
        });
        return result.count;
      });
    },

    async bulkUpdateFeatured(ids, featured) {
      const result = await delegate.updateMany({
        where: { id: { in: ids } },
        data: { featured, updatedAt: new Date() } as any,
      });
      return result.count;
    },

    async getDashboardStats() {
      const [total, published, featured, categoryGroups, recentItems] = await Promise.all([
        delegate.count({}),
        delegate.count({ where: { published: true } }),
        delegate.count({ where: { featured: true } }),
        delegate.groupBy({
          by: ['category'],
          _count: { _all: true },
        }),
        delegate.findMany({
          select: listSelect,
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      const byCategory: Record<string, number> = {};
      for (const group of categoryGroups) {
        byCategory[group.category] = group._count._all;
      }

      return {
        total,
        published,
        unpublished: total - published,
        featured,
        byCategory,
        recentPosts: recentItems.map((i: any) => toListItem(i as Record<string, unknown>)),
      };
    },
  };
}
