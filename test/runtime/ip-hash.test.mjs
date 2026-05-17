import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashIp, createIpHasher } from '../../dist/utils/index.mjs';

test('hashIp: 시크릿 미주입 시 throw (fail-closed, env 미사용)', () => {
  assert.throws(() => hashIp('1.2.3.4'), /시크릿이 주입되지 않았습니다/);
});

test('hashIp: 빈 문자열 시크릿도 throw', () => {
  assert.throws(() => hashIp('1.2.3.4', ''), /시크릿이 주입되지 않았습니다/);
});

test('hashIp: 시크릿 주입 시 64자 hex, 결정적', () => {
  const a = hashIp('1.2.3.4', 'secret-A');
  const b = hashIp('1.2.3.4', 'secret-A');
  const c = hashIp('1.2.3.4', 'secret-B');
  assert.equal(a.length, 64);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, b, '동일 입력+시크릿은 동일 해시');
  assert.notEqual(a, c, '시크릿이 다르면 해시가 다름');
});

test('createIpHasher: 빈 시크릿 거부', () => {
  assert.throws(() => createIpHasher(''), /비어 있을 수 없습니다/);
});

test('createIpHasher: 정상 동작', () => {
  const h = createIpHasher('s');
  assert.match(h('9.9.9.9'), /^[0-9a-f]{64}$/);
});
