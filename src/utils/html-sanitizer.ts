/**
 * 서버사이드 HTML 새니타이저
 *
 * 위험한 요소(script, iframe, object 등)와 이벤트 핸들러 속성을 제거하면서
 * 블록 에디터가 사용하는 안전한 HTML 구조를 보존한다.
 *
 * - 기본은 정규식 기반 새니타이저 (의존성 0)
 * - `isomorphic-dompurify` 가 설치되어 있으면 자동으로 그것을 사용한다 (선택적 강화)
 * - `createSanitizer(config)` 로 신뢰 iframe origin / 허용 태그/속성을 주입할 수 있다
 */

// ── 기본값 ──

const DEFAULT_TRUSTED_IFRAME_ORIGINS: readonly string[] = [
  'https://www.youtube.com/',
  'https://youtube.com/',
  'https://www.youtube-nocookie.com/',
  'https://player.vimeo.com/',
];

const STRIP_TAGS_WITH_CONTENT = /(<\s*\/?\s*(script|object|embed|applet|form|input|textarea|select|button)\b[^>]*>)/gi;
const UNTRUSTED_IFRAME = /<\s*iframe\b[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi;
const STRIP_TAG_CONTENT = /<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const EVENT_HANDLER_ATTRS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;
const DANGEROUS_PROTOCOL = /(href|src|action)\s*=\s*["']\s*(javascript|vbscript|data\s*:(?!image\/))[^"']*["']/gi;

/** 새니타이저 설정 */
export interface SanitizerConfig {
  trustedIframeOrigins?: readonly string[];
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
}

/** DOM Element 최소 인터페이스 (dom lib 없이 DOMPurify hook 용) */
interface ElementLike {
  nodeName?: string;
  getAttribute?: (name: string) => string | null;
  remove?: () => void;
}

type DOMPurifyLike = {
  sanitize: (dirty: string, options?: Record<string, unknown>) => string;
};

let cachedDomPurify: DOMPurifyLike | null | undefined;

function tryLoadDomPurify(): DOMPurifyLike | null {
  if (cachedDomPurify !== undefined) return cachedDomPurify;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('isomorphic-dompurify') as unknown;
    const candidate =
      (mod as { default?: DOMPurifyLike }).default ?? (mod as DOMPurifyLike);
    if (candidate && typeof candidate.sanitize === 'function') {
      cachedDomPurify = candidate;
      return candidate;
    }
  } catch {
    // 모듈 미설치
  }
  cachedDomPurify = null;
  return null;
}

function regexSanitize(html: string, trustedOrigins: readonly string[]): string {
  let result = html;
  result = result.replace(STRIP_TAG_CONTENT, '');
  result = result.replace(STRIP_TAGS_WITH_CONTENT, '');
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
  result = result.replace(EVENT_HANDLER_ATTRS, '');
  result = result.replace(DANGEROUS_PROTOCOL, '$1=""');
  return result;
}

function dompurifySanitize(
  html: string,
  purify: DOMPurifyLike,
  config: SanitizerConfig,
): string {
  const trustedOrigins = config.trustedIframeOrigins ?? DEFAULT_TRUSTED_IFRAME_ORIGINS;

  const options: Record<string, unknown> = {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allowfullscreen', 'frameborder', 'allow'],
    FORBID_TAGS: ['script', 'object', 'embed', 'applet', 'form', 'input', 'textarea', 'select', 'button', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  };

  if (config.allowedTags) options.ALLOWED_TAGS = config.allowedTags;
  if (config.allowedAttributes) {
    const flat = new Set<string>();
    for (const attrs of Object.values(config.allowedAttributes)) {
      for (const a of attrs) flat.add(a);
    }
    options.ALLOWED_ATTR = Array.from(flat);
  }

  const purifyWithHook = purify as DOMPurifyLike & {
    addHook?: (hook: string, cb: (node: ElementLike) => void) => void;
    removeHook?: (hook: string) => void;
  };
  if (typeof purifyWithHook.addHook === 'function') {
    purifyWithHook.addHook('uponSanitizeElement', (node: ElementLike) => {
      if (node.nodeName && node.nodeName.toLowerCase() === 'iframe') {
        const src = node.getAttribute?.('src') ?? '';
        const trusted = trustedOrigins.some((origin) => src.startsWith(origin));
        if (!trusted) {
          node.remove?.();
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

/**
 * 새니타이저 팩토리.
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
 */
export function sanitizeHtmlContent(html: string | null | undefined): string | null {
  return defaultSanitize(html);
}

const defaultSanitize = createSanitizer();
