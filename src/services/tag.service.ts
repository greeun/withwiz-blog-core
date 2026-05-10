/**
 * 태그 서비스 팩토리
 *
 * Prisma 클라이언트를 외부에서 주입받아 독립적으로 동작한다.
 */
import type { Tag, TagWithCount, CreateTagInput, UpdateTagInput } from '../types/tag';
import type { BlogListItem, Attachment } from '../types/blog';
import type { PaginatedResult } from '../types/common';
import type { PrismaClientLike } from '../types/config';
import { buildPaginatedResult } from '../utils/pagination';
import { BlogError, BLOG_ERROR_CODES } from '../errors';

// ── Prisma 타입 (덕 타이핑) ──

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
  findUnique(args: { where: TWhere; select?: any; include?: any }): Promise<TRow | null>;
  create(args: { data: TCreate; select?: any; include?: any }): Promise<TRow>;
  update(args: {
    where: TWhere;
    data: Partial<TCreate>;
    select?: any;
    include?: any;
  }): Promise<TRow>;
  delete(args: { where: TWhere }): Promise<TRow>;
  deleteMany(args: { where?: TWhere }): Promise<{ count: number }>;
  createMany(args: { data: TCreate[]; skipDuplicates?: boolean }): Promise<{ count: number }>;
  count(args: { where?: TWhere }): Promise<number>;
}

// ── Select 정의 ──

const postListSelect = {
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

// ── 서비스 설정 ──

/** 태그 서비스 설정 */
export interface TagServiceConfig {
  /** Prisma delegate 접근에 사용할 태그 모델명 (default: 'tag') */
  tagModelName?: string;
  /** 호스트의 블로그 포스트 모델명 (필수) */
  postModelName: string;
  /** PostTag 중계 모델명 (default: 'postTag') */
  postTagModelName?: string;
}

// ── 헬퍼 ──

/** 포스트 row를 BlogListItem으로 변환 */
function toPostListItem(row: Record<string, unknown>): BlogListItem {
  const attachments = row.attachments;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const { attachments: _dropped, ...rest } = row;
  void _dropped;
  return { ...rest, hasAttachments } as BlogListItem;
}

/** Prisma row에서 _count.posts를 빼내서 TagWithCount로 변환 */
function toTagWithCount(row: Record<string, unknown>): TagWithCount {
  const count = row._count as { posts?: number } | undefined;
  const { _count, ...rest } = row as any;
  void _count;
  return {
    ...(rest as Tag),
    postCount: count?.posts ?? 0,
  };
}

// ── 서비스 인터페이스 ──

/** 태그 서비스 공개 API */
export interface TagService {
  // CRUD
  create(data: CreateTagInput): Promise<Tag>;
  getById(id: string): Promise<Tag | null>;
  getBySlug(slug: string): Promise<Tag | null>;
  update(id: string, data: UpdateTagInput): Promise<Tag>;
  remove(id: string): Promise<void>;

  // 목록
  listAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResult<TagWithCount>>;

  /** 태그 클라우드 — 사용 포스트 수가 많은 순으로 반환 */
  getTagCloud(limit?: number): Promise<TagWithCount[]>;

  // 포스트-태그 관계
  /** 특정 태그가 달린 공개 포스트 목록 */
  getPostsByTag(
    tagSlug: string,
    options?: { page?: number; limit?: number },
  ): Promise<PaginatedResult<BlogListItem>>;

  /** 특정 포스트에 달린 태그 목록 */
  getTagsByPost(postId: string): Promise<Tag[]>;

  /** 관련 글 — 같은 태그를 공유하는 다른 공개 포스트 */
  getRelatedPosts(postId: string, limit?: number): Promise<BlogListItem[]>;
}

// ── 팩토리 함수 ──

/**
 * 태그 서비스 인스턴스를 생성한다.
 *
 * @param prisma - Prisma 클라이언트 인스턴스 (호스트 프로젝트에서 주입)
 * @param config - 서비스 설정 (postModelName 필수)
 * @returns TagService 인터페이스를 구현하는 서비스 객체
 */
export function createTagService(prisma: PrismaClientLike, config: TagServiceConfig): TagService {
  const tagModelName = config.tagModelName ?? 'tag';
  const postTagModelName = config.postTagModelName ?? 'postTag';
  const postModelName = config.postModelName;

  if (!postModelName) {
    throw new Error('TagServiceConfig.postModelName is required.');
  }

  const tagDelegate: PrismaDelegate = prisma[tagModelName];
  if (!tagDelegate) {
    throw new Error(`Prisma model "${tagModelName}" not found. Check TagServiceConfig.tagModelName.`);
  }

  const postDelegate: PrismaDelegate = prisma[postModelName];
  if (!postDelegate) {
    throw new Error(`Prisma model "${postModelName}" not found. Check TagServiceConfig.postModelName.`);
  }

  const postTagDelegate: PrismaDelegate = prisma[postTagModelName];
  if (!postTagDelegate) {
    throw new Error(
      `Prisma model "${postTagModelName}" not found. Check TagServiceConfig.postTagModelName.`,
    );
  }

  return {
    // ── CRUD ──

    async create(data) {
      // slug 중복 확인
      const existing = await tagDelegate.findFirst({
        where: { slug: data.slug },
        select: { id: true },
      });
      if (existing) {
        throw new BlogError(
          BLOG_ERROR_CODES.TAG_DUPLICATE_SLUG,
          `Tag slug "${data.slug}" already exists`,
          409,
        );
      }

      const created = await tagDelegate.create({ data });
      return created as Tag;
    },

    async getById(id) {
      const tag = await tagDelegate.findUnique({ where: { id } });
      return (tag as Tag) ?? null;
    },

    async getBySlug(slug) {
      const tag = await tagDelegate.findFirst({ where: { slug } });
      return (tag as Tag) ?? null;
    },

    async update(id, data) {
      // slug 변경 시 중복 확인
      if (data.slug) {
        const existing = await tagDelegate.findFirst({
          where: { slug: data.slug },
          select: { id: true },
        });
        if (existing && (existing as any).id !== id) {
          throw new BlogError(
            BLOG_ERROR_CODES.TAG_DUPLICATE_SLUG,
            `Tag slug "${data.slug}" already exists`,
            409,
          );
        }
      }

      const updated = await tagDelegate.update({ where: { id }, data });
      return updated as Tag;
    },

    async remove(id) {
      const existing = await tagDelegate.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) {
        throw new BlogError(BLOG_ERROR_CODES.TAG_NOT_FOUND, `Tag ${id} not found`, 404);
      }
      await tagDelegate.delete({ where: { id } });
    },

    // ── 목록 ──

    async listAll(options = {}) {
      const page = Number.isFinite(options.page) ? Math.max(1, options.page as number) : 1;
      const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit as number) : 20;
      const skip = (page - 1) * limit;

      const where: any = options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: 'insensitive' } },
              { slug: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {};

      const [rows, total] = await Promise.all([
        tagDelegate.findMany({
          where,
          include: { _count: { select: { posts: true } } },
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
        tagDelegate.count({ where }),
      ]);

      const items = rows.map((r: any) => toTagWithCount(r as Record<string, unknown>));
      return buildPaginatedResult(items, total, page, limit);
    },

    async getTagCloud(limit = 30) {
      const MAX_TAG_CLOUD_LIMIT = 500;
      const safeLimit = Math.min(
        Math.max(1, Number.isFinite(limit) ? limit : 30),
        MAX_TAG_CLOUD_LIMIT,
      );

      const rows = await tagDelegate.findMany({
        include: { _count: { select: { posts: true } } },
        take: safeLimit,
      });

      const items = rows
        .map((r: any) => toTagWithCount(r as Record<string, unknown>))
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, safeLimit);
      return items;
    },

    // ── 포스트-태그 관계 ──

    async getPostsByTag(tagSlug, options = {}) {
      const page = Number.isFinite(options.page) ? Math.max(1, options.page as number) : 1;
      const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit as number) : 12;
      const skip = (page - 1) * limit;

      const where: any = {
        published: true,
        tags: {
          some: {
            tag: { slug: tagSlug },
          },
        },
      };

      const [rows, total] = await Promise.all([
        postDelegate.findMany({
          where,
          select: postListSelect,
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit,
        }),
        postDelegate.count({ where }),
      ]);

      const items = rows.map((r: any) => toPostListItem(r as Record<string, unknown>));
      return buildPaginatedResult(items, total, page, limit);
    },

    async getTagsByPost(postId) {
      const relations = await postTagDelegate.findMany({
        where: { postId },
        include: { tag: true },
      });
      return relations
        .map((r: any) => r.tag as Tag)
        .filter((t): t is Tag => Boolean(t));
    },

    async getRelatedPosts(postId, limit = 5) {
      // 1. 현재 포스트의 태그 ID 목록
      const myTags = await postTagDelegate.findMany({
        where: { postId },
        select: { tagId: true },
      });
      const tagIds = myTags.map((t: any) => t.tagId as string);

      if (tagIds.length === 0) return [];

      // 2. 같은 태그를 공유하는 다른 포스트 조회
      const related = await postDelegate.findMany({
        where: {
          id: { not: postId },
          published: true,
          tags: {
            some: {
              tagId: { in: tagIds },
            },
          },
        },
        select: {
          ...postListSelect,
          tags: {
            select: { tagId: true },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: limit * 3,
      });

      // 공유 태그 수 계산 후 DESC 정렬
      const scored = related.map((row: any) => {
        const sharedCount = ((row.tags ?? []) as Array<{ tagId: string }>).filter((t) =>
          tagIds.includes(t.tagId),
        ).length;
        const { tags: _t, ...rest } = row;
        void _t;
        return { row: rest, shared: sharedCount };
      });
      scored.sort((a: any, b: any) => {
        if (b.shared !== a.shared) return b.shared - a.shared;
        return 0;
      });

      return scored
        .slice(0, limit)
        .map(({ row }: any) => toPostListItem(row as Record<string, unknown>));
    },
  };
}
