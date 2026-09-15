/**
 * 서버사이드 HTML 새니타이저
 *
 * 위험한 요소(script, iframe, object 등)와 이벤트 핸들러 속성을 제거하면서
 * 블록 에디터가 사용하는 안전한 HTML 구조를 보존한다.
 *
 * - `createSanitizer({ purify })` 로 DOMPurify 인스턴스를 주입할 수 있다 (권장)
 * - `purify` 미지정 시 `isomorphic-dompurify` 동적 로딩을 시도한다. ESM 번들·Next.js
 *   Turbopack 서버 번들에서는 이 로딩이 실패하므로 정규식 기반 폴백 새니타이저를 쓴다
 * - `purify: null` 은 폴백 새니타이저를 강제한다
 * - `createSanitizer(config)` 로 신뢰 iframe origin / 허용 태그/속성을 주입할 수 있다
 */
import {
  findRawTextClose,
  isHtmlSpace,
  nextHtmlSegment,
  type HtmlAttribute,
  type HtmlTag,
} from './html-scan';

// ── 기본값 ──

const DEFAULT_TRUSTED_IFRAME_ORIGINS: readonly string[] = [
  'https://www.youtube.com/',
  'https://youtube.com/',
  'https://www.youtube-nocookie.com/',
  'https://player.vimeo.com/',
];

const FORBID_TAGS = ['script', 'object', 'embed', 'applet', 'form', 'input', 'textarea', 'select', 'button', 'style'];

// ── 폴백 새니타이저 규칙 ──

/** 내용까지 제거하는 요소 */
const REMOVE_WITH_CONTENT = new Set(['script', 'style']);

/** 태그만 제거하는 요소 (내용은 일반 마크업으로 남아 계속 정리된다) */
const STRIP_TAG_ONLY = new Set([
  'object', 'embed', 'applet', 'form', 'input', 'textarea', 'select', 'button',
  // 브라우저가 내용을 raw text 로 해석하는 요소. 남겨 두면 속성값처럼 보이던 문자열이
  // 브라우저에서는 태그가 되어(예: <title><a title="</title><img onerror=...>">) 정리를 우회한다.
  'title', 'noscript', 'xmp', 'noembed', 'noframes', 'plaintext',
  // SVG 애니메이션 요소. 부모 속성을 바꿀 수 있어 <svg><a><set attributeName="href" to="javascript:...">
  // 처럼 속성 정리를 통과한 링크를 실행 가능한 URL 로 만든다.
  'animate', 'animatemotion', 'animatetransform', 'animatecolor', 'set',
  // 문서 수준 요소. 새로고침 이동(meta refresh), 상대 URL 기준 변경(base), 외부 리소스 로드(link)를 일으킨다.
  'meta', 'base', 'link',
]);

const URL_ATTR_NAMES = new Set(['href', 'src', 'action', 'formaction', 'xlink:href']);
const DANGEROUS_STYLE_VALUE = /expression\s*\(|javascript:|url\(\s*["']?\s*javascript:/i;

// 제거가 새 태그를 만드는 입력(예: <<object>script>)을 위해 변화가 없을 때까지 반복한다.
// 상한에 도달하면 모든 꺾쇠를 이스케이프해 실행 불가능한 텍스트로 만든다.
const MAX_FALLBACK_PASSES = 16;

/** isomorphic-dompurify / dompurify 기본 export 와 호환되는 최소 인터페이스 */
export type DOMPurifyLike = {
  sanitize: (dirty: string, options?: Record<string, unknown>) => string;
};

/** 새니타이저 설정 */
export interface SanitizerConfig {
  trustedIframeOrigins?: readonly string[];
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  /**
   * 사용할 DOMPurify 인스턴스.
   * - 객체: 그 인스턴스를 사용한다 (ESM·Turbopack 서버 번들에서는 이 방식을 권장)
   * - `null`: 정규식 기반 폴백 새니타이저를 강제한다 (폴백 경고 없음)
   * - 미지정: `isomorphic-dompurify` 동적 로딩을 시도하고, 실패하면 폴백 새니타이저를 쓴다
   */
  purify?: DOMPurifyLike | null;
}

/** DOM Element 최소 인터페이스 (dom lib 없이 DOMPurify hook 용) */
interface ElementLike {
  nodeName?: string;
  getAttribute?: (name: string) => string | null;
  remove?: () => void;
}

let cachedDomPurify: DOMPurifyLike | null | undefined;
let weakSanitizerWarned = false;

/**
 * 정규식 폴백 새니타이저가 처음 사용될 때 1회 경고한다.
 * 정규식 기반 HTML 새니타이저는 우회 가능성이 알려져 있으므로,
 * 신뢰할 수 없는 HTML을 다룰 경우 isomorphic-dompurify(선택적 peer) 설치를 권장한다.
 */
function warnWeakSanitizerOnce(): void {
  if (weakSanitizerWarned) return;
  weakSanitizerWarned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[@withwiz/blog-core/html-sanitizer] isomorphic-dompurify가 설치되지 않아 ' +
      '정규식 기반 폴백 새니타이저를 사용합니다. 정규식 새니타이저는 우회 ' +
      '가능성이 있으므로, 신뢰할 수 없는 HTML을 처리한다면 ' +
      'isomorphic-dompurify 설치를 권장합니다.',
  );
}

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

// ── 폴백 새니타이저: 값 판정 ──

const NAMED_CHAR_REFS: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  colon: ':', Tab: '\t', NewLine: '\n', sol: '/', bsol: '\\', lpar: '(', rpar: ')',
  period: '.', comma: ',', excl: '!', num: '#', percnt: '%', semi: ';', equals: '=',
  quest: '?', commat: '@', lowbar: '_', grave: '`', plus: '+', dollar: '$', ast: '*',
  verbar: '|', lsqb: '[', rsqb: ']', lcub: '{', rcub: '}',
};
/** 속성값에서 세미콜론 없이도 디코딩되는 이름 */
const LEGACY_CHAR_REFS = new Set(['amp', 'lt', 'gt', 'quot', 'nbsp']);

/**
 * 속성값의 숫자·16진수·흔한 이름 문자 참조를 디코딩한다.
 * - lenient: 위험 판정용. 세미콜론 누락·대소문자 차이도 디코딩해 더 많이 잡는다.
 * - strict: 신뢰 판정용. 브라우저가 디코딩하는 경우만 디코딩해 신뢰를 넓히지 않는다.
 */
function decodeCharRefs(value: string, lenient: boolean): string {
  return value.replace(
    /&(?:#[xX]([0-9a-fA-F]+)(;?)|#(\d+)(;?)|([A-Za-z][A-Za-z0-9]*)(;?))/g,
    (match, hex, _hs, dec, _ds, name, semi, offset: number, whole: string) => {
      if (hex !== undefined || dec !== undefined) {
        const cp = hex !== undefined ? parseInt(hex, 16) : parseInt(dec, 10);
        if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return '�';
        return String.fromCodePoint(cp);
      }
      if (lenient) {
        return NAMED_CHAR_REFS[name] ?? NAMED_CHAR_REFS[String(name).toLowerCase()] ?? match;
      }
      if (semi === ';') return NAMED_CHAR_REFS[name] ?? match;
      const after = whole[offset + match.length];
      if (LEGACY_CHAR_REFS.has(name) && after !== '=' && !/[A-Za-z0-9]/.test(after ?? '')) {
        return NAMED_CHAR_REFS[name];
      }
      return match;
    },
  );
}

/** 디코딩·공백/제어문자 제거 후 실행 가능한 위험 스킴인지 판정한다. */
function isDangerousUrlValue(rawValue: string): boolean {
  const normalized = decodeCharRefs(rawValue, true)
    .replace(/[\s\u0000-\u001f\u007f-\u009f]/g, '')
    .toLowerCase();
  if (normalized.startsWith('javascript:') || normalized.startsWith('vbscript:')) return true;
  return normalized.startsWith('data:') && !normalized.startsWith('data:image/');
}

function isDangerousStyleValue(rawValue: string): boolean {
  return DANGEROUS_STYLE_VALUE.test(rawValue) || DANGEROUS_STYLE_VALUE.test(decodeCharRefs(rawValue, true));
}

/** 브라우저가 쓰는 첫 번째 src 속성으로 신뢰 origin 여부를 판정한다. */
function isTrustedIframe(tag: HtmlTag, trustedOrigins: readonly string[]): boolean {
  const srcAttr = tag.attrs.find((a) => a.name === 'src');
  if (!srcAttr || srcAttr.rawValue === null) return false;
  // URL 파서가 앞뒤에서 제거하는 C0 제어문자·공백만 제거한다
  const src = decodeCharRefs(srcAttr.rawValue, false).replace(/^[\u0000- ]+|[\u0000- ]+$/g, '');
  return src !== '' && trustedOrigins.some((origin) => src.startsWith(origin));
}

// ── 폴백 새니타이저: 태그 정리 ──

function shouldDropAttribute(attr: HtmlAttribute): boolean {
  if (attr.name.startsWith('on')) return true; // 이벤트 핸들러
  if (attr.name === 'srcdoc') return true; // iframe srcdoc(HTML 주입 벡터)
  return attr.name === 'style' && attr.rawValue !== null && isDangerousStyleValue(attr.rawValue);
}

/** 시작 태그의 위험 속성을 정리한다. 바뀐 것이 없으면 원문 그대로 돌려준다. */
function cleanStartTag(html: string, tag: HtmlTag): string {
  let changed = false;
  let body = '';
  for (const attr of tag.attrs) {
    if (shouldDropAttribute(attr)) {
      changed = true;
      continue;
    }
    let text = html.slice(attr.start, attr.end);
    if (URL_ATTR_NAMES.has(attr.name) && attr.rawValue !== null && isDangerousUrlValue(attr.rawValue)) {
      text = `${html.slice(attr.start, attr.nameEnd)}=""`;
      changed = true;
    }
    // 앞 속성이 제거되어 구분자가 사라진 경우 공백을 넣어 속성끼리 붙지 않게 한다
    body += (html.slice(attr.sepStart, attr.start) || ' ') + text;
  }
  if (!changed) return html.slice(tag.start, tag.end);

  const lastEnd = tag.attrs.length > 0 ? tag.attrs[tag.attrs.length - 1].end : tag.nameEnd;
  let trailing = html.slice(lastEnd, tag.end);
  if (!isHtmlSpace(trailing[0]) && trailing[0] !== '>') trailing = ` ${trailing}`;
  return html.slice(tag.start, tag.nameEnd) + body + trailing;
}

/** 종료 태그 속성은 브라우저가 무시하지만, 남겨 둘 이유도 없으므로 정규화한다. */
function endTagText(html: string, tag: HtmlTag): string {
  return tag.attrs.length > 0
    ? `</${html.slice(tag.start + 2, tag.nameEnd)}>`
    : html.slice(tag.start, tag.end);
}

/** raw text 종료 태그 검색 결과를 이름별로 재사용한다 (스캔 위치는 앞으로만 진행). */
function createRawTextCloser(html: string) {
  const cache = new Map<string, { from: number; close: { start: number; end: number } | null }>();
  return (from: number, name: string) => {
    const hit = cache.get(name);
    if (hit && hit.from <= from && (hit.close === null || hit.close.start >= from)) return hit.close;
    const close = findRawTextClose(html, from, name);
    cache.set(name, { from, close });
    return close;
  };
}

function fallbackSanitizePass(html: string, trustedOrigins: readonly string[]): string {
  const n = html.length;
  const findClose = createRawTextCloser(html);
  let out = '';
  let pos = 0;

  while (pos < n) {
    const seg = nextHtmlSegment(html, pos);

    if (seg.type === 'text') {
      out += html.slice(seg.start, seg.end);
      pos = seg.end;
      continue;
    }

    if (seg.type === 'comment') {
      if (seg.cdata) {
        // svg·math 안에서는 CDATA 구간이 텍스트가 되어 경계 해석이 달라지므로 텍스트로 무력화
        out += '&lt;';
        pos = seg.start + 1;
      } else {
        out += html.slice(seg.start, seg.end);
        pos = seg.end;
      }
      continue;
    }

    if (seg.type === 'unterminated-tag') {
      // 브라우저도 버리는 태그. 뒤에 이어 붙는 마크업을 속성으로 삼키지 않도록 제거한다.
      pos = n;
      continue;
    }

    const tag = seg.tag;
    if (tag.isEnd) {
      const removed = REMOVE_WITH_CONTENT.has(tag.name) || STRIP_TAG_ONLY.has(tag.name) || tag.name === 'iframe';
      if (!removed) out += endTagText(html, tag);
      pos = seg.end;
      continue;
    }

    if (REMOVE_WITH_CONTENT.has(tag.name)) {
      const close = findClose(seg.end, tag.name);
      pos = close ? close.end : n;
      continue;
    }

    if (STRIP_TAG_ONLY.has(tag.name)) {
      pos = seg.end;
      continue;
    }

    if (tag.name === 'iframe') {
      const close = findClose(seg.end, 'iframe');
      if (!isTrustedIframe(tag, trustedOrigins)) {
        // 짝이 있으면 내용까지, 닫는 태그가 없으면(self-closing 포함) 여는 태그만 제거
        pos = close ? close.end : seg.end;
        continue;
      }
      // 신뢰 iframe: 내용(대체 콘텐츠)은 버리고 닫는 태그를 보장해 뒤 콘텐츠의 해석을 고정한다
      out += `${cleanStartTag(html, tag)}</iframe>`;
      pos = close ? close.end : seg.end;
      continue;
    }

    out += cleanStartTag(html, tag);
    pos = seg.end;
  }

  return out;
}

/**
 * 정규식 기반 폴백 새니타이저.
 * 태그 마크업 안의 속성만 정리하고 텍스트·주석은 그대로 둔다.
 */
function fallbackSanitize(html: string, trustedOrigins: readonly string[]): string {
  let current = html;
  for (let pass = 0; pass < MAX_FALLBACK_PASSES; pass++) {
    const next = fallbackSanitizePass(current, trustedOrigins);
    if (next === current) return next;
    current = next;
  }
  return current.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── DOMPurify 경로 ──

function dompurifySanitize(
  html: string,
  purify: DOMPurifyLike,
  config: SanitizerConfig,
): string {
  const trustedOrigins = config.trustedIframeOrigins ?? DEFAULT_TRUSTED_IFRAME_ORIGINS;

  const options: Record<string, unknown> = {
    // '#comment': 블록 에디터 데이터 주석(<!-- nbe-blocks:... -->, <!--nbe-cta-start--> 등) 보존
    ADD_TAGS: ['iframe', '#comment'],
    ADD_ATTR: ['allowfullscreen', 'frameborder', 'allow', 'target'],
    FORBID_TAGS: [...FORBID_TAGS],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    // 본문 맨 앞 주석이 <head> 로 밀려 사라지지 않도록 body 로 파싱
    FORCE_BODY: true,
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
    removeHook?: (hook: string, cb?: (node: ElementLike) => void) => void;
  };
  const iframeHook = (node: ElementLike) => {
    if (node.nodeName && node.nodeName.toLowerCase() === 'iframe') {
      const src = node.getAttribute?.('src') ?? '';
      const trusted = trustedOrigins.some((origin) => src.startsWith(origin));
      if (!trusted) {
        node.remove?.();
      }
    }
  };
  if (typeof purifyWithHook.addHook === 'function') {
    purifyWithHook.addHook('uponSanitizeElement', iframeHook);
  }
  try {
    return purify.sanitize(html, options);
  } finally {
    if (typeof purifyWithHook.removeHook === 'function') {
      purifyWithHook.removeHook('uponSanitizeElement', iframeHook);
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
  const explicitPurify = config.purify !== undefined;
  const purify = explicitPurify ? config.purify ?? null : tryLoadDomPurify();

  return function sanitize(html: string | null | undefined): string | null {
    // 빈 입력은 DOMPurify 에 넘기지 않는다 (FORCE_BODY 로 인해 빈 주석이 생길 수 있음)
    if (!html) return html as string | null;
    if (purify) {
      return dompurifySanitize(html, purify, { ...config, trustedIframeOrigins: trustedOrigins });
    }
    if (!explicitPurify) warnWeakSanitizerOnce();
    return fallbackSanitize(html, trustedOrigins);
  };
}

/**
 * 리치 HTML 콘텐츠에서 위험한 요소와 속성을 제거한다.
 */
export function sanitizeHtmlContent(html: string | null | undefined): string | null {
  return defaultSanitize(html);
}

const defaultSanitize = createSanitizer();
