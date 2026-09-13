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
 *
 * @param prisma - Prisma 클라이언트 인스턴스
 * @param config - 스케줄러 서비스 설정
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

      // 2. 건별 조건부 전환(compare-and-set)
      //
      // ── 왜 일괄 updateMany 를 쓰지 않는가 ──
      // 기존 구현은 `updateMany({ where: { id: { in: postIds } } })` 였다.
      // where 에 `published: false` 가 없어 이미 다른 호출이 전환한 글까지 다시
      // 갱신했고, `updateMany` 는 변경된 행의 id 를 돌려주지 않으므로 조회 시점의
      // postIds 를 그대로 반환했다. 결과적으로 크론이 동시에 3회 트리거되면 세
      // 응답 모두 같은 postIds 를 받아, DB 최종 상태는 멱등해도 후처리(알림 발송,
      // 캐시 무효화)가 3번 중복 실행됐다.
      //
      // ── 선택한 방식 ──
      // id 단건 + `published: false` 조건으로 updateMany 를 호출한다. 단일 UPDATE
      // 문이므로 DB 행 잠금으로 원자적이고, 동시 호출 중 먼저 잠금을 얻은 쪽만
      // count=1 을 받는다. 나중 호출은 잠금 해제 후 조건을 재평가해 count=0 을
      // 받는다. 따라서 실제로 전환에 성공한 호출만 해당 id 를 반환한다.
      // `publishedAt` 조건도 함께 검사해, 조회와 갱신 사이에 예약이 미래로
      // 변경되거나 취소(null)된 글은 전환하지 않는다.
      //
      // ── 한계 ──
      // - 건당 UPDATE 1회라 조회 건수에 비례해 왕복이 늘어난다. 예약 발행은 보통
      //   소량이므로 순차 처리로 충분하며, 커넥션 풀 부담을 피하려 병렬화하지 않는다.
      // - 전체가 하나의 트랜잭션은 아니므로 중간 실패 시 일부만 전환된 상태로
      //   남는다. 다음 크론 실행이 나머지를 이어서 처리한다(재시도 안전).
      const transitioned: string[] = [];
      for (const id of postIds) {
        const result = await delegate.updateMany({
          where: {
            id,
            published: false,
            publishedAt: { not: null, lte: now },
          },
          data: { published: true },
        });
        if ((result?.count ?? 0) > 0) transitioned.push(id);
      }

      return { processed: transitioned.length, postIds: transitioned };
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
