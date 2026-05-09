import { describe, it, expect } from 'vitest';
import { BLOG_DEFAULTS } from '@withwiz/blog-core/utils';

describe('BLOG_DEFAULTS', () => {
  // BC-DF-01
  it('authRefreshPath가 올바른 경로를 가진다', () => {
    expect(BLOG_DEFAULTS.authRefreshPath).toBe('/api/admin/auth/refresh');
  });

  // BC-DF-02
  it('loginPath가 올바른 경로를 가진다', () => {
    expect(BLOG_DEFAULTS.loginPath).toBe('/admin/login');
  });
});
