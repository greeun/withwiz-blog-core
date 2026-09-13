import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_THEME_DEFAULTS } from '../../dist/themes/index.mjs';

// 공개 기본 테마의 밝은 배경 위 텍스트 색 대비 회귀 가드 (WCAG 1.4.3, AA 4.5:1)

const AA = 4.5;

function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  assert.ok(m, `6자리 hex 색이 아님: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
}

/** WCAG 2.x 상대 휘도 */
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x 대비율 */
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const v = (name) => PUBLIC_THEME_DEFAULTS[`--blog-theme-default-public-${name}`];

test('contrast: WCAG 기준값 (흑백 21:1, 동일색 1:1)', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(2), '21.00');
  assert.equal(contrast('#777777', '#777777'), 1);
  assert.equal(contrast('#767676', '#ffffff').toFixed(2), '4.54');
});

for (const name of ['text', 'text-muted', 'text-dim']) {
  test(`PUBLIC_THEME_DEFAULTS: ${name} 색은 bg·bg-card 위에서 ${AA}:1 이상`, () => {
    for (const bg of ['bg', 'bg-card']) {
      const ratio = contrast(v(name), v(bg));
      assert.ok(
        ratio >= AA,
        `${name}(${v(name)}) / ${bg}(${v(bg)}) = ${ratio.toFixed(2)}:1`,
      );
    }
  });
}

test('PUBLIC_THEME_DEFAULTS: text-dim 은 text-muted 보다 어둡지 않음', () => {
  assert.ok(
    luminance(v('text-dim')) >= luminance(v('text-muted')),
    `text-dim(${v('text-dim')}) 이 text-muted(${v('text-muted')}) 보다 어두움`,
  );
});
