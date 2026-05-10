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

      // 3. 레이트 리밋 (ipHash가 있을 때만)
      if (context.ipHash && !isHoneypotTriggered) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recent = await delegate.count({
          where: {
            ipHash: context.ipHash,
            createdAt: { gte: oneHourAgo },
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
