/**
 * Block Editor 프리셋 설정 타입 및 헬퍼
 *
 * 호스트가 카테고리별로 허용할 블록 타입, 템플릿, 샘플 콘텐츠를
 * 구조화된 설정으로 정의할 수 있다.
 */

/** 블록 프리셋 설정 (카테고리별) */
export interface BlockPresetConfig {
  /** 카테고리 키 → 허용 블록 타입 목록 */
  allowedBlocks: Record<string, string[]>;
  /** 카테고리 키 → CSS 클래스 매핑 (optional) */
  catClasses?: Record<string, string>;
  /** 카테고리 키 → 빈 템플릿 (optional) */
  templates?: Record<string, BlockPresetItem[]>;
  /** 카테고리 키 → 샘플 콘텐츠 (optional) */
  samples?: Record<string, BlockPresetItem[]>;
}

/** 블록 데이터 (id 없이 — 에디터가 런타임에 id를 할당) */
export interface BlockPresetItem {
  type: string;
  text?: string;
  en?: string;
  src?: string;
  src1?: string;
  src2?: string;
  src3?: string;
  cap?: string;
  attr?: string;
  name?: string;
  role?: string;
  bio?: string;
  title?: string;
  url?: string;
  label?: string;
  q?: string;
  a?: string;
  size?: string;
  items?: Record<string, string>[];
}

/**
 * 카테고리별 블록 타입 매핑에서 BlockPresetConfig를 생성한다.
 *
 * @param categoryBlocks - 카테고리 키 → 허용 블록 타입 목록
 * @param options - 추가 설정
 * @returns BlockPresetConfig
 *
 * @example
 * ```typescript
 * const preset = createBlockPreset({
 *   news: ["paragraph", "img-full", "quote"],
 *   notice: ["paragraph", "img-inline", "callout"],
 * });
 * ```
 */
export function createBlockPreset(
  categoryBlocks: Record<string, string[]>,
  options?: {
    catClasses?: Record<string, string>;
    templates?: Record<string, BlockPresetItem[]>;
    samples?: Record<string, BlockPresetItem[]>;
  },
): BlockPresetConfig {
  return {
    allowedBlocks: categoryBlocks,
    catClasses: options?.catClasses,
    templates: options?.templates,
    samples: options?.samples,
  };
}

/** 기본 블록 타입 목록 (모든 카테고리에 공통) */
export const DEFAULT_BLOCK_TYPES = [
  "lead",
  "paragraph",
  "subheading",
  "subheading-label",
  "divider",
  "spacer",
  "img-full",
  "img-inline",
  "img-pair",
  "quote",
  "callout",
  "video",
] as const;

/**
 * 블록 정의 배열에 카테고리별 필터를 적용한다.
 *
 * @withwiz/block-editor의 BUILT_IN_BLOCKS를 받아 각 블록의 cats 필드를 설정한다.
 * 호스트가 BlockEditor의 blocks prop에 전달할 수 있다.
 *
 * @param builtInBlocks - BUILT_IN_BLOCKS 배열
 * @param preset - BlockPresetConfig
 * @returns 카테고리 필터가 적용된 블록 정의 배열
 */
export function applyPresetToBlocks<T extends { type: string; cats?: string[] }>(
  builtInBlocks: T[],
  preset: BlockPresetConfig,
): (T & { cats?: string[] })[] {
  return builtInBlocks.map((def) => {
    const cats: string[] = [];
    for (const [cat, types] of Object.entries(preset.allowedBlocks)) {
      if (types.includes(def.type)) cats.push(cat);
    }
    return cats.length > 0 ? { ...def, cats } : def;
  });
}
