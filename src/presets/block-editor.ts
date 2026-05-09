/**
 * @withwiz/block-editor 블록 에디터 프리셋
 * 기존 src/components/admin/editor/presets/news.ts를 일반화
 * 호스트 프로젝트에서 오버라이드 가능한 기본 프리셋 제공
 *
 * createBlogPreset(categories) 팩토리 함수로 카테고리별 커스텀 프리셋 생성 가능
 * BLOG_PRESET은 기본 카테고리(ONSTAGE/BACKSTAGE/PRESS/NOTICE) 프리셋
 */
import { BUILT_IN_BLOCKS } from '@withwiz/block-editor';
import type { BlockEditorConfig, BlockData } from '@withwiz/block-editor';

// ── 카테고리별 블록 타입 기본 매핑 ──

/** 기본 카테고리별 사용 가능한 블록 타입 */
const DEFAULT_CAT_BLOCKS: Record<string, string[]> = {
  ONSTAGE: [
    'lead', 'paragraph', 'subheading', 'subheading-label', 'divider', 'spacer',
    'img-full', 'img-inline', 'img-pair', 'gallery',
    'quote', 'quote-large', 'stats', 'infobox', 'callout',
    'timeline', 'video',
  ],
  BACKSTAGE: [
    'lead', 'paragraph', 'subheading', 'subheading-label', 'divider', 'spacer',
    'img-full', 'img-inline', 'img-pair', 'gallery', 'img-text',
    'quote', 'quote-large', 'callout', 'qa',
    'timeline', 'video',
  ],
  PRESS: [
    'lead', 'paragraph', 'subheading', 'subheading-label', 'divider', 'spacer',
    'img-inline', 'quote', 'callout', 'press-list',
    'timeline', 'video',
  ],
  NOTICE: [
    'lead', 'paragraph', 'subheading', 'subheading-label', 'divider', 'spacer',
    'img-full', 'img-inline', 'quote', 'quote-large',
    'stats', 'infobox', 'callout', 'numcards',
    'timeline', 'video',
  ],
};

/** 기본 카테고리별 CSS 클래스 매핑 */
const DEFAULT_CAT_CLASSES: Record<string, string> = {
  ONSTAGE: 'onstage',
  BACKSTAGE: 'backstage',
  PRESS: 'press',
  NOTICE: 'notice',
};

// ── 템플릿 ──

type TB = Omit<BlockData, 'id'>;

/** 기본 카테고리별 템플릿 블록 */
const DEFAULT_TEMPLATES: Record<string, TB[]> = {
  ONSTAGE: [
    { type: 'lead', text: '' },
    { type: 'img-full', src: '', cap: '' },
    { type: 'paragraph', text: '' },
    { type: 'subheading-label', en: '', text: '' },
    { type: 'paragraph', text: '' },
    { type: 'quote', text: '', attr: '' },
    { type: 'infobox', label: 'Performance Info', items: [
      { k: '\uC791\uD488\uBA85', v: '' }, { k: '\uC77C\uC2DC', v: '' }, { k: '\uC7A5\uC18C', v: '' },
      { k: '\uC548\uBB34/\uC5F0\uCD9C', v: '' }, { k: '\uC81C\uC791', v: '' },
    ]},
  ],
  BACKSTAGE: [
    { type: 'img-text', src: '', name: '', role: '', bio: '' },
    { type: 'qa', q: '', a: '' },
    { type: 'qa', q: '', a: '' },
    { type: 'img-pair', src1: '', src2: '', cap: '' },
    { type: 'qa', q: '', a: '' },
    { type: 'quote-large', text: '', attr: '' },
  ],
  PRESS: [
    { type: 'lead', text: '' },
    { type: 'press-list', items: [
      { src: '', date: '', title: '', ex: '', link: '' },
      { src: '', date: '', title: '', ex: '', link: '' },
      { src: '', date: '', title: '', ex: '', link: '' },
    ]},
    { type: 'callout', title: '', text: '' },
  ],
  NOTICE: [
    { type: 'paragraph', text: '' },
    { type: 'numcards', items: [
      { title: '', desc: '' }, { title: '', desc: '' }, { title: '', desc: '' },
    ]},
    { type: 'infobox', label: '\uC548\uB0B4 \uC0AC\uD56D', items: [
      { k: '', v: '' }, { k: '', v: '' }, { k: '', v: '' },
    ]},
  ],
};

// ── 샘플 데이터 ──

/**
 * 기본 카테고리별 샘플 블록 데이터 (제네릭 플레이스홀더)
 *
 * 구조(블록 종류/개수)는 유지하되, 텍스트는 호스트 프로젝트와 무관한
 * 일반 플레이스홀더 문구로 구성한다. 호스트가 자체 샘플을 주입하려면
 * `createBlogPreset(categories, { samples: ... })`에 samples를 전달한다.
 */
const DEFAULT_SAMPLES: Record<string, TB[]> = {
  ONSTAGE: [
    { type: 'lead', text: '샘플 리드 문단입니다. 공연의 핵심 메시지를 한두 문장으로 요약합니다.' },
    { type: 'paragraph', text: '샘플 본문 문단입니다. 공연 일정과 주요 특징을 자세히 설명합니다.' },
    { type: 'stats', items: [{ num: '00', label: '샘플 지표' }, { num: '00+', label: '샘플 지표' }, { num: '1st', label: '샘플 지표' }] },
    { type: 'subheading-label', en: 'Sample Section Label', text: '샘플 부제목' },
    { type: 'img-full', src: '', cap: '샘플 이미지 캡션' },
    { type: 'paragraph', text: '샘플 본문 문단입니다.' },
    { type: 'quote', text: '샘플 인용 문구입니다.', attr: '— 샘플 출처' },
    { type: 'subheading', text: '샘플 섹션 제목' },
    { type: 'paragraph', text: '샘플 본문 문단입니다.' },
    { type: 'callout', title: '샘플 콜아웃 제목', text: '샘플 콜아웃 본문입니다.' },
    { type: 'quote-large', text: '샘플 대형 인용 문구입니다.', attr: '— 샘플 출처' },
    { type: 'infobox', label: 'Performance Info', items: [
      { k: '작품명', v: '샘플 작품명' },
      { k: '원작', v: '샘플 원작 정보' },
      { k: '안무/연출', v: '샘플 크리에이터' },
      { k: '제작', v: '샘플 제작사' },
      { k: '일시', v: '추후 공지' },
      { k: '장소', v: '추후 공지' },
    ]},
  ],
  BACKSTAGE: [
    { type: 'img-text', src: '', name: '샘플 이름', role: '샘플 역할', bio: '샘플 약력 또는 소개 문구입니다.' },
    { type: 'qa', q: '샘플 질문 1', a: '샘플 답변 1입니다.' },
    { type: 'qa', q: '샘플 질문 2', a: '샘플 답변 2입니다.' },
    { type: 'img-pair', src1: '', src2: '', cap: '샘플 이미지 캡션' },
    { type: 'qa', q: '샘플 질문 3', a: '샘플 답변 3입니다.' },
    { type: 'quote-large', text: '샘플 대형 인용 문구입니다.', attr: '— 샘플 출처' },
    { type: 'qa', q: '샘플 질문 4', a: '샘플 답변 4입니다.' },
    { type: 'video', url: '', cap: '샘플 영상 캡션' },
  ],
  PRESS: [
    { type: 'lead', text: '샘플 리드 문단입니다. 보도 개요를 한두 문장으로 요약합니다.' },
    { type: 'press-list', items: [
      { src: '샘플 매체', date: '0000. 00. 00', title: '샘플 기사 제목 1', ex: '샘플 기사 발췌 1', link: '#' },
      { src: '샘플 매체', date: '0000. 00. 00', title: '샘플 기사 제목 2', ex: '샘플 기사 발췌 2', link: '#' },
      { src: '샘플 매체', date: '0000. 00. 00', title: '샘플 기사 제목 3', ex: '샘플 기사 발췌 3', link: '#' },
    ]},
    { type: 'callout', title: '', text: '샘플 콜아웃 본문입니다.' },
  ],
  NOTICE: [
    { type: 'paragraph', text: '샘플 공지 본문 문단입니다.' },
    { type: 'numcards', items: [
      { title: '샘플 카드 제목 1', desc: '샘플 카드 설명 1입니다.' },
      { title: '샘플 카드 제목 2', desc: '샘플 카드 설명 2입니다.' },
      { title: '샘플 카드 제목 3', desc: '샘플 카드 설명 3입니다.' },
    ]},
    { type: 'infobox', label: 'Performance Info', items: [
      { k: '작품명', v: '샘플 작품명' },
      { k: '일시', v: '추후 공지' },
      { k: '장소', v: '추후 공지' },
    ]},
  ],
};

// ── 내부 헬퍼: 카테고리에 맞게 블록 정의에 cats를 부여 ──

function buildBlogBlocks(catBlocks: Record<string, string[]>) {
  return BUILT_IN_BLOCKS.map((def) => {
    const cats: string[] = [];
    for (const [cat, types] of Object.entries(catBlocks)) {
      if (types.includes(def.type)) cats.push(cat);
    }
    return cats.length > 0 ? { ...def, cats } : def;
  });
}

// ── 프리셋 팩토리 ──

/** 카테고리 설정 */
export interface CategoryConfig {
  /** 카테고리 키 (예: "ONSTAGE") */
  key: string;
  /** CSS 클래스 (예: "onstage") */
  cssClass: string;
  /** 사용 가능한 블록 타입 (미제공 시 모든 블록 허용) */
  blocks?: string[];
  /** 템플릿 블록 (미제공 시 빈 배열) */
  template?: TB[];
  /** 샘플 블록 (미제공 시 빈 배열) */
  sample?: TB[];
}

/** createBlogPreset 옵션 */
export interface CreateBlogPresetOptions {
  /**
   * 카테고리별 샘플 블록 오버라이드.
   *
   * CategoryConfig.sample과 동일한 역할이지만, 호스트가 샘플만 선택적으로 주입할 때
   * 사용할 수 있는 보조 채널이다. CategoryConfig.sample이 제공되면 우선한다.
   */
  samples?: Record<string, TB[]>;
}

/**
 * 카테고리 설정에 따라 블록 에디터 프리셋을 생성한다.
 * 호스트 프로젝트에서 독자적인 카테고리 체계를 사용할 때 이 팩토리를 사용한다.
 *
 * @param categories - 카테고리 설정 배열
 * @param options - 추가 옵션 (샘플 오버라이드 등)
 * @returns BlockEditorConfig 프리셋
 */
export function createBlogPreset(
  categories: CategoryConfig[],
  options?: CreateBlogPresetOptions,
): BlockEditorConfig {
  const catBlocks: Record<string, string[]> = {};
  const catClasses: Record<string, string> = {};
  const templates: Record<string, TB[]> = {};
  const samples: Record<string, TB[]> = { ...(options?.samples ?? {}) };

  for (const cat of categories) {
    catClasses[cat.key] = cat.cssClass;
    if (cat.blocks) catBlocks[cat.key] = cat.blocks;
    if (cat.template) templates[cat.key] = cat.template;
    // CategoryConfig.sample이 제공되면 options.samples보다 우선한다.
    if (cat.sample) samples[cat.key] = cat.sample;
  }

  // 블록 정의에 카테고리 분류 적용 (catBlocks가 없으면 모든 블록 허용)
  const blocks = Object.keys(catBlocks).length > 0
    ? buildBlogBlocks(catBlocks)
    : BUILT_IN_BLOCKS;

  return {
    blocks,
    marker: 'nbe-blocks:',
    cssPrefix: 'nbe-pvb',
    enableDragDrop: true,
    enableCategoryFilter: Object.keys(catBlocks).length > 0,
    categories: categories.map((c) => c.key),
    catClasses,
    templates: Object.keys(templates).length > 0 ? templates : undefined,
    samples: Object.keys(samples).length > 0 ? samples : undefined,
  };
}

// ── 카테고리 비종속 export ──

/**
 * 카테고리 분류가 부여되지 않은 기본 블록 목록.
 *
 * 호스트가 `createBlogPreset(...)`에 카테고리 정보를 넘기지 않거나 일반 fallback이
 * 필요한 경우에 사용한다. 모든 BUILT_IN_BLOCKS을 그대로 노출한다.
 */
export const DEFAULT_BLOCKS = BUILT_IN_BLOCKS;

/**
 * 카테고리 키 배열로부터 카테고리별 블록 매핑을 생성한다.
 *
 * 알려진 키(ONSTAGE/BACKSTAGE/PRESS/NOTICE)는 기본 매핑을 사용하고,
 * 그 외 키는 모든 BUILT_IN_BLOCKS을 허용한다.
 */
export function createCategoryBlocks(categories: string[]): Record<string, string[]> {
  const allTypes = BUILT_IN_BLOCKS.map((b) => b.type);
  const result: Record<string, string[]> = {};
  for (const key of categories) {
    result[key] = DEFAULT_CAT_BLOCKS[key] ?? allTypes;
  }
  return result;
}

// ── 기존 호환 Export ──

/** 카테고리별 CSS 클래스 매핑 (기본값) */
export const BLOG_CAT_CLASSES: Record<string, string> = DEFAULT_CAT_CLASSES;

let blogPresetWarningEmitted = false;
function emitBlogPresetWarning(): void {
  if (blogPresetWarningEmitted) return;
  blogPresetWarningEmitted = true;
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[blog-core] BLOG_PRESET은 deprecated입니다. ' +
        '호스트 카테고리에 맞춰 createBlogPreset(categoryConfigs)를 사용하세요. ' +
        'BLOG_PRESET은 ONSTAGE/BACKSTAGE/PRESS/NOTICE 4개 카테고리를 가정합니다.',
    );
  }
}

/**
 * 블로그 기본 블록 에디터 프리셋 (ONSTAGE/BACKSTAGE/PRESS/NOTICE).
 *
 * @deprecated 호스트 프로젝트는 자체 카테고리에 맞춰 `createBlogPreset(categories)`를 호출해야 합니다.
 *             BLOG_PRESET은 dts-ballet 프로젝트 호환을 위해 유지되며, 처음 접근 시 1회 경고를 출력합니다.
 */
export const BLOG_PRESET: BlockEditorConfig = new Proxy(
  {
    blocks: buildBlogBlocks(DEFAULT_CAT_BLOCKS),
    marker: 'nbe-blocks:',
    cssPrefix: 'nbe-pvb',
    enableDragDrop: true,
    enableCategoryFilter: true,
    categories: ['ONSTAGE', 'BACKSTAGE', 'PRESS', 'NOTICE'],
    catClasses: DEFAULT_CAT_CLASSES,
    templates: DEFAULT_TEMPLATES,
    samples: DEFAULT_SAMPLES,
  } as BlockEditorConfig,
  {
    get(target, prop, receiver) {
      emitBlogPresetWarning();
      return Reflect.get(target, prop, receiver);
    },
  },
);
