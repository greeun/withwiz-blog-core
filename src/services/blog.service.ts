/**
 * 블로그 서비스 팩토리
 * Prisma 클라이언트를 외부에서 주입받아 독립적으로 동작한다.
 */
import type {
  BlogListItem,
  BlogDetail,
  BlogNav,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  Attachment,
  BlogServiceConfig,
  DashboardStats,
} from '../types/blog';
import type { Tag } from '../types/tag';
import type { PaginatedResult } from '../types/common';
import { buildPaginatedResult } from '../utils/pagination';
import { sanitizeHtmlContent } from '../utils/html-sanitizer';

// ── Prisma 타입 (주입된 인스턴스에서 사용) ──

/**
 * Prisma delegate 최소 인터페이스.
 *
 * 호스트 Prisma 클라이언트의 생성된 모델 delegate를 덕 타이핑으로 받기 위해
 * 제네릭으로 시그니처만 고정한다. (data/where 등의 구조 검증은 Prisma 측 책임)
 */
interface PrismaDelegate<TCreate = any, TWhere = any, TRow = any> {
  findMany(args: {
    where?: TWhere;
    select?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
    include?: any;
  }): Promise<TRow[]>;
  findFirst(args: {
    where?: TWhere;
    select?: any;
    orderBy?: any;
    include?: any;
  }): Promise<TRow | null>;
  findUnique(args: {
    where: TWhere;
    select?: any;
    include?: any;
  }): Promise<TRow | null>;
  create(args: { data: TCreate; select?: any; include?: any }): Promise<TRow>;
  update(args: {
    where: TWhere;
    data: Partial<TCreate>;
    select?: any;
    include?: any;
  }): Promise<TRow>;
  delete(args: { where: TWhere }): Promise<TRow>;
  deleteMany(args: { where?: TWhere }): Promise<{ count: number }>;
  updateMany(args: { where?: TWhere; data: Partial<TCreate> }): Promise<{ count: number }>;
  count(args: { where?: TWhere }): Promise<number>;
  groupBy(args: any): Promise<any[]>;
}

type PrismaClient = {
  [key: string]: any;
  $transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
};

// ── Select 정의 ──

const listSelect = {
  id: true,
  slug: true,
  category: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  attachments: true,
  featured: true,
  published: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
};

/** 태그 관계를 포함한 select (tags 모델 존재 시 사용) */
const tagInclude = {
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
};

const detailSelect = {
  ...listSelect,
  content: true,
  coverImageKey: true,
  attachments: true,
  authorId: true,
};

const navSelect = {
  slug: true,
  title: true,
};

// ── 헬퍼 ──

/** 목록 조회 결과를 BlogListItem으로 변환 */
function toListItem(row: Record<string, unknown>): BlogListItem {
  const attachments = row.attachments;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const tags = flattenTags(row);
  const { attachments: _a, tags: _t, ...rest } = row as any;
  void _a;
  void _t;
  return {
    ...rest,
    hasAttachments,
    ...(tags !== undefined ? { tags } : {}),
  } as BlogListItem;
}

/** PostTag[] 형태의 row.tags를 Tag[]로 평탄화 */
function flattenTags(row: Record<string, unknown>): Tag[] | undefined {
  const rawTags = row.tags;
  if (!Array.isArray(rawTags)) return undefined;
  // PostTag 관계 형태: [{ tag: {...} }, ...]
  if (rawTags.length === 0) return [];
  if (typeof rawTags[0] === 'object' && rawTags[0] !== null && 'tag' in (rawTags[0] as object)) {
    return (rawTags as Array<{ tag: Tag }>).map((pt) => pt.tag).filter(Boolean) as Tag[];
  }
  // 이미 Tag[] 형태
  return rawTags as Tag[];
}

/** 상세 조회 결과를 BlogDetail로 변환 */
function toDetail(row: Record<string, unknown>): BlogDetail {
  const tags = flattenTags(row);
  const { tags: _t, ...rest } = row as any;
  void _t;
  return {
    ...rest,
    attachments: ((rest as any).attachments as Attachment[] | null) || [],
    ...(tags !== undefined ? { tags } : {}),
  } as BlogDetail;
}

/** 중복되지 않는 고유 slug를 생성 */
async function uniqueSlug(delegate: PrismaDelegate, base: string): Promise<string> {
  const exact = await delegate.findFirst({
    where: { slug: base },
    select: { id: true },
  });

  if (!exact) return base;

  const existing = await delegate.findMany({
    where: { slug: { startsWith: `${base}-` } },
    select: { slug: true },
  });

  const slugs = new Set(existing.map((e: any) => e.slug));
  let suffix = 2;
  while (slugs.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

// ── 서비스 인터페이스 ──

/** 블로그 서비스 공개 API */
export interface BlogService {
  // Public 메서드
  listPublished(options: {
    page: number;
    limit: number;
    category?: string;
    search?: string;
    /** 단일 태그 slug로 필터 */
    tagSlug?: string;
    /** 여러 태그 slug 중 하나라도 포함 (OR 조건) */
    tagSlugs?: string[];
  }): Promise<PaginatedResult<BlogListItem>>;

  getPublishedBySlug(slug: string): Promise<BlogDetail | null>;

  getFeatured(limit?: number): Promise<BlogListItem[]>;

  getAdjacentPosts(currentId: string): Promise<{ prev: BlogNav | null; next: BlogNav | null }>;

  checkSlugAvailable(slug: string, excludeId?: string): Promise<boolean>;

  // Admin 메서드
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

/**
 * 블로그 서비스 인스턴스를 생성한다.
 *
 * @param prisma - Prisma 클라이언트 인스턴스 (호스트 프로젝트에서 주입)
 * @param config - 서비스 설정
 * @returns BlogService 인터페이스를 구현하는 서비스 객체
 */
export function createBlogService(prisma: PrismaClient, config: BlogServiceConfig): BlogService {
  // Prisma delegate 가져오기 (modelName 기반)
  const delegate: PrismaDelegate = prisma[config.modelName];
  if (!delegate) {
    throw new Error(`Prisma model "${config.modelName}" not found. Check BlogServiceConfig.modelName.`);
  }

  // HTML 새니타이즈 함수 (config 주입 또는 내장 함수 사용)
  const sanitize = config.sanitizeContent ?? sanitizeHtmlContent;

  // R2 헬퍼 (optional)
  const r2 = config.r2Helpers;
  const isR2Active = () => config.enableR2Cleanup && r2?.isEnabled() === true;

  // 태그 관계 활성화 시에만 tagInclude 주입
  const tagsEnabled = config.enableTags === true;
  const detailSelectWithTags = tagsEnabled ? { ...detailSelect, ...tagInclude } : detailSelect;

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
        // 태그 필터 — tagSlug 우선, 없으면 tagSlugs 적용 (tags 활성화 시에만)
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
        select: detailSelectWithTags,
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

      // 조회수 콜백이 있으면 조회수 주입
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
        select: detailSelectWithTags,
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

      // tagIds가 있는 경우 트랜잭션으로 포스트 생성 + 태그 관계 생성을 원자적으로 수행
      const shouldSyncTags =
        tagIds && tagIds.length > 0 && !!prisma.postTag?.createMany;

      if (shouldSyncTags) {
        const post = await prisma.$transaction(async (tx: any) => {
          const created = await tx[config.modelName].create({
            data: postCreateData,
            select: detailSelect,
          });
          await tx.postTag.createMany({
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

      // 태그 동기화가 가능한지 여부 (tagIds가 명시되었고 postTag 델리게이트가 있음)
      const hasTagSync =
        tagIds !== undefined &&
        !!prisma.postTag?.deleteMany &&
        !!prisma.postTag?.createMany;

      // 태그 관계 재설정 함수 — tx(트랜잭션) 컨텍스트에서 실행
      const syncTagsInTx = async (tx: any) => {
        if (!hasTagSync) return;
        await tx.postTag.deleteMany({ where: { postId: id } });
        if ((tagIds as string[]).length > 0) {
          await tx.postTag.createMany({
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

      // 단일 트랜잭션으로 처리: 포스트 업데이트 + 태그 동기화 (부분 실패 시 롤백)
      const post = await prisma.$transaction(async (tx: any) => {
        if (data.publishedAt !== undefined) {
          // 명시적으로 전달된 발행일시 사용
          updateData.publishedAt = data.publishedAt
            ? new Date(data.publishedAt as string)
            : null;
        } else if (data.published === true) {
          // 처음 공개 시 자동 설정: 기존 published=false인 경우만
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

      await delegate.delete({ where: { id } });

      // R2 정리 (optional)
      if (!post || !isR2Active() || !r2) return;

      const keys = r2.collectKeys(post.coverImageKey, post.content);
      const attachments = (post.attachments as Attachment[] | null) || [];
      attachments.forEach((a) => { if (a.key) keys.push(a.key); });
      await r2.deleteKeys(keys);
    },

    async removeMany(ids) {
      // 1. R2 정리를 위한 키 수집 (삭제 전)
      const items = isR2Active() && r2
        ? await delegate.findMany({
            where: { id: { in: ids } },
            select: { coverImageKey: true, content: true, attachments: true },
          })
        : [];

      // 2. 일괄 삭제
      const { count } = await delegate.deleteMany({
        where: { id: { in: ids } },
      });

      // 3. R2 정리 (best-effort)
      if (items.length > 0 && r2) {
        const allKeys = items.flatMap((item: any) => {
          const keys = r2.collectKeys(item.coverImageKey, item.content);
          const attachments = (item.attachments as Attachment[] | null) || [];
          attachments.forEach((a) => { if (a.key) keys.push(a.key); });
          return keys;
        });
        await r2.deleteKeys([...new Set(allKeys)]);
      }

      return count;
    },

    async togglePublish(id) {
      const current = await delegate.findUnique({
        where: { id },
        select: { published: true },
      });

      if (!current) throw new Error('Blog post not found');

      const newPublished = !current.published;
      const post = await delegate.update({
        where: { id },
        data: {
          published: newPublished,
          publishedAt: newPublished ? new Date() : null,
        },
        select: { published: true, publishedAt: true },
      });

      return post;
    },

    async bulkUpdatePublished(ids, published) {
      const result = await delegate.updateMany({
        where: { id: { in: ids } },
        data: { published, updatedAt: new Date() },
      });
      return result.count;
    },

    async bulkUpdateFeatured(ids, featured) {
      const result = await delegate.updateMany({
        where: { id: { in: ids } },
        data: { featured, updatedAt: new Date() },
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
