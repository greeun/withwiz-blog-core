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
import type { BlockData, BlockDef, BlockEditorConfig } from "../types";

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
  /** 이미지 업로드 함수 (BlockEditorProvider에 전달) */
  uploadImage?: (file: File) => Promise<{ url: string; key?: string }>;
  /** 에러 표시 함수 (BlockEditorProvider에 전달) */
  onError?: (message: string) => void;
  /** 블록 에디터 내 이미지 업로드 완료 시 key 추적 콜백 */
  onImageUploaded?: (key: string) => void;
  /** 템플릿/샘플 모드 전환 콜백 */
  onModeChange?: (mode: 'template' | 'sample') => void;
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
    uploadImage?: (file: File) => Promise<{ url: string; key?: string }>;
    onError?: (msg: string) => void;
    children: React.ReactNode;
  }>;
}

// ── 스타일 ──

const editorStyles = {
  wrapper: {
    border: "1px solid var(--blog-admin-border, #333)",
    borderRadius: "var(--blog-admin-radius, 6px)",
    overflow: "hidden",
    minHeight: 300,
  } as CSSProperties,

  fallback: {
    padding: 32,
    textAlign: "center" as const,
    color: "var(--blog-admin-text-muted, #888)",
    fontSize: 14,
    lineHeight: 1.6,
  } as CSSProperties,

  fallbackCode: {
    display: "inline-block",
    padding: "2px 8px",
    backgroundColor: "var(--blog-admin-bg-input, #ffffff)",
    borderRadius: 4,
    fontSize: 13,
    fontFamily: "var(--blog-admin-font-mono, monospace)",
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
  uploadImage,
  onError,
  onImageUploaded,
  onModeChange,
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
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--blog-admin-text-dim, #666)" }}>
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
        onImageUploaded={onImageUploaded}
        onModeChange={onModeChange}
      />
    </div>
  );

  if (BlockEditorProviderComponent) {
    return (
      <BlockEditorProviderComponent uploadImage={uploadImage} onError={onError}>
        {editorNode}
      </BlockEditorProviderComponent>
    );
  }

  return editorNode;
}

export { BlockEditorForm };
