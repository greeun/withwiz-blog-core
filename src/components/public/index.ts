/**
 * 공개 블로그 컴포넌트 barrel export (클라이언트 전용)
 */
import 'client-only';

export { default as BlogListPage } from './BlogListPage';
export { default as BlogDetailPage } from './BlogDetailPage';
export { default as CommentList } from './CommentList';
export { default as CommentForm } from './CommentForm';
export { default as TagBadge } from './TagBadge';
export { default as TagCloud } from './TagCloud';

// 타입 export
export type {
  BlogListPageProps,
  BlogDetailPageProps,
  CommentListProps,
  CommentFormProps,
  TagBadgeProps,
  TagCloudProps,
  TagCloudItem,
} from './types';

// 스타일 export
export { ps as publicStyles, publicRootVars } from './styles';
export { PUBLIC_THEME_DEFAULTS, PUBLIC_VAR_MAP, publicThemeVars } from '../../themes/default-public';

// Context provider (호스트가 next/link 등을 주입할 때 사용)
export { BlogThemeProvider, useBlogUI } from '../../context/BlogUIContext';
export type { BlogThemeProviderProps } from '../../context/BlogUIContext';
