/**
 * Block Editor 통합 컴포넌트 barrel export
 *
 * @withwiz/block-editor가 선택적 peer dependency이므로
 * 이 모듈은 별도 엔트리포인트로 제공된다.
 */
export { default as BlockEditorForm } from './BlockEditorForm';
export type { BlockEditorFormProps } from './BlockEditorForm';

export {
  serializeCta,
  deserializeCta,
  embedCta,
  stripCta,
} from './cta-serializer';
export type { CtaData } from './cta-serializer';

export {
  createBlockPreset,
  applyPresetToBlocks,
  DEFAULT_BLOCK_TYPES,
} from './presets';
export type {
  BlockPresetConfig,
  BlockPresetItem,
} from './presets';
