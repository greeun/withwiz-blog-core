import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_THEME_DEFAULTS,
  ADMIN_VAR_MAP,
  adminThemeVars,
  PUBLIC_THEME_DEFAULTS,
  PUBLIC_VAR_MAP,
  publicThemeVars,
} from '../../dist/themes/index.mjs';

test('ADMIN_THEME_DEFAULTS: --blog-theme-default-admin-* 키만 포함', () => {
  const keys = Object.keys(ADMIN_THEME_DEFAULTS);
  assert.ok(keys.length > 0);
  for (const k of keys) {
    assert.ok(
      k.startsWith('--blog-theme-default-admin-'),
      `기대하지 않은 키: ${k}`,
    );
  }
});

test('ADMIN_VAR_MAP: --blog-admin-* 키가 var(--blog-theme-default-admin-*)를 참조', () => {
  const entries = Object.entries(ADMIN_VAR_MAP);
  assert.ok(entries.length > 0);
  for (const [k, v] of entries) {
    assert.ok(k.startsWith('--blog-admin-'), `잘못된 컴포넌트 키: ${k}`);
    assert.ok(
      v.startsWith('var(--blog-theme-default-admin-'),
      `잘못된 참조값: ${v}`,
    );
  }
});

test('adminThemeVars: 테마 기본값 + 변수 매핑 모두 포함', () => {
  const vars = adminThemeVars();
  const keys = Object.keys(vars);
  const themeKeys = keys.filter((k) => k.startsWith('--blog-theme-default-admin-'));
  const adminKeys = keys.filter((k) => k.startsWith('--blog-admin-'));
  assert.ok(themeKeys.length > 0, '테마 기본값 없음');
  assert.ok(adminKeys.length > 0, '컴포넌트 변수 없음');
  assert.equal(themeKeys.length, Object.keys(ADMIN_THEME_DEFAULTS).length);
  assert.equal(adminKeys.length, Object.keys(ADMIN_VAR_MAP).length);
});

test('PUBLIC_THEME_DEFAULTS: --blog-theme-default-public-* 키만 포함', () => {
  const keys = Object.keys(PUBLIC_THEME_DEFAULTS);
  assert.ok(keys.length > 0);
  for (const k of keys) {
    assert.ok(
      k.startsWith('--blog-theme-default-public-'),
      `기대하지 않은 키: ${k}`,
    );
  }
});

test('PUBLIC_VAR_MAP: --blog-public-* 키가 var(--blog-theme-default-public-*)를 참조', () => {
  const entries = Object.entries(PUBLIC_VAR_MAP);
  assert.ok(entries.length > 0);
  for (const [k, v] of entries) {
    assert.ok(k.startsWith('--blog-public-'), `잘못된 컴포넌트 키: ${k}`);
    assert.ok(
      v.startsWith('var(--blog-theme-default-public-'),
      `잘못된 참조값: ${v}`,
    );
  }
});

test('publicThemeVars: 테마 기본값 + 변수 매핑 모두 포함', () => {
  const vars = publicThemeVars();
  const keys = Object.keys(vars);
  const themeKeys = keys.filter((k) => k.startsWith('--blog-theme-default-public-'));
  const publicKeys = keys.filter((k) => k.startsWith('--blog-public-'));
  assert.ok(themeKeys.length > 0, '테마 기본값 없음');
  assert.ok(publicKeys.length > 0, '컴포넌트 변수 없음');
});
