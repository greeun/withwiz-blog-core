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
    sortBy?: 'createdAt' | 'publishedAt' | 'updatedAt';
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
      const { page, limit, category, published, search, sortBy = 'updatedAt' } = options;
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

      const [items, total] = await Promise.all([
        delegate.findMany({
          where,
          select: listSelect,
          orderBy: { [sortBy]: 'desc' },
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

      const { attachments, tagIds, tagSlugs: _tagSlugs, ...rest } = data;
      void _tagSlugs;

      const postCreateData = {
        ...rest,
        slug,
        content: sanitize(data.content) || data.content,
        coverImageUrl: data.coverImageUrl || null,
        coverImageKey: data.coverImageKey || null,
        attachments: (attachments || []) as any,
        authorId,
        publishedAt: data.publishedAt ? new Date(data.publishedAt as string) : data.published ? new Date() : null,
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
      const { attachments, tagIds, tagSlugs: _tagSlugs, ...rest } = data;
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
        updateData.content = sanitize(data.content) || data.content;
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
      const result = await delegate.updateMany({
        where: { id: { in: ids } },
        data: { published, updatedAt: new Date() } as any,
      });
      return result.count;
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
