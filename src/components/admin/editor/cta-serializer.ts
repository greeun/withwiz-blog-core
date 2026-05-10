/**
 * CTA 블록 직렬화/역직렬화
 *
 * v1 호환 포맷: <!--CTA:base64data--> 마커를 content 내에 삽입/추출한다.
 * base64 데이터는 { msg, btn, url } JSON 구조이다.
 */

/** CTA 데이터 구조 */
export interface CtaData {
  /** 안내 메시지 */
  msg: string;
  /** 버튼 텍스트 */
  btn: string;
  /** 버튼 링크 URL */
  url: string;
}

/** CTA 마커 정규식 */
const CTA_MARKER_RE = /<!--CTA:([\w+/=]+)-->/;

/**
 * CTA 데이터를 base64 마커 문자열로 직렬화한다.
 * content 끝에 삽입하여 저장하면 된다.
 *
 * @param data - CTA 데이터
 * @returns CTA 마커 문자열 (예: "<!--CTA:eyJtc2ci...-->")
 */
export function serializeCta(data: CtaData): string {
  const json = JSON.stringify({ msg: data.msg, btn: data.btn, url: data.url });
  const encoded = typeof btoa === "function"
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, "utf-8").toString("base64");
  return `<!--CTA:${encoded}-->`;
}

/**
 * content 내 CTA 마커에서 CTA 데이터를 추출한다.
 *
 * @param content - HTML 콘텐츠 문자열
 * @returns CTA 데이터 또는 null (마커 없거나 파싱 실패 시)
 */
export function deserializeCta(content: string): CtaData | null {
  const match = content.match(CTA_MARKER_RE);
  if (!match) return null;

  try {
    const decoded = typeof atob === "function"
      ? decodeURIComponent(escape(atob(match[1])))
      : Buffer.from(match[1], "base64").toString("utf-8");
    const data = JSON.parse(decoded);
    if (data && typeof data.msg === "string" && typeof data.btn === "string" && typeof data.url === "string") {
      return { msg: data.msg, btn: data.btn, url: data.url };
    }
  } catch {
    // 파싱 실패
  }
  return null;
}

/**
 * content에 CTA 데이터를 삽입한다.
 * 기존 CTA 마커가 있으면 교체하고, 없으면 끝에 추가한다.
 *
 * @param content - 원본 HTML 콘텐츠
 * @param data - CTA 데이터 (null이면 마커 제거)
 * @returns CTA 마커가 포함된/제거된 콘텐츠
 */
export function embedCta(content: string, data: CtaData | null): string {
  // 기존 마커 제거
  const cleaned = content.replace(/<!--CTA:[\w+/=]+-->/g, "").trim();
  if (!data) return cleaned;
  return `${cleaned}\n${serializeCta(data)}`;
}

/**
 * content에서 CTA 마커를 제거한다.
 *
 * @param content - HTML 콘텐츠
 * @returns CTA 마커가 제거된 콘텐츠
 */
export function stripCta(content: string): string {
  return content.replace(/<!--CTA:[\w+/=]+-->/g, "").trim();
}
