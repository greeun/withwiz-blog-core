/**
 * blog.service 내부 헬퍼 (Prisma 덕타이핑, select 정의, 행→DTO 매퍼)
 *
 * createBlogService에서 분리된 순수/파라미터화 유틸이다. 동작은 불변이며
 * blog.service.ts의 가독성을 위해 별도 모듈로 이동했다. (내부 전용)
 */
import type { BlogListItem, BlogDetail, Attachment } from '../types/blog';
import type { Tag } from '../types/tag';

// ── Prisma 타입 (덕 타이핑) ──

export interface PrismaDelegate<TCreate = any, TWhere = any, TRow = any> {
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

// ── Select 정의 ──

export const listSelect = {
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
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

export const tagInclude = {
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

export const detailSelect = {
  ...listSelect,
  content: true,
  editorType: true,
  coverImageKey: true,
  attachments: true,
  authorId: true,
};

export const navSelect = {
  slug: true,
  title: true,
};

// ── 헬퍼 ──

export function toListItem(row: Record<string, unknown>): BlogListItem {
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

export function flattenTags(row: Record<string, unknown>): Tag[] | undefined {
  const rawTags = row.tags;
  if (!Array.isArray(rawTags)) return undefined;
  if (rawTags.length === 0) return [];
  if (typeof rawTags[0] === 'object' && rawTags[0] !== null && 'tag' in (rawTags[0] as object)) {
    return (rawTags as Array<{ tag: Tag }>).map((pt) => pt.tag).filter(Boolean) as Tag[];
  }
  return rawTags as Tag[];
}

export function toDetail(row: Record<string, unknown>): BlogDetail {
  const tags = flattenTags(row);
  const { tags: _t, ...rest } = row as any;
  void _t;
  return {
    ...rest,
    attachments: ((rest as any).attachments as Attachment[] | null) || [],
    hasAttachments: Array.isArray((rest as any).attachments) && ((rest as any).attachments as Attachment[]).length > 0,
    ...(tags !== undefined ? { tags } : {}),
  } as BlogDetail;
}

export async function uniqueSlug(delegate: PrismaDelegate, base: string): Promise<string> {
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
