/**
 * 댓글 API 라우트 핸들러 팩토리
 *
 * Next.js App Router 호환 라우트 핸들러를 구조화된 객체로 반환한다.
 */
import type { CommentService } from '../services/comment.service';
import type { CommentStatus, CreateCommentInput } from '../types/comment';
import type { AuthMiddleware, IpHeaderStrategy } from '../types/config';
import type { BlogI18nStrings } from '../i18n/types';
import { BLOG_ERROR_CODES } from '../errors';
import { hashIp } from '../utils/ip-hash';
import { createCommentSchemas } from '../validators/comment.validator';
import {
  successResponse,
  errorResponse,
  getSearchParam,
  parsePagination,
  getRouteParam,
  validateIds,
  validateWithSchema,
  makeRouteKit,
  type RouteHandler,
} from './_shared';

const { withAuth, withPublic } = makeRouteKit('[@withwiz/blog-core] Unhandled error:');

// ── IP 추출 ──

/**
 * 요청에서 클라이언트 IP를 추출한다.
 *
 * 프록시 헤더는 스푸핑 가능하므로 신뢰 범위를 주입된 전략으로 제한한다.
 * - 'auto' : cf-connecting-ip → x-real-ip → x-forwarded-for[0] (기본)
 * - 'none' : 어떤 헤더도 신뢰하지 않음 → null
 * - 그 외  : 해당 헤더명 하나만 신뢰
 */
function extractClientIp(
  request: Request,
  strategy: IpHeaderStrategy = 'auto',
): string | null {
  if (strategy === 'none') return null;

  const pick = (name: string): string | null => {
    const v = request.headers.get(name);
    if (!v) return null;
    const first = v.split(',')[0]?.trim();
    return first && first.length > 0 ? first : null;
  };

  if (strategy === 'auto') {
    return pick('cf-connecting-ip') ?? pick('x-real-ip') ?? pick('x-forwarded-for');
  }
  return pick(strategy);
}

// ── CommentStatus 검증 ──

const COMMENT_STATUS_VALUES: CommentStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'SPAM'];

function isCommentStatus(value: unknown): value is CommentStatus {
  return typeof value === 'string' && COMMENT_STATUS_VALUES.includes(value as CommentStatus);
}

// ── 라우트 타입 ──

export interface CommentPublicRoutes {
  list: { GET: RouteHandler };
  create: { POST: RouteHandler };
}

export interface CommentAdminRoutes {
  list: { GET: RouteHandler };
  detail: {
    PATCH: RouteHandler;
    DELETE: RouteHandler;
  };
  bulk: {
    PATCH: RouteHandler;
    DELETE: RouteHandler;
  };
  pendingCount: { GET: RouteHandler };
}

export interface CommentRoutesConfig {
  authMiddleware?: AuthMiddleware;
  /**
   * IP 해시에 사용할 HMAC 시크릿 (필수 주입).
   * 라이브러리는 환경 변수를 읽지 않으므로 호스트가 반드시 주입해야 한다.
   * 미주입 시 createCommentRoutes()가 즉시 throw 한다(fail-closed).
   */
  hmacSecret?: string;
  /** i18n 오버라이드 (validators 에러 메시지에 적용) */
  i18n?: Partial<BlogI18nStrings>;
  /** Zod 입력 유효성 검사 활성화 (default: true) */
  enableValidation?: boolean;
  /** 클라이언트 IP 추출 전략 (default: 'auto') */
  ipHeader?: IpHeaderStrategy;
}


// ── 팩토리 함수 ──

export function createCommentRoutes(
  commentService: CommentService,
  config?: CommentRoutesConfig,
): { public: CommentPublicRoutes; admin: CommentAdminRoutes } {
  const authMiddleware = config?.authMiddleware;
  // 시크릿은 무조건 주입이다. 라이브러리는 환경 변수를 읽지 않으며,
  // 하드코딩 폴백/기본값도 제공하지 않는다. 미주입 시 여기서 즉시
  // throw 하여 createBlog() 초기화 단계에서 fail-fast 한다.
  const hmacSecret = config?.hmacSecret;
  if (!hmacSecret || hmacSecret.length === 0) {
    throw new Error(
      '[@withwiz/blog-core] 댓글 기능에는 IP 해시 시크릿 주입이 필수입니다. ' +
        'createBlog({ features: { comments: { ... } }, commentHmacSecret: <32바이트+ 시크릿> })를 ' +
        '설정하세요. 이 라이브러리는 환경 변수를 직접 읽지 않습니다(무조건 주입).',
    );
  }
  const enableValidation = config?.enableValidation !== false;
  const ipHeader: IpHeaderStrategy = config?.ipHeader ?? 'auto';

  // Zod 스키마 생성 (i18n 에러 메시지 주입)
  const schemas = enableValidation
    ? createCommentSchemas({ i18n: config?.i18n })
    : undefined;

  return {
    public: {
      list: {
        GET: withPublic(async (req, context) => {
          const postId = await getRouteParam(context, 'postId');
          const includeRepliesParam = getSearchParam(req, 'includeReplies');
          const includeReplies = includeRepliesParam !== 'false';

          const comments = await commentService.listByPost(postId, { includeReplies });

          return successResponse(comments, 200, {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          });
        }),
      },

      create: {
        POST: withPublic(async (req, context) => {
          const postId = await getRouteParam(context, 'postId');
          const body = (await req.json()) as Record<string, unknown>;

          // Zod 스키마 검증 (활성화 시)
          const validationBody = { ...body, postId };
          if (schemas) {
            const check = validateWithSchema(schemas.CreateCommentSchema, validationBody);
            if (!check.valid) return check.response;
          } else {
            if (typeof body.content !== 'string' || !(body.content as string).trim()) {
              return errorResponse(BLOG_ERROR_CODES.VALIDATION_FAILED, 'content is required', 400);
            }
          }

          const { parentId, content, guestName, guestEmail, honeypot } = body;

          const input: CreateCommentInput = {
            postId,
            content: (content as string).trim(),
          };
          if (typeof parentId === 'string' && parentId.trim()) {
            input.parentId = parentId.trim();
          }
          if (typeof guestName === 'string') input.guestName = guestName;
          if (typeof guestEmail === 'string') input.guestEmail = guestEmail;
          if (typeof honeypot === 'string') input.honeypot = honeypot;

          const ip = extractClientIp(req, ipHeader);
          const ipHash = ip ? hashIp(ip, hmacSecret) : undefined;

          // honeypot이 트리거된 경우 서비스에서 SPAM으로 저장하지만 클라이언트에는 성공으로 표시
          const created = await commentService.create(input, {
            userId: undefined,
            ipHash,
          });

          return successResponse(created, 201);
        }),
      },
    },

    admin: {
      list: {
        GET: withAuth(authMiddleware, async (req) => {
          const { page, limit } = parsePagination(req);
          const statusParam = getSearchParam(req, 'status');
          const postId = getSearchParam(req, 'postId');

          const status = isCommentStatus(statusParam) ? statusParam : undefined;

          const result = await commentService.listAll({
            page,
            limit,
            status,
            postId,
          });

          return successResponse(result);
        }),
      },

      detail: {
        PATCH: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          const body = (await req.json()) as Record<string, unknown>;
          const { status } = body;

          if (!isCommentStatus(status)) {
            return errorResponse(
              BLOG_ERROR_CODES.VALIDATION_FAILED,
              `status must be one of: ${COMMENT_STATUS_VALUES.join(', ')}`,
              400,
            );
          }

          const updated = await commentService.updateStatus(id, status);
          return successResponse(updated);
        }),

        DELETE: withAuth(authMiddleware, async (req, _user, context) => {
          const id = await getRouteParam(context, 'id');
          await commentService.remove(id);
          return new Response(null, { status: 204 });
        }),
      },

      bulk: {
        PATCH: withAuth(authMiddleware, async (req) => {
          const body = (await req.json()) as Record<string, unknown>;
          const { ids, status } = body;

          const check = validateIds(ids);
          if (!check.valid) return check.response;

          if (!isCommentStatus(status)) {
            return errorResponse(
              BLOG_ERROR_CODES.VALIDATION_FAILED,
              `status must be one of: ${COMMENT_STATUS_VALUES.join(', ')}`,
              400,
            );
          }

          const count = await commentService.bulkUpdateStatus(check.ids, status);
          return successResponse({ count });
        }),

        DELETE: withAuth(authMiddleware, async (req) => {
          const body = (await req.json()) as Record<string, unknown>;
          const check = validateIds(body.ids);
          if (!check.valid) return check.response;

          const count = await commentService.removeMany(check.ids);
          return successResponse({ count });
        }),
      },

      pendingCount: {
        GET: withAuth(authMiddleware, async () => {
          const count = await commentService.getPendingCount();
          return successResponse({ count });
        }),
      },
    },
  };
}
