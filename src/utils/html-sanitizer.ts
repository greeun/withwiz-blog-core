/**
 * 서버사이드 HTML 새니타이저
 *
 * 위험한 요소(script, iframe, object 등)와 이벤트 핸들러 속성을 제거하면서
 * 블록 에디터가 사용하는 안전한 HTML 구조를 보존한다.
 *
 * - 기본은 정규식 기반 새니타이저 (의존성 0)
 * - `isomorphic-dompurify` 가 설치되어 있으면 자동으로 그것을 사용한다 (선택적 강화)
 * - `createSanitizer(config)` 로 신뢰 iframe origin / 허용 태그/속성을 주입할 수 있다
 *
 * `sanitizeHtmlContent` 는 하위 호환을 위해 기본 안전 설정으로 동작한다.
 */

// ── 기본값 ──

/** 기본 신뢰 iframe origin (YouTube, Vimeo) */
const DEFAULT_TRUSTED_IFRAME_ORIGINS: readonly string[] = [
  'https://www.youtube.com/',
  'https://youtube.com/',
  'https://www.youtube-nocookie.com/',
  'https://player.vimeo.com/',
];

/** 항상 제거할 태그 (내용 포함) */
const STRIP_TAGS_WITH_CONTENT = /(<\s*\/?\s*(script|object|embed|applet|form|input|textarea|select|button)\b[^>]*>)/gi;

/** 신뢰되지 않는 iframe 매칭 */
const UNTRUSTED_IFRAME = /<\s*iframe\b[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi;

/** script/style 태그 사이 콘텐츠 */
const STRIP_TAG_CONTENT = /<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;

/** 이벤트 핸들러 속성 (onclick, onerror, onload 등) */
const EVENT_HANDLER_ATTRS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;

/** 위험한 URL 프로토콜 (href/src 속성 내) */
const DANGEROUS_PROTOCOL = /(href|src|action)\s*=\s*["']\s*(javascript|vbscript|data\s*:(?!image\/))[^"']*["']/gi;

// ── 설정 인터페이스 ──

/** 새니타이저 설정 */
export interface SanitizerConfig {
  /**
   * 신뢰할 수 있는 iframe origin 목록 (prefix 매칭).
   * 미지정 시 기본값(YouTube, Vimeo) 사용.
   * 호스트가 확장 가능: ['https://www.youtube.com/', 'https://www.loom.com/']
   */
  trustedIframeOrigins?: readonly string[];
  /**
   * DOMPurify 사용 시 허용할 태그 화이트리스트.
   * 미지정 시 DOMPurify 기본 화이트리스트 사용.
   */
  allowedTags?: string[];
  /**
   * DOMPurify 사용 시 허용할 속성 화이트리스트.
   * 미지정 시 DOMPurify 기본 화이트리스트 사용.
   */
  allowedAttributes?: Record<string, string[]>;
}

// ── DOMPurify 동적 로딩 (선택적) ──

type DOMPurifyLike = {
  sanitize: (
    dirty: string,
    options?: Record<string, unknown>,
  ) => string;
};

let cachedDomPurify: DOMPurifyLike | null | undefined;

/**
 * 선택적 의존성 `isomorphic-dompurify` 를 동기적으로 로드한다.
 * 설치되지 않았거나 로드 실패 시 null 을 반환하고, 호출자는 정규식 fallback 을 사용한다.
 */
function tryLoadDomPurify(): DOMPurifyLike | null {
  if (cachedDomPurify !== undefined) return cachedDomPurify;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('isomorphic-dompurify') as unknown;
    // ESM/CJS 양쪽 호환
    const candidate =
      (mod as { default?: DOMPurifyLike }).default ?? (mod as DOMPurifyLike);
    if (candidate && typeof candidate.sanitize === 'function') {
      cachedDomPurify = candidate;
      return candidate;
    }
  } catch {
    // 모듈 미설치 — 정규식 fallback 사용
  }
  cachedDomPurify = null;
  return null;
}

// ── 정규식 기반 새니타이저 (fallback) ──

function regexSanitize(html: string, trustedOrigins: readonly string[]): string {
  let result = html;

  // 1. script/style 태그 사이 콘텐츠 제거
  result = result.replace(STRIP_TAG_CONTENT, '');

  // 2. 위험한 태그 제거
  result = result.replace(STRIP_TAGS_WITH_CONTENT, '');

  // 2b. 신뢰되지 않는 iframe 제거 (신뢰 origin 유지)
  result = result.replace(UNTRUSTED_IFRAME, (match) => {
    const srcMatch = match.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (srcMatch) {
      const src = srcMatch[1].trim();
      if (trustedOrigins.some((origin) => src.startsWith(origin))) {
        return match;
      }
    }
    return '';
  });

  // 3. 이벤트 핸들러 속성 제거
  result = result.replace(EVENT_HANDLER_ATTRS, '');

  // 4. 위험한 URL 프로토콜 무력화
  result = result.replace(DANGEROUS_PROTOCOL, '$1=""');

  return result;
}

// ── DOMPurify 기반 새니타이저 ──

function dompurifySanitize(
  html: string,
  purify: DOMPurifyLike,
  config: SanitizerConfig,
): string {
  const trustedOrigins = config.trustedIframeOrigins ?? DEFAULT_TRUSTED_IFRAME_ORIGINS;

  const options: Record<string, unknown> = {
    // iframe 은 hook 에서 origin 검증 후 허용 — 기본 허용 태그에 추가
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allowfullscreen', 'frameborder', 'allow'],
    // 위험 태그는 명시 제거 (DOMPurify 기본도 막지만 이중 안전)
    FORBID_TAGS: ['script', 'object', 'embed', 'applet', 'form', 'input', 'textarea', 'select', 'button', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  };

  if (config.allowedTags) options.ALLOWED_TAGS = config.allowedTags;
  if (config.allowedAttributes) {
    // DOMPurify 는 ALLOWED_ATTR 가 평탄 배열 — 모든 키의 값을 합친다
    const flat = new Set<string>();
    for (const attrs of Object.values(config.allowedAttributes)) {
      for (const a of attrs) flat.add(a);
    }
    options.ALLOWED_ATTR = Array.from(flat);
  }

  // iframe origin 검증 hook 등록 (DOMPurify 4.x: addHook)
  const purifyWithHook = purify as DOMPurifyLike & {
    addHook?: (
      hook: string,
      cb: (node: Element) => void,
    ) => void;
    removeHook?: (hook: string) => void;
  };
  if (typeof purifyWithHook.addHook === 'function') {
    purifyWithHook.addHook('uponSanitizeElement', (node) => {
      if (node.nodeName && node.nodeName.toLowerCase() === 'iframe') {
        const src = (node as Element).getAttribute?.('src') ?? '';
        const trusted = trustedOrigins.some((origin) => src.startsWith(origin));
        if (!trusted) {
          (node as Element).remove?.();
        }
      }
    });
  }
  try {
    return purify.sanitize(html, options);
  } finally {
    if (typeof purifyWithHook.removeHook === 'function') {
      purifyWithHook.removeHook('uponSanitizeElement');
    }
  }
}

// ── Public API ──

/**
 * 새니타이저 팩토리.
 *
 * DOMPurify 가 설치되어 있으면 그것을 우선 사용하고,
 * 없으면 정규식 기반 fallback 으로 동작한다.
 *
 * @example
 * const sanitize = createSanitizer({
 *   trustedIframeOrigins: ['https://www.youtube.com/', 'https://www.loom.com/'],
 * });
 * const safe = sanitize(userHtml);
 */
export function createSanitizer(
  config: SanitizerConfig = {},
): (html: string | null | undefined) => string | null {
  const trustedOrigins = config.trustedIframeOrigins ?? DEFAULT_TRUSTED_IFRAME_ORIGINS;
  const purify = tryLoadDomPurify();

  return function sanitize(html: string | null | undefined): string | null {
    if (!html) return html as string | null;
    if (purify) {
      return dompurifySanitize(html, purify, { ...config, trustedIframeOrigins: trustedOrigins });
    }
    return regexSanitize(html, trustedOrigins);
  };
}

/**
 * 리치 HTML 콘텐츠에서 위험한 요소와 속성을 제거한다.
 *
 * 기본 안전 설정으로 동작한다 (하위 호환). 호스트별 신뢰 origin 확장이 필요하면
 * `createSanitizer({ trustedIframeOrigins: [...] })` 를 사용한다.
 *
 * p, h1~h6, strong, em, a, img, ul, ol, li, blockquote, figure,
 * figcaption, div, span, br, hr, table, video 등 안전한 태그는 보존한다.
 */
export function sanitizeHtmlContent(html: string | null | undefined): string | null {
  return defaultSanitize(html);
}

/** 모듈 로드 시점에 1회 초기화된 기본 새니타이저 */
const defaultSanitize = createSanitizer();
