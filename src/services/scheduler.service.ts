/**
 * 블로그 예약 발행(Scheduled publishing) 서비스 팩토리
 *
 * publishedAt이 미래 시각으로 설정되고 published=false인 글을,
 * 현재 시각이 publishedAt을 지났을 때 자동으로 published=true로 전환한다.
 *
 * 호출은 Vercel Cron 등 외부 스케줄러에서 주기적으로 트리거한다.
 */
import type { BlogListItem } from '../types/blog';

// ── Prisma 타입 ──

/** Prisma delegate 최소 인터페이스 (스케줄러는 findMany/update/updateMany만 사용) */
interface PrismaDelegate<TCreate = any, TWhere = any, TRow = any> {
  findMany(args: {
    where?: TWhere;
    select?: any;
    orderBy?: any;
    take?: number;
  }): Promise<TRow[]>;
  update(args: { where: TWhere; data: Partial<TCreate>; select?: any }): Promise<TRow>;
  updateMany(args: { where?: TWhere; data: Partial<TCreate> }): Promise<{ count: number }>;
}

type PrismaClient = {
  [key: string]: any;
};

// ── 설정/반환 타입 ──

export interface SchedulerServiceConfig {
  /** Prisma delegate 모델명 (default: 'blogPost') */
  modelName?: string;
}

export interface ProcessScheduledResult {
  /** 발행 전환된 글 개수 */
  processed: number;
  /** 발행 전환된 글 ID 목록 */
  postIds: string[];
}

export interface SchedulerService {
  /** 예약 시간이 지난 비공개 글을 공개로 전환 */
  processScheduledPosts(): Promise<ProcessScheduledResult>;
  /** 아직 발행되지 않은 예약 글 목록 조회 */
  listScheduled(options?: { limit?: number }): Promise<BlogListItem[]>;
  /** 특정 글의 예약 취소 (publishedAt → null) */
  cancelSchedule(postId: string): Promise<void>;
}

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

function toListItem(row: Record<string, unknown>): BlogListItem {
  const attachments = row.attachments;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const { attachments: _a, ...rest } = row as any;
  void _a;
  return { ...rest, hasAttachments } as BlogListItem;
}

// ── 팩토리 ──

/**
 * 스케줄러 서비스 인스턴스를 생성한다.
 */
export function createSchedulerService(
  prisma: PrismaClient,
  config: SchedulerServiceConfig = {},
): SchedulerService {
  const modelName = config.modelName ?? 'blogPost';
  const delegate: PrismaDelegate = prisma[modelName];
  if (!delegate) {
    throw new Error(
      `Prisma model "${modelName}" not found. Check SchedulerServiceConfig.modelName.`,
    );
  }

  return {
    async processScheduledPosts(): Promise<ProcessScheduledResult> {
      const now = new Date();

      // 1. 전환 대상 조회 (ID 수집)
      const candidates = await delegate.findMany({
        where: {
          published: false,
          publishedAt: {
            not: null,
            lte: now,
          },
        },
        select: { id: true },
      });

      const postIds = candidates.map((c: any) => c.id as string);
      if (postIds.length === 0) {
        return { processed: 0, postIds: [] };
      }

      // 2. 일괄 발행 전환
      const result = await delegate.updateMany({
        where: { id: { in: postIds } },
        data: { published: true },
      });

      return { processed: result.count ?? postIds.length, postIds };
    },

    async listScheduled(options = {}): Promise<BlogListItem[]> {
      const limit = options.limit && options.limit > 0 ? options.limit : 50;
      const items = await delegate.findMany({
        where: {
          published: false,
          publishedAt: {
            not: null,
            gt: new Date(),
          },
        },
        select: listSelect,
        orderBy: { publishedAt: 'asc' },
        take: limit,
      });
      return items.map((i: any) => toListItem(i));
    },

    async cancelSchedule(postId: string): Promise<void> {
      await delegate.update({
        where: { id: postId },
        data: { publishedAt: null },
      });
    },
  };
}
