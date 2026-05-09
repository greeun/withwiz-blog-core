/**
 * 관리자 블로그 컴포넌트 상수 및 헬퍼
 */
import type { Attachment, BlogConfig } from '../../types';

// ── 타입 ──

/** 관리자 목록 항목 */
export interface BlogItem {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  hasAttachments: boolean;
  featured: boolean;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
}

/** 편집 폼 데이터 */
export interface BlogFormData {
  title: string;
  slug: string;
  category: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  coverImageKey: string;
  attachments: Attachment[];
  featured: boolean;
  published: boolean;
  publishedAt: string;
  ctaEnabled: boolean;
  ctaMsg: string;
  ctaBtn: string;
  ctaUrl: string;
}

/** CTA 직렬화 데이터 */
export interface CtaData {
  enabled: boolean;
  msg: string;
  btn: string;
  url: string;
}

// ── 상수 ──

/** 미리보기 페이지당 아이템 수 */
export const PPG = 6;

// ── 기본 폼 팩토리 ──

/**
 * 빈 폼 데이터를 생성한다.
 * 기본 카테고리는 config에서 첫 번째 카테고리를 사용한다.
 */
export function createEmptyForm(config: BlogConfig): BlogFormData {
  const firstCategory = Object.keys(config.categories)[0] || '';
  return {
    title: '',
    slug: '',
    category: firstCategory,
    content: '',
    excerpt: '',
    coverImageUrl: '',
    coverImageKey: '',
    attachments: [],
    featured: false,
    published: false,
    publishedAt: '',
    ctaEnabled: false,
    ctaMsg: '',
    ctaBtn: '',
    ctaUrl: '',
  };
}

// ── CTA 헬퍼 ──

const NBE_CTA_MARKER = '<!-- nbe-cta:';
/** CTA HTML 시작 마커 */
export const CTA_HTML_START = '<!-- nbe-cta-start -->';
/** CTA HTML 끝 마커 */
export const CTA_HTML_END = '<!-- nbe-cta-end -->';

/** 콘텐츠에서 CTA 데이터를 역직렬화한다 */
export function deserializeCta(content: string): CtaData {
  const idx = content.indexOf(NBE_CTA_MARKER);
  if (idx === -1) return { enabled: false, msg: '', btn: '', url: '' };
  try {
    const start = idx + NBE_CTA_MARKER.length;
    const end = content.indexOf(' -->', start);
    const encoded = content.substring(start, end);
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return { enabled: false, msg: '', btn: '', url: '' };
  }
}

/** 콘텐츠에서 CTA HTML 및 마커를 제거한다 */
export function stripCtaFromContent(content: string): string {
  let c = content.replace(/\n<!-- nbe-cta:[^\n]+ -->/g, '');
  c = c.replace(/<!-- nbe-cta-start -->[\s\S]*?<!-- nbe-cta-end -->/g, '');
  return c;
}

/** CTA 데이터를 마커 문자열로 직렬화한다 */
export function serializeCta(cta: CtaData): string {
  const encoded = typeof btoa === 'function' ? btoa(encodeURIComponent(JSON.stringify(cta))) : '';
  return `\n${NBE_CTA_MARKER}${encoded} -->`;
}

// ── 유틸리티 헬퍼 ──

/** HTML 이스케이프 */
export function hEsc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 블록 에디터 메타데이터 이전의 표시용 HTML 추출 */
export function extractDisplayHtml(content: string): string {
  const idx = content.indexOf('\n<!-- nbe-blocks:');
  return idx >= 0 ? content.substring(0, idx) : content;
}

/** 날짜 포맷 (YYYY.MM.DD) */
export function formatDateOnly(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** config에서 카테고리 CSS 클래스 조회 */
export function getCatClass(category: string, config: BlogConfig): string {
  return config.categories[category]?.key || category.toLowerCase();
}

/** config에서 카테고리 라벨 조회 */
export function getCatLabel(category: string, config: BlogConfig): string {
  return config.categories[category]?.label || category;
}
