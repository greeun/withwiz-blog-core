import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtmlContent, createSanitizer } from '../../dist/utils/index.mjs';

// warnWeakSanitizerOnce는 프로세스 1회용이므로, 첫 sanitize 호출 전에
// (모듈 로드 시점) console.warn을 가로채 파일 전체의 경고를 수집한다.
// node:test는 파일별 별도 프로세스라 이 파일의 첫 sanitize는 아래 첫 테스트.
const warnLog = [];
const origWarn = console.warn;
console.warn = (...a) => warnLog.push(a.join(' '));
after(() => {
  console.warn = origWarn;
});

test('sanitize: <script> 제거 (이 호출이 폴백 경고를 1회 트리거)', () => {
  const out = sanitizeHtmlContent('<p>ok</p><script>alert(1)</script>');
  assert.ok(!/<script/i.test(out), 'script 태그 제거');
  assert.match(out, /<p>ok<\/p>/);
});

test('sanitize: on* 이벤트 핸들러 제거', () => {
  const out = sanitizeHtmlContent('<img src="x" onerror="alert(1)">');
  assert.ok(!/onerror/i.test(out), 'onerror 제거');
});

test('sanitize: javascript: 프로토콜 무력화', () => {
  const out = sanitizeHtmlContent('<a href="javascript:alert(1)">x</a>');
  assert.ok(!/javascript:/i.test(out), 'javascript: 제거');
});

test('sanitize: 신뢰 iframe(youtube) 보존', () => {
  const out = sanitizeHtmlContent('<iframe src="https://www.youtube.com/embed/abc"></iframe>');
  assert.match(out, /youtube\.com\/embed\/abc/, '신뢰 origin iframe 유지');
});

test('sanitize: 비신뢰 iframe 제거', () => {
  const out = sanitizeHtmlContent('<iframe src="https://evil.example/x"></iframe>');
  assert.ok(!/evil\.example/.test(out), '비신뢰 iframe 제거');
});

test('weak fallback: dompurify 미설치 → 정확히 1회 warn, 메시지 형식 확인', () => {
  // 위 테스트들에서 sanitize가 여러 번 호출됐지만 경고는 1회뿐이어야 한다.
  const s = createSanitizer();
  s('<b>extra-1</b>');
  s('<b>extra-2</b>');
  const warned = warnLog.filter((m) => /isomorphic-dompurify/.test(m));
  assert.equal(warned.length, 1, '약한 폴백 경고는 프로세스당 정확히 1회');
  assert.match(warned[0], /정규식 기반 폴백/);
});

// ── R4: 강화된 방어 벡터 ──

test('R4: 무따옴표 javascript: 프로토콜 무력화', () => {
  const out = sanitizeHtmlContent('<a href=javascript:alert(1)>x</a>');
  assert.ok(!/javascript:/i.test(out), '무따옴표 javascript: 제거');
});

test('R4: xlink:href javascript: 무력화 (확장 속성명)', () => {
  const out = sanitizeHtmlContent('<a xlink:href="javascript:alert(1)">x</a>');
  assert.ok(!/javascript:/i.test(out), 'xlink:href 차단');
});

test('R4: iframe srcdoc 속성 제거 (신뢰 origin이어도)', () => {
  const out = sanitizeHtmlContent(
    '<iframe src="https://www.youtube.com/embed/x" srcdoc="<img src=q onerror=alert(1)>"></iframe>',
  );
  assert.match(out, /youtube\.com\/embed\/x/, '신뢰 iframe 유지');
  assert.ok(!/srcdoc/i.test(out), 'srcdoc 속성 제거');
});

test('R4: 위험 토큰 style 속성 제거, 정상 style 보존', () => {
  const bad = sanitizeHtmlContent('<div style="background:url(javascript:alert(1))">x</div>');
  assert.ok(!/javascript:/i.test(bad), '위험 style 제거');
  const ok = sanitizeHtmlContent('<p style="color:red">ok</p>');
  assert.match(ok, /style="color:red"/, '정상 style 보존');
});

test('R4: 공백/개행 난독화 java\\nscript: 무력화', () => {
  const out = sanitizeHtmlContent('<a href="java\nscript:alert(1)">x</a>');
  assert.ok(
    !/j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i.test(out),
    '난독화된 javascript: 제거',
  );
});

test('R4: 정상 링크/콘텐츠는 영향 없음 (회귀 가드)', () => {
  const out = sanitizeHtmlContent('<p>hello</p><a href="https://ok.example/post">link</a>');
  assert.match(out, /<p>hello<\/p>/);
  assert.match(out, /href="https:\/\/ok\.example\/post"/, '정상 href 보존');
});
