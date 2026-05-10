/**
 * Sitemap XML 생성 유틸리티.
 *
 * SitemapEntry 배열을 받아 XML 문자열을 반환한다.
 * Next.js sitemap.ts에서 SitemapEntry[] 로도 그대로 사용할 수 있도록
 * 엔트리 타입도 함께 export한다.
 */

/** Sitemap 엔트리 변경 빈도 */
export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

/** Next.js sitemap.ts와 호환되는 엔트리 */
export interface SitemapEntry {
  url: string;
  lastModified: Date | string;
  changeFrequency?: SitemapChangeFrequency;
  priority?: number;
}

/** createSitemap 옵션 */
export interface SitemapOptions {
  /** 사이트맵에 포함할 엔트리 배열 */
  entries: SitemapEntry[];
  /** XML 선언 포함 여부 (default: true) */
  includeXmlDeclaration?: boolean;
}

/** XML 특수 문자 escape */
function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Date | string을 ISO date string으로 변환 */
function toIsoDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * sitemap XML 문자열을 생성한다.
 *
 * @param entries - Sitemap 엔트리 배열
 * @param options - 옵션 (XML 선언 포함 여부 등)
 * @returns sitemap XML 문자열
 */
export function createSitemap(entries: SitemapEntry[], options?: SitemapOptions): string {
  const includeXmlDeclaration = options?.includeXmlDeclaration !== false;

  const urlEntries = entries
    .map((entry) => {
      const lines: string[] = [
        '  <url>',
        `    <loc>${escapeXml(entry.url)}</loc>`,
        `    <lastmod>${toIsoDate(entry.lastModified)}</lastmod>`,
      ];

      if (entry.changeFrequency) {
        lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      }
      if (entry.priority !== undefined) {
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }

      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n');

  const parts: string[] = [];
  if (includeXmlDeclaration) {
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  }
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  if (urlEntries) {
    parts.push(urlEntries);
  }
  parts.push('</urlset>');

  return parts.join('\n');
}
