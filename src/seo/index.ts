/**
 * SEO 유틸리티 모듈 진입점.
 */

export { generateMetadata, generateListMetadata } from './metadata';
export type {
  Metadata,
  MetadataOptions,
  ListMetadataOptions,
} from './metadata';

export { prepareOGImageData } from './og-image';
export type { OGImageData } from './og-image';

export { createSitemap } from './sitemap';
export type {
  SitemapEntry,
  SitemapOptions,
  SitemapChangeFrequency,
} from './sitemap';

export { createRSSFeed, escapeXml, toRfc822 } from './rss';
export type { RSSOptions } from './rss';

export { generateJsonLd, generateBreadcrumbJsonLd } from './json-ld';
export type { JsonLdOptions, BreadcrumbItem } from './json-ld';
