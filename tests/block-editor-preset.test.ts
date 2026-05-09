import { describe, it, expect, vi } from 'vitest';

// @withwiz/block-editor mock
vi.mock('@withwiz/block-editor', () => ({
  BUILT_IN_BLOCKS: [
    { type: 'paragraph' },
    { type: 'lead' },
    { type: 'subheading' },
    { type: 'img-full' },
    { type: 'quote' },
    { type: 'gallery' },
    { type: 'video' },
    { type: 'callout' },
    { type: 'infobox' },
    { type: 'stats' },
  ],
}));

import { BLOG_CAT_CLASSES, BLOG_PRESET, createBlogPreset } from '@withwiz/blog-core/presets';

describe('BLOG_CAT_CLASSES', () => {
  // BC-BE-01
  it('기본 카테고리별 CSS 클래스 매핑을 가진다', () => {
    expect(BLOG_CAT_CLASSES).toEqual({
      ONSTAGE: 'onstage',
      BACKSTAGE: 'backstage',
      PRESS: 'press',
      NOTICE: 'notice',
    });
  });
});

describe('BLOG_PRESET', () => {
  // BC-BE-02
  it('categories 배열에 4개 카테고리가 포함된다', () => {
    expect(BLOG_PRESET.categories).toEqual(['ONSTAGE', 'BACKSTAGE', 'PRESS', 'NOTICE']);
  });

  // BC-BE-03
  it('marker가 nbe-blocks:이다', () => {
    expect(BLOG_PRESET.marker).toBe('nbe-blocks:');
  });
});

describe('createBlogPreset', () => {
  // BC-BE-04
  it('빈 카테고리 배열에서 enableCategoryFilter=false를 반환한다', () => {
    const preset = createBlogPreset([]);
    expect(preset.enableCategoryFilter).toBe(false);
  });

  // BC-BE-05
  it('카테고리가 있으면 enableCategoryFilter=true를 반환한다', () => {
    const preset = createBlogPreset([
      { key: 'NEWS', cssClass: 'news', blocks: ['paragraph', 'lead'] },
    ]);
    expect(preset.enableCategoryFilter).toBe(true);
    expect(preset.categories).toEqual(['NEWS']);
  });
});
