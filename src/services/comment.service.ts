/**
 * 댓글 서비스 팩토리
 *
 * Prisma 클라이언트를 외부에서 주입받아 독립적으로 동작한다.
 */
import type {
  Comment,
  CommentStatus,
  CreateCommentInput,
} from '../types/comment';
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
  updateMany(args: { where?: TWhere; data: Partial<TCreate> }): Promise<{ count: number }>;
  delete(args: { where: TWhere }): Promise<TRow>;
  deleteMany(args: { where?: TWhere }): Promise<{ count: number }>;
  count(args: { where?: TWhere }): Promise<number>;
}

// ── 서비스 설정 ──

/** 댓글 서비스 설정 */
export interface CommentServiceConfig {
  /** Prisma delegate 접근에 사용할 댓글 모델명 (default: 'comment') */
  commentModelName?: string;
  /** true면 생성 즉시 APPROVED 상태로 저장 (default: false — 관리자 승인 필요) */
  autoApprove?: boolean;
  /** true면 로그인 사용자만 댓글 작성 허용 (default: false — 게스트 허용) */
  requireLogin?: boolean;
  /** 대댓글 중첩 최대 깊이 — 루트는 1 (default: 3) */
  maxDepth?: number;
  /** 레이트 리밋 설정 */
  rateLimit?: {
    /** 동일 IP 기준 1시간당 최대 작성 개수 (default: 10) */
    maxPerHour?: number;
  };
  /** 사용자 정의 스팸 필터 — true 반환 시 SPAM 상태로 저장 */
  spamFilter?: (content: string) => boolean;
}

// ── 서비스 인터페이스 ──

/** 댓글 서비스 공개 API */
export interface CommentService {
  // ── Public (방문자용) ──

  /** 댓글 생성 — honeypot, rate limit, depth, spam filter 검증 수행 */
  create(
    data: CreateCommentInput,
    context: { userId?: string; ipHash?: string },
  ): Promise<Comment>;

  /** 포스트의 승인된 댓글 목록을 트리 구조로 반환 */
  listByPost(
    postId: string,
    options?: { includeReplies?: boolean },
  ): Promise<Comment[]>;

  // ── Admin ──

  /** 관리자 댓글 전체 목록 — 상태/포스트별 필터, 페이지네이션 */
  listAll(options?: {
    page?: number;
    limit?: number;
    status?: CommentStatus;
    postId?: string;
  }): Promise<PaginatedResult<Comment>>;

  /** 댓글 상태를 변경한다 */
  updateStatus(id: string, status: CommentStatus): Promise<Comment>;

  /** 여러 댓글의 상태를 일괄 변경한다 — 변경된 레코드 수 반환 */
  bulkUpdateStatus(ids: string[], status: CommentStatus): Promise<number>;

  /** 댓글 삭제 */
  remove(id: string): Promise<void>;

  /** 여러 댓글 일괄 삭제 — 삭제된 레코드 수 반환 */
  removeMany(ids: string[]): Promise<number>;

  /** PENDING 상태 댓글 개수 반환 */
  getPendingCount(): Promise<number>;
}

// ── 헬퍼 ──

/** DB row → Comment 변환 */
function toComment(row: Record<string, unknown>): Comment {
  return row as unknown as Comment;
}

/**
 * 루트 댓글 + 대댓글 평면 배열을 트리 구조로 변환한다.
 * 루트 순서는 createdAt ASC, 대댓글 순서도 createdAt ASC로 가정한다.
 */
function buildCommentTree(rows: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  // 1회전: id → Comment 매핑, replies 초기화
  for (const row of rows) {
    const cloned: Comment = { ...row, replies: [] };
    map.set(cloned.id, cloned);
  }

  // 2회전: 부모에 연결
  for (const row of rows) {
    const node = map.get(row.id)!;
    if (row.parentId && map.has(row.parentId)) {
      const parent = map.get(row.parentId)!;
      (parent.replies as Comment[]).push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ── 팩토리 함수 ──

/**
 * 댓글 서비스 인스턴스를 생성한다.
 *
 * @param prisma - Prisma 클라이언트 인스턴스
 * @param config - 서비스 설정
 */
export function createCommentService(
  prisma: PrismaClientLike,
  config: CommentServiceConfig = {},
): CommentService {
  const modelName = config.commentModelName ?? 'comment';
  const autoApprove = config.autoApprove ?? false;
  const requireLogin = config.requireLogin ?? false;
  const maxDepth = config.maxDepth ?? 3;
  const maxPerHour = config.rateLimit?.maxPerHour ?? 10;
  const spamFilter = config.spamFilter;

  const delegate: PrismaDelegate = prisma[modelName];
  if (!delegate) {
    throw new Error(
      `Prisma model "${modelName}" not found. Check CommentServiceConfig.commentModelName.`,
    );
  }

  /**
   * 생성된 댓글의 "시간당 순번"을 계산해 제한을 넘었으면 되돌린다.
   *
   * ── 왜 사전 count()만으로는 부족한가 ──
   * 기존 구현은 `count()` → `create()` 순서였고 두 질의 사이에 원자성이 없다.
   * 동시 요청 N건이 모두 create 이전에 count를 끝내면 전원이 제한을 통과한다
   * (실측: 제한 5건에 동시 6건 요청 → 6건 생성).
   *
   * ── 왜 $transaction 으로 감싸지 않는가 ──
   * `$transaction`(인터랙티브)으로 count+create 를 묶어도 경쟁 조건은 사라지지
   * 않는다. PostgreSQL 기본 격리 수준(Read Committed)에서 각 트랜잭션은 아직
   * 커밋되지 않은 다른 트랜잭션의 INSERT 를 볼 수 없으므로, 동시 트랜잭션들은
   * 서로를 세지 못한 채 모두 커밋된다. 같은 이유로 순번 계산은 **자신의 INSERT
   * 가 커밋된 뒤**(= delegate.create() 반환 후, 트랜잭션 밖)에 수행해야 다른
   * 요청이 넣은 행이 보인다.
   *
   * ── 선택한 방식 ──
   * 낙관적 삽입 + 사후 순번 검증 + 보상 삭제.
   * 1) 자신의 행이 커밋된 뒤, 같은 ipHash·같은 1시간 창에서 (createdAt, id)
   *    오름차순 기준으로 자기보다 앞서거나 같은 행의 수 = 자신의 순번을 센다.
   * 2) 순번이 maxPerHour 를 넘으면 자기 행만 삭제하고 429 를 던진다.
   * (createdAt, id) 는 모든 요청이 동일하게 계산하는 결정적 전순서이므로,
   * 동일 createdAt(밀리초 충돌) 이 발생해도 순번이 겹치지 않는다. 따라서 동시
   * 요청에서도 정확히 앞선 maxPerHour 건만 살아남는다.
   *
   * ── 한계 ──
   * - 커밋 순서와 createdAt 순서가 뒤집히는 극단적 경우(자신의 순번을 세는
   *   시점에 자기보다 createdAt 이 이른 행이 아직 커밋되지 않은 경우)에는 두
   *   요청이 같은 순번을 얻어 제한을 1건 초과할 수 있다. 완전한 차단이
   *   필요하면 Serializable 격리 + 재시도나 DB 측 원자적 INSERT ... WHERE
   *   (SELECT count(*)) < n 이 필요하며, 이는 델리게이트 추상화를 깨뜨린다.
   * - 초과 요청은 INSERT 후 DELETE 되므로 쓰기 증폭이 있다. 사전 count() 빠른
   *   경로를 그대로 남겨 지속적 남용은 삽입 없이 차단한다.
   * - 보상 삭제가 실패하면 행이 남은 채 429 가 반환된다(미승인 상태라 노출되지
   *   않음). 삭제 실패는 경고만 남기고 삼킨다.
   */
  async function enforceRateLimitRank(
    created: Record<string, unknown>,
    ipHash: string,
    windowStart: Date,
  ): Promise<void> {
    const rawCreatedAt = created.createdAt;
    const createdAt =
      rawCreatedAt instanceof Date
        ? rawCreatedAt
        : typeof rawCreatedAt === 'string'
          ? new Date(rawCreatedAt)
          : null;
    const id = created.id;
    // 순번 계산 근거를 얻지 못하면(커스텀 스키마/셀렉트) 사전 검사 결과만 신뢰한다.
    if (!createdAt || Number.isNaN(createdAt.getTime()) || typeof id !== 'string') {
      return;
    }

    const rank = await delegate.count({
      where: {
        ipHash,
        createdAt: { gte: windowStart, lte: createdAt },
        // (createdAt, id) 오름차순에서 "자신 이하"인 행만 센다 → 순번이 유일해진다.
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lte: id } },
        ],
      },
    });

    if (rank <= maxPerHour) return;

    try {
      await delegate.delete({ where: { id } });
    } catch (err) {
      console.warn(
        '[blog-core] rate limit 초과 댓글 보상 삭제 실패 — 행이 남을 수 있습니다',
        err,
      );
    }

    throw new BlogError(
      BLOG_ERROR_CODES.COMMENT_RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded: max ${maxPerHour} per hour`,
      429,
    );
  }

  /** 부모 체인을 따라 depth를 계산한다. 루트 댓글은 depth=1. */
  async function computeDepth(parentId: string): Promise<number> {
    let depth = 1;
    let currentParentId: string | null = parentId;
    for (let i = 0; i < maxDepth + 2; i++) {
      if (!currentParentId) break;
      const parent: any = await delegate.findUnique({
        where: { id: currentParentId },
        select: { id: true, parentId: true },
      });
      if (!parent) {
        throw new BlogError(
          BLOG_ERROR_CODES.COMMENT_PARENT_NOT_FOUND,
          'Parent comment not found',
          404,
        );
      }
      depth += 1;
      currentParentId = parent.parentId ?? null;
    }
    return depth;
  }

  return {
    // ── Public ──

    async create(data, context) {
      // 1. 로그인 필수 여부 확인
      if (requireLogin && !context.userId) {
        throw new BlogError(
          BLOG_ERROR_CODES.COMMENT_LOGIN_REQUIRED,
          'Login required to post comment',
          403,
        );
      }

      // 2. 허니팟 — 봇이면 SPAM으로 저장 (에러는 내지 않고 조용히 처리)
      const isHoneypotTriggered = Boolean(
        data.honeypot && data.honeypot.length > 0,
      );

      // 3. 레이트 리밋 사전 검사 (ipHash가 있을 때만) — 빠른 거부 경로.
      //    이 검사만으로는 동시 요청을 막지 못한다(아래 8번 사후 순번 검증 참고).
      //    이미 제한을 채운 클라이언트를 삽입 없이 차단하는 용도로 유지한다.
      const rateLimitWindowStart =
        context.ipHash && !isHoneypotTriggered
          ? new Date(Date.now() - 60 * 60 * 1000)
          : null;
      if (rateLimitWindowStart) {
        const recent = await delegate.count({
          where: {
            ipHash: context.ipHash,
            createdAt: { gte: rateLimitWindowStart },
          },
        });
        if (recent >= maxPerHour) {
          throw new BlogError(
            BLOG_ERROR_CODES.COMMENT_RATE_LIMIT_EXCEEDED,
            `Rate limit exceeded: max ${maxPerHour} per hour`,
            429,
          );
        }
      }

      // 4. 깊이 검증
      if (data.parentId) {
        const newDepth = await computeDepth(data.parentId);
        if (newDepth > maxDepth) {
          throw new BlogError(
            BLOG_ERROR_CODES.COMMENT_MAX_DEPTH_EXCEEDED,
            `Max nesting depth exceeded (${maxDepth})`,
            400,
          );
        }
      }

      // 5. 스팸 필터
      const isSpamByFilter = spamFilter ? spamFilter(data.content) : false;

      // 6. 최종 상태 결정
      let status: CommentStatus;
      if (isHoneypotTriggered || isSpamByFilter) {
        status = 'SPAM';
      } else if (autoApprove) {
        status = 'APPROVED';
      } else {
        status = 'PENDING';
      }

      // 7. 저장
      const created = await delegate.create({
        data: {
          postId: data.postId,
          parentId: data.parentId ?? null,
          authorId: context.userId ?? null,
          guestName: context.userId ? null : data.guestName ?? null,
          guestEmail: context.userId ? null : data.guestEmail ?? null,
          content: data.content,
          status,
          ipHash: context.ipHash ?? null,
        },
      });

      // 8. 사후 순번 검증 — 커밋된 자신의 행을 기준으로 시간당 순번을 계산해
      //    제한 초과분을 되돌린다. 동시 요청에서 제한을 지키는 실제 장치다.
      if (rateLimitWindowStart && context.ipHash) {
        await enforceRateLimitRank(
          created as Record<string, unknown>,
          context.ipHash,
          rateLimitWindowStart,
        );
      }

      return toComment(created as Record<string, unknown>);
    },

    async listByPost(postId, options = {}) {
      const includeReplies = options.includeReplies ?? true;

      const rows = await delegate.findMany({
        where: {
          postId,
          status: 'APPROVED',
        },
        orderBy: { createdAt: 'asc' },
      });

      const comments = (rows as any[]).map((r) =>
        toComment(r as Record<string, unknown>),
      );

      if (!includeReplies) {
        return comments
          .filter((c) => !c.parentId)
          .map((c) => ({ ...c, replies: [] }));
      }

      return buildCommentTree(comments);
    },

    // ── Admin ──

    async listAll(options = {}) {
      const page = Number.isFinite(options.page)
        ? Math.max(1, options.page as number)
        : 1;
      const limit = Number.isFinite(options.limit)
        ? Math.max(1, options.limit as number)
        : 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (options.status) where.status = options.status;
      if (options.postId) where.postId = options.postId;

      const [rows, total] = await Promise.all([
        delegate.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        delegate.count({ where }),
      ]);

      const items = (rows as any[]).map((r) =>
        toComment(r as Record<string, unknown>),
      );
      return buildPaginatedResult(items, total, page, limit);
    },

    async updateStatus(id, status) {
      const existing = await delegate.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) {
        throw new BlogError(BLOG_ERROR_CODES.COMMENT_NOT_FOUND, `Comment ${id} not found`, 404);
      }
      const updated = await delegate.update({
        where: { id },
        data: { status },
      });
      return toComment(updated as Record<string, unknown>);
    },

    async bulkUpdateStatus(ids, status) {
      if (ids.length === 0) return 0;
      const result: any = await delegate.updateMany({
        where: { id: { in: ids } },
        data: { status },
      });
      return (result?.count as number) ?? 0;
    },

    async remove(id) {
      const existing = await delegate.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) {
        throw new BlogError(BLOG_ERROR_CODES.COMMENT_NOT_FOUND, `Comment ${id} not found`, 404);
      }
      await delegate.delete({ where: { id } });
    },

    async removeMany(ids) {
      if (ids.length === 0) return 0;
      const result: any = await delegate.deleteMany({
        where: { id: { in: ids } },
      });
      return (result?.count as number) ?? 0;
    },

    async getPendingCount() {
      return delegate.count({ where: { status: 'PENDING' } });
    },
  };
}
