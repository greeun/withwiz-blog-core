import { describe, it, expect } from 'vitest';
import {
  hEsc,
  serializeCta,
  deserializeCta,
  stripCtaFromContent,
  extractDisplayHtml,
  formatDateOnly,
  createEmptyForm,
  getCatClass,
  getCatLabel,
} from '@withwiz/blog-core/components/admin';
import type { BlogConfig } from '@withwiz/blog-core/types';

/** 테스트용 최소 BlogConfig */
const mockConfig: BlogConfig = {
  categories: {
    NOTICE: {
      key: 'notice',
      main: '#000',
      heroColor: '0,0,0',
      bgTint: '#fff',
      bgQuote: '#eee',
      border: '#ccc',
      divider: '#ddd',
      label: '공지사항',
    },
    PRESS: {
      key: 'press',
      main: '#111',
      heroColor: '1,1,1',
      bgTint: '#fff',
      bgQuote: '#eee',
      border: '#ccc',
      divider: '#ddd',
      label: '보도자료',
    },
  },
  basePath: '/news',
  adminBasePath: '/admin/news',
  apiBasePath: '/api/news',
  adminApiBasePath: '/api/admin/news',
  modelName: 'news',
  uploadEndpoint: '/api/upload',
};

describe('hEsc', () => {
  // BC-C-01
  it('&를 &amp;로 이스케이프한다', () => {
    expect(hEsc('a&b')).toBe('a&amp;b');
  });

  // BC-C-02
  it('<를 &lt;로 이스케이프한다', () => {
    expect(hEsc('a<b')).toBe('a&lt;b');
  });

  // BC-C-03
  it('>를 &gt;로 이스케이프한다', () => {
    expect(hEsc('a>b')).toBe('a&gt;b');
  });

  // BC-C-04
  it('빈 문자열을 그대로 반환한다', () => {
    expect(hEsc('')).toBe('');
  });

  // BC-C-05
  it('falsy 값을 빈 문자열로 반환한다', () => {
    expect(hEsc(null as unknown as string)).toBe('');
    expect(hEsc(undefined as unknown as string)).toBe('');
  });
});

describe('serializeCta / deserializeCta 라운드트립', () => {
  // BC-C-06
  it('CTA 데이터를 직렬화 후 역직렬화하면 원본과 동일하다', () => {
    const cta = { enabled: true, msg: '구독하세요', btn: '구독', url: 'https://example.com' };
    const serialized = serializeCta(cta);
    const deserialized = deserializeCta(serialized);
    expect(deserialized).toEqual(cta);
  });
});

describe('deserializeCta', () => {
  // BC-C-07
  it('마커 없는 콘텐츠에서 enabled=false를 반환한다', () => {
    const result = deserializeCta('<p>일반 콘텐츠</p>');
    expect(result.enabled).toBe(false);
  });

  // BC-C-08
  it('손상된 base64에서 fallback을 반환한다', () => {
    const result = deserializeCta('<!-- nbe-cta:invalid-base64-!!! -->');
    expect(result.enabled).toBe(false);
  });
});

describe('stripCtaFromContent', () => {
  // BC-C-09
  it('CTA 마커 라인을 제거한다', () => {
    const content = '<p>본문</p>\n<!-- nbe-cta:abc123 -->';
    const result = stripCtaFromContent(content);
    expect(result).toBe('<p>본문</p>');
  });

  // BC-C-10
  it('CTA HTML 블록을 제거한다', () => {
    const content = '<p>본문</p><!-- nbe-cta-start --><div>CTA</div><!-- nbe-cta-end -->';
    const result = stripCtaFromContent(content);
    expect(result).toBe('<p>본문</p>');
  });

  // BC-C-11
  it('마커 없으면 원본을 반환한다', () => {
    const content = '<p>일반 콘텐츠</p>';
    expect(stripCtaFromContent(content)).toBe(content);
  });
});

describe('extractDisplayHtml', () => {
  // BC-C-12
  it('nbe-blocks 마커 이전 HTML만 반환한다', () => {
    const content = '<p>표시용</p>\n<!-- nbe-blocks:data -->';
    expect(extractDisplayHtml(content)).toBe('<p>표시용</p>');
  });

  // BC-C-13
  it('마커 없으면 전체를 반환한다', () => {
    const content = '<p>전체 콘텐츠</p>';
    expect(extractDisplayHtml(content)).toBe(content);
  });
});

describe('formatDateOnly', () => {
  // BC-C-14
  it('null을 대시(-)로 반환한다', () => {
    expect(formatDateOnly(null)).toBe('-');
  });

  // BC-C-15
  it('유효 날짜를 YYYY.MM.DD 형식으로 포맷한다', () => {
    const d = new Date(2025, 5, 15);
    expect(formatDateOnly(d.toISOString())).toBe('2025.06.15');
  });
});

describe('createEmptyForm', () => {
  // BC-C-16
  it('첫 번째 카테고리를 기본값으로 사용한다', () => {
    const form = createEmptyForm(mockConfig);
    expect(form.category).toBe('NOTICE');
  });

  // BC-C-17
  it('빈 categories에서 category를 빈 문자열로 설정한다', () => {
    const emptyConfig = { ...mockConfig, categories: {} };
    const form = createEmptyForm(emptyConfig);
    expect(form.category).toBe('');
  });
});

describe('getCatClass', () => {
  // BC-C-18
  it('config에 있는 카테고리의 key를 반환한다', () => {
    expect(getCatClass('NOTICE', mockConfig)).toBe('notice');
  });

  // BC-C-19
  it('config에 없는 카테고리를 toLowerCase로 fallback한다', () => {
    expect(getCatClass('UNKNOWN', mockConfig)).toBe('unknown');
  });
});

describe('getCatLabel', () => {
  // BC-C-20
  it('config에 있는 카테고리의 label을 반환한다', () => {
    expect(getCatLabel('NOTICE', mockConfig)).toBe('공지사항');
  });

  // BC-C-21
  it('config에 없는 카테고리를 그대로 반환한다', () => {
    expect(getCatLabel('UNKNOWN', mockConfig)).toBe('UNKNOWN');
  });
});
