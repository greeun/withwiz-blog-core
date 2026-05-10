"use client";

/**
 * Block Editor 확장 편집 폼 컴포넌트
 *
 * @withwiz/block-editor를 선택적으로 로드하여 textarea 대신
 * Block Editor를 사용한다. 패키지가 설치되지 않으면 에러 메시지를 표시한다.
 *
 * 이 컴포넌트는 BlogEditForm과 함께 사용하는 것이 아니라,
 * Block Editor 영역만 제공한다. 호스트가 BlogEditForm 대신 이 컴포넌트를
 * 조합하여 사용할 수 있다.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { BlockPresetConfig } from "./presets";
import type { CtaData } from "./cta-serializer";
import { embedCta, deserializeCta, stripCta } from "./cta-serializer";
import { applyPresetToBlocks } from "./presets";

// ── Block Editor 타입 (선택적 import이므로 인라인 정의) ──

/** @withwiz/block-editor의 BlockData와 호환 */
interface BlockData {
  id: number;
  type: string;
  [key: string]: unknown;
}

/** @withwiz/block-editor의 BlockDef와 호환 */
interface BlockDef {
  type: string;
  label: string;
  icon: string;
  desc?: string;
  cats?: string[];
  createEmpty: (id: number) => BlockData;
}

/** @withwiz/block-editor의 BlockEditorConfig와 호환 */
interface BlockEditorConfig {
  blocks: BlockDef[];
  marker: string;
  cssPrefix: string;
  enableDragDrop?: boolean;
  enableCategoryFilter?: boolean;
  categories?: string[];
  catClasses?: Record<string, string>;
  templates?: Record<string, Omit<BlockData, "id">[]>;
  samples?: Record<string, Omit<BlockData, "id">[]>;
}

// ── Props ──

export interface BlockEditorFormProps {
  /** 현재 content (HTML 또는 직렬화된 블록 데이터) */
  content: string;
  /** content 변경 콜백 */
  onContentChange: (content: string) => void;
  /** 현재 카테고리 (블록 필터용) */
  category: string;
  /** Block Editor 설정 */
  editorConfig: BlockEditorConfig;
  /** 블록 프리셋 (optional) */
  preset?: BlockPresetConfig;
  /** 이미지 업로드 함수 */
  onUpload?: (file: File) => Promise<{ url: string; key?: string }>;
  /** 에러 표시 함수 */
  onError?: (message: string) => void;
  /** CTA 데이터 (optional, CTA 활성화 시) */
  ctaData?: CtaData | null;
  /** CTA 변경 콜백 */
  onCtaChange?: (data: CtaData | null) => void;
  /** 추가 CSS 클래스 */
  className?: string;
  /**
   * Block Editor React 컴포넌트를 직접 주입한다.
   * 호스트가 `import { BlockEditor } from '@withwiz/block-editor'`를 전달.
   * 미제공 시 fallback 메시지를 표시한다.
   */
  BlockEditorComponent?: React.ComponentType<Record<string, unknown>>;
  /**
   * Block Editor Provider 컴포넌트를 직접 주입한다.
   * 호스트가 `import { BlockEditorProvider } from '@withwiz/block-editor'`를 전달.
   */
  BlockEditorProviderComponent?: React.ComponentType<{
    config: BlockEditorConfig;
    children: React.ReactNode;
  }>;
}

// ── 스타일 ──

const editorStyles = {
  wrapper: {
    border: "1px solid var(--blog-border, #333)",
    borderRadius: "var(--blog-radius, 6px)",
    overflow: "hidden",
    minHeight: 300,
  } as CSSProperties,

  fallback: {
    padding: 32,
    textAlign: "center" as const,
    color: "var(--blog-text-muted, #888)",
    fontSize: 14,
    lineHeight: 1.6,
  } as CSSProperties,

  fallbackCode: {
    display: "inline-block",
    padding: "2px 8px",
    backgroundColor: "var(--blog-bg-input, #141414)",
    borderRadius: 4,
    fontSize: 13,
    fontFamily: "var(--blog-font-mono, monospace)",
  } as CSSProperties,
};

/**
 * Block Editor 확장 편집 폼
 *
 * @withwiz/block-editor 컴포넌트를 props로 주입받아 렌더링한다.
 * 미주입 시 설치 안내 메시지를 표시한다.
 */
export default function BlockEditorForm({
  content,
  onContentChange,
  category,
  editorConfig,
  preset,
  onUpload,
  onError,
  ctaData,
  onCtaChange,
  className,
  BlockEditorComponent,
  BlockEditorProviderComponent,
}: BlockEditorFormProps) {
  // 프리셋 적용
  const resolvedConfig = useMemo(() => {
    if (!preset) return editorConfig;

    const filteredBlocks = applyPresetToBlocks(
      editorConfig.blocks as (BlockDef & { cats?: string[] })[],
      preset,
    );

    return {
      ...editorConfig,
      blocks: filteredBlocks,
      enableCategoryFilter: true,
      categories: Object.keys(preset.allowedBlocks),
      catClasses: preset.catClasses || editorConfig.catClasses,
      templates: preset.templates as BlockEditorConfig["templates"] || editorConfig.templates,
      samples: preset.samples as BlockEditorConfig["samples"] || editorConfig.samples,
    };
  }, [editorConfig, preset]);

  // Block Editor가 주입되지 않은 경우 fallback
  if (!BlockEditorComponent) {
    return (
      <div className={className} style={editorStyles.wrapper}>
        <div style={editorStyles.fallback}>
          <p>Block Editor를 사용하려면 다음 패키지를 설치하세요:</p>
          <p style={{ marginTop: 8 }}>
            <code style={editorStyles.fallbackCode}>npm install @withwiz/block-editor</code>
          </p>
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--blog-text-dim, #666)" }}>
            설치 후 BlockEditorComponent와 BlockEditorProviderComponent를 props로 전달하세요.
          </p>
        </div>
      </div>
    );
  }

  const editorNode = (
    <div className={className} style={editorStyles.wrapper}>
      <BlockEditorComponent
        content={content}
        onChange={onContentChange}
        category={category}
        config={resolvedConfig}
        onUpload={onUpload}
        onError={onError}
      />
    </div>
  );

  // Provider가 있으면 감싸서 렌더링
  if (BlockEditorProviderComponent) {
    return (
      <BlockEditorProviderComponent config={resolvedConfig}>
        {editorNode}
      </BlockEditorProviderComponent>
    );
  }

  return editorNode;
}

export { BlockEditorForm };
