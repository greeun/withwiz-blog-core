/**
 * HTML 태그·속성·주석 경계 스캐너 (내부 전용, 공개 엔트리 아님)
 *
 * WHATWG HTML 토큰화 규칙 중 경계 판정 부분을 따른다.
 * - 따옴표로 감싼 속성값 안의 `>` 는 태그 끝이 아니다.
 * - 속성명 안의 따옴표는 값의 시작이 아니다 (`<a b"c onclick=x>` 의 onclick 은 속성).
 * - 속성은 공백·`/`·따옴표 값 직후에서 시작할 수 있다.
 * - 주석(`<!-- -->`, `<!-->`, `--!>` 종료 포함)과 `<!...>`·`<?...>` 는 태그가 아니다.
 *
 * raw text 요소(script, style, iframe, title 등)의 내용과 외부 콘텐츠(svg, math)의 CDATA 는
 * 구분하지 않는다. 호출부가 그런 요소를 제거·정규화한 문자열에 사용해야 브라우저 해석과 일치한다.
 */

export function isHtmlSpace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\f' || ch === '\r';
}

function isAsciiAlpha(ch: string | undefined): boolean {
  return ch !== undefined && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'));
}

export interface HtmlAttribute {
  /** 소문자 속성명 */
  name: string;
  /** 앞 구분자 시작 위치 (직전 속성 끝 또는 태그명 끝) */
  sepStart: number;
  start: number;
  nameEnd: number;
  end: number;
  /** 따옴표를 제외한 원문 값 (문자 참조 미디코딩). 값이 없으면 null */
  rawValue: string | null;
}

export interface HtmlTag {
  isEnd: boolean;
  /** 소문자 태그명 */
  name: string;
  /** `<` 위치 */
  start: number;
  nameEnd: number;
  /** 중복 속성도 모두 담는다 (브라우저는 첫 번째만 사용) */
  attrs: HtmlAttribute[];
  /** `>` 다음 위치 */
  end: number;
}

export type HtmlSegment =
  | { type: 'text'; start: number; end: number }
  | { type: 'comment'; start: number; end: number; bogus: boolean; cdata: boolean }
  | { type: 'tag'; start: number; end: number; tag: HtmlTag }
  /** `>` 없이 끝난 태그. 브라우저는 버린다 */
  | { type: 'unterminated-tag'; start: number; end: number };

/** `<!--` 다음 위치부터 주석 끝(`>` 다음) 위치를 찾는다. 닫히지 않으면 문자열 끝. */
function findCommentEnd(html: string, from: number): number {
  const n = html.length;
  let i = from;
  let state: 'start' | 'startDash' | 'comment' | 'endDash' | 'end' | 'endBang' = 'start';
  for (;;) {
    if (i >= n) return n;
    const ch = html[i];
    switch (state) {
      case 'start':
        if (ch === '-') { state = 'startDash'; i++; }
        else if (ch === '>') return i + 1;
        else state = 'comment';
        break;
      case 'startDash':
        if (ch === '-') { state = 'end'; i++; }
        else if (ch === '>') return i + 1;
        else state = 'comment';
        break;
      case 'comment':
        if (ch === '-') state = 'endDash';
        i++;
        break;
      case 'endDash':
        if (ch === '-') { state = 'end'; i++; }
        else state = 'comment';
        break;
      case 'end':
        if (ch === '>') return i + 1;
        if (ch === '!') { state = 'endBang'; i++; }
        else if (ch === '-') i++;
        else state = 'comment';
        break;
      case 'endBang':
        if (ch === '>') return i + 1;
        if (ch === '-') { state = 'endDash'; i++; }
        else state = 'comment';
        break;
    }
  }
}

function findBogusCommentEnd(html: string, from: number): number {
  const gt = html.indexOf('>', from);
  return gt === -1 ? html.length : gt + 1;
}

/** `<`(시작 태그) 또는 `</`(종료 태그) 위치에서 태그를 해석한다. `>` 전에 끝나면 null. */
export function parseHtmlTag(html: string, lt: number, isEnd: boolean): HtmlTag | null {
  const n = html.length;
  const nameStart = lt + (isEnd ? 2 : 1);
  let i = nameStart;
  while (i < n && !isHtmlSpace(html[i]) && html[i] !== '/' && html[i] !== '>') i++;
  const name = html.slice(nameStart, i).toLowerCase();
  const nameEnd = i;
  const attrs: HtmlAttribute[] = [];
  let lastEnd = nameEnd;

  for (;;) {
    while (i < n && (isHtmlSpace(html[i]) || html[i] === '/')) i++;
    if (i >= n) return null;
    if (html[i] === '>') return { isEnd, name, start: lt, nameEnd, attrs, end: i + 1 };

    const start = i;
    i++; // 첫 글자는 '=' 여도 속성명에 포함된다
    while (i < n && !isHtmlSpace(html[i]) && html[i] !== '/' && html[i] !== '>' && html[i] !== '=') i++;
    const attrNameEnd = i;

    let j = i;
    while (j < n && isHtmlSpace(html[j])) j++;
    let rawValue: string | null = null;
    let end = attrNameEnd;
    if (html[j] === '=') {
      j++;
      while (j < n && isHtmlSpace(html[j])) j++;
      if (j >= n) return null;
      const quote = html[j];
      if (quote === '"' || quote === "'") {
        const close = html.indexOf(quote, j + 1);
        if (close === -1) return null;
        rawValue = html.slice(j + 1, close);
        end = close + 1;
      } else if (quote === '>') {
        rawValue = '';
        end = j;
      } else {
        let k = j;
        while (k < n && !isHtmlSpace(html[k]) && html[k] !== '>') k++;
        if (k >= n) return null;
        rawValue = html.slice(j, k);
        end = k;
      }
      i = end;
    }

    attrs.push({
      name: html.slice(start, attrNameEnd).toLowerCase(),
      sepStart: lastEnd,
      start,
      nameEnd: attrNameEnd,
      end,
      rawValue,
    });
    lastEnd = end;
  }
}

/** pos 에서 시작하는 다음 세그먼트를 돌려준다. */
export function nextHtmlSegment(html: string, pos: number): HtmlSegment {
  const n = html.length;
  let i = pos;
  for (;;) {
    const lt = html.indexOf('<', i);
    if (lt === -1) return { type: 'text', start: pos, end: n };
    const next = html[lt + 1];
    const startsMarkup =
      next === '!' || next === '?' || isAsciiAlpha(next) || (next === '/' && lt + 2 < n);
    if (!startsMarkup) {
      i = lt + 1;
      continue;
    }
    if (lt > pos) return { type: 'text', start: pos, end: lt };
    break;
  }

  const lt = pos;
  const next = html[lt + 1];
  if (next === '!') {
    if (html.startsWith('<!--', lt)) {
      return { type: 'comment', start: lt, end: findCommentEnd(html, lt + 4), bogus: false, cdata: false };
    }
    return {
      type: 'comment',
      start: lt,
      end: findBogusCommentEnd(html, lt + 2),
      bogus: true,
      cdata: html.startsWith('[CDATA[', lt + 2),
    };
  }
  if (next === '?') {
    return { type: 'comment', start: lt, end: findBogusCommentEnd(html, lt + 1), bogus: true, cdata: false };
  }
  if (next === '/') {
    const after = html[lt + 2];
    if (after === '>') return { type: 'comment', start: lt, end: lt + 3, bogus: true, cdata: false };
    if (!isAsciiAlpha(after)) {
      return { type: 'comment', start: lt, end: findBogusCommentEnd(html, lt + 2), bogus: true, cdata: false };
    }
  }
  const isEnd = next === '/';
  const tag = parseHtmlTag(html, lt, isEnd);
  return tag
    ? { type: 'tag', start: lt, end: tag.end, tag }
    : { type: 'unterminated-tag', start: lt, end: n };
}

/**
 * raw text 요소의 내용이 끝나는 종료 태그(`</name` + 공백·`/`·`>`)를 찾는다.
 * 브라우저와 같이 따옴표·주석을 고려하지 않고 처음 나오는 종료 태그를 쓴다.
 */
export function findRawTextClose(
  html: string,
  from: number,
  name: string,
): { start: number; end: number } | null {
  const re = new RegExp(`</${name}(?=[\\t\\n\\f\\r />])`, 'gi');
  re.lastIndex = from;
  const m = re.exec(html);
  if (!m) return null;
  const tag = parseHtmlTag(html, m.index, true);
  return { start: m.index, end: tag ? tag.end : html.length };
}
