/**
 * 본문 HTML 텍스트 안의 URL 을 링크로 변환한다 (내부 전용, 공개 export 아님)
 *
 * 새니타이즈가 끝난 본문에 렌더링 시점에 적용되므로 새 속성을 만들면 안 된다.
 * - 태그·주석 경계는 html-scan 으로 판정한다. 따옴표 속성값 안의 `>` 뒤 URL 처럼
 *   태그 마크업 안에 있는 문자열은 텍스트가 아니므로 변환하지 않는다.
 * - 기존 `<a>` 안의 URL 은 변환하지 않는다.
 * - href 값의 따옴표는 이스케이프한다. 링크 텍스트와 이미 인코딩된 `&amp;` 는 그대로 둔다.
 */
import { nextHtmlSegment } from '../../utils/html-scan';

const URL_IN_TEXT = /https?:\/\/[^\s<]+/gi;

function escapeHrefQuotes(url: string): string {
  return url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function linkifyHtml(html: string): string {
  let out = '';
  let pos = 0;
  let insideAnchor = false;

  while (pos < html.length) {
    const seg = nextHtmlSegment(html, pos);
    const raw = html.slice(seg.start, seg.end);
    if (seg.type === 'text' && !insideAnchor) {
      out += raw.replace(
        URL_IN_TEXT,
        (url) => `<a href="${escapeHrefQuotes(url)}" target="_blank" rel="noopener noreferrer">${url}</a>`,
      );
    } else {
      out += raw;
    }
    if (seg.type === 'tag' && seg.tag.name === 'a') insideAnchor = !seg.tag.isEnd;
    pos = seg.end;
  }

  return out;
}
