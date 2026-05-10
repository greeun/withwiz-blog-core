/**
 * OG 이미지 데이터 준비 헬퍼
 *
 * 실제 이미지 렌더링은 호스트 프로젝트의 opengraph-image.tsx에서
 * Next.js ImageResponse를 사용해 수행한다.
 * 이 헬퍼는 렌더링에 필요한 데이터만 준비한다.
 */
import type { BlogDetail, CategoryTheme } from '../types/blog';
import type { BlogConfig } from '../types/config';

/** OG 이미지 렌더링에 필요한 데이터 */
export interface OGImageData {
  /** 글 제목 */
  title: string;
  /** 카테고리 라벨 (카테고리 테마의 label 또는 key) */
  category?: string;
  /** 커버 이미지 URL (있을 경우 배경 또는 참고 이미지) */
  coverImageUrl?: string;
  /** 카테고리 테마 (색상 참조용) */
  categoryTheme?: CategoryTheme;
}

/**
 * 블로그 상세 데이터로부터 OG 이미지 렌더링 데이터를 준비한다.
 *
 * Next.js opengraph-image.tsx에서 ImageResponse로 렌더링할 때 사용한다.
 */
export function prepareOGImageData(post: BlogDetail, config: BlogConfig): OGImageData {
  const theme = config.categories?.[post.category];
  const data: OGImageData = {
    title: post.title,
  };

  if (theme) {
    data.category = theme.label ?? theme.key ?? post.category;
    data.categoryTheme = theme;
  } else if (post.category) {
    data.category = post.category;
  }

  if (post.coverImageUrl) {
    data.coverImageUrl = post.coverImageUrl;
  }

  return data;
}
