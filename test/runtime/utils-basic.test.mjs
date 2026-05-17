import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSlug,
  isValidSlug,
  buildPaginatedResult,
  formatDate,
} from '../../dist/utils/index.mjs';

// Phase 7 순수 추출(blog.service.internal 등) 회귀 가드 성격의 기본 sanity

test('generateSlug / isValidSlug', () => {
  const s = generateSlug('Hello World! 안녕');
  assert.equal(typeof s, 'string');
  assert.ok(s.length > 0);
  assert.equal(isValidSlug('valid-slug-123'), true);
  assert.equal(isValidSlug('Invalid Slug'), false);
});

test('buildPaginatedResult: 메타 계산', () => {
  const r = buildPaginatedResult([1, 2, 3], 23, 2, 10);
  assert.deepEqual(r.items, [1, 2, 3]);
  assert.equal(r.total, 23);
  assert.equal(r.page, 2);
  assert.equal(r.limit ?? r.pageSize ?? 10, 10);
});

test('formatDate: null 안전', () => {
  assert.equal(typeof formatDate(null), 'string');
  assert.doesNotThrow(() => formatDate(new Date('2026-05-16')));
});
