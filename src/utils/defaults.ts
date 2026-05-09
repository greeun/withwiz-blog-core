/**
 * 블로그 패키지 기본 경로 fallback
 *
 * 컴포넌트가 호스트 설정(`config.authRefreshPath`, `config.loginPath`)을 받지 못한
 * 경우 최후 수단(last-resort)으로 사용하는 경로 모음.
 *
 * @warning 이 기본값은 참고용 예시입니다. 실제 운영에서는 `BlogConfig.authRefreshPath`와
 *          `BlogConfig.loginPath`를 호스트 프로젝트의 실제 라우트에 맞춰 반드시 설정하세요.
 *          호스트가 다른 인증 베이스 경로(`/api/v2/auth/...` 등)를 사용하는 경우
 *          이 fallback에 의존하면 401/Redirect 동작이 깨집니다.
 */

/**
 * BlogConfig 선택적 필드의 fallback 경로.
 *
 * 호스트 측에서 명시적으로 경로를 설정하지 않은 경우에만 사용된다.
 * 컴포넌트는 개발 모드에서 fallback 사용 시 1회 경고를 출력해야 한다.
 */
export const BLOG_FALLBACK_PATHS = {
  /** 인증 토큰 갱신 API 경로 (fallback) */
  authRefreshPath: '/api/admin/auth/refresh',
  /** 로그인 페이지 경로 (fallback) */
  loginPath: '/admin/login',
} as const;

/**
 * @deprecated `BLOG_FALLBACK_PATHS`를 사용하세요. 명칭 통일을 위해 변경되었습니다.
 *             하위 호환을 위해 동일한 객체를 re-export 합니다.
 */
export const BLOG_DEFAULTS = BLOG_FALLBACK_PATHS;
