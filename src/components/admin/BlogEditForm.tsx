"use client";

/**
 * 블로그 편집 폼 컴포넌트
 */

import { useRef, useState, useEffect, useCallback, useMemo, type DragEvent } from "react";
import slugify from "slugify";
import { BlockEditor, BlockEditorProvider } from "@withwiz/block-editor";
import "@withwiz/block-editor/styles/editor.css";
import { BLOG_PRESET } from "../../presets/block-editor";
import type { BlogConfig, Attachment } from "../../types";
import { resolveI18n } from "../../i18n";
import type { BlogFormData } from "./constants";
import { BLOG_DEFAULTS } from "../../utils/defaults";
import { formatDateOnly } from "./constants";
import { formatFileSize, getFileIcon } from "../../utils/file-helpers";
import { SLUG_PATTERN } from "../../utils/slug";

export type SlugStatus = "idle" | "checking" | "available" | "duplicate" | "invalid";

// ── 설정 가능한 인증 fetch 래퍼 팩토리 (하드코딩 경로 제거) ──

/** BlogConfig 기반 인증 경로를 사용하는 fetch 래퍼 생성 */
function createBlogFetch(config: BlogConfig) {
  const refreshPath = config.authRefreshPath ?? BLOG_DEFAULTS.authRefreshPath;
  const loginPath = config.loginPath ?? BLOG_DEFAULTS.loginPath;

  return async function blogFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, { ...options, credentials: "same-origin" });
    if (res.status === 401 && typeof window !== "undefined") {
      try {
        const refreshRes = await fetch(refreshPath, {
          method: "POST",
          credentials: "same-origin",
        });
        if (refreshRes.ok) {
          return fetch(url, { ...options, credentials: "same-origin" });
        }
      } catch { /* 무시 */ }
      window.location.href = loginPath;
    }
    return res;
  };
}

// ── 자체 구현: 이미지 드롭존 ──

const ALLOWED_IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface UseImageDropZoneOptions {
  uploadEndpoint: string;
  onUpload: (result: { url: string; key: string }) => void;
  onKeyTracked?: (key: string) => void;
  /** 인증 fetch 래퍼 */
  fetchFn: (url: string, options?: RequestInit) => Promise<Response>;
  /** i18n 번역 사전 */
  t: ReturnType<typeof resolveI18n>;
}

/** 이미지 드래그앤드롭 업로드 훅 (자체 구현, pms 의존 없음) */
function useImageDropZone(options: UseImageDropZoneOptions) {
  const { uploadEndpoint, onUpload, onKeyTracked, fetchFn, t } = options;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isResizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const processFile = useCallback(async (file: File) => {
    if (!ALLOWED_IMG_TYPES.includes(file.type)) {
      setError(t.adminUnsupportedFileType);
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchFn(uploadEndpoint, { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        onUpload(json.data);
        if (json.data.key) onKeyTracked?.(json.data.key);
      } else {
        setError(json.error?.message || t.adminUploadFailed);
      }
    } catch {
      setError(t.adminFileUploadError);
    } finally {
      setIsUploading(false);
    }
  }, [uploadEndpoint, onUpload, onKeyTracked, fetchFn, t]);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types.includes("Files")) setIsDragOver(true);
  }, []);
  const onDragOver = useCallback((e: DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);
  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) processFile(files[0]);
    else setError(t.adminImageOnlyAllowed);
  }, [processFile, t]);

  const handleFileInput = useCallback(async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (files.length > 0) await processFile(files[0]);
  }, [processFile]);

  return {
    isDragOver, isUploading, isResizing, error,
    dragHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
    handleFileInput,
  };
}

// ── 자체 구현: ToggleSwitch ──

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="blog-toggle">
      <span className={`blog-toggle-track ${checked ? "on" : ""}`}>
        <span className="blog-toggle-thumb" />
      </span>
      {label && <span className="blog-toggle-label">{label}</span>}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
    </label>
  );
}

// ── Props ──

interface Props {
  form: BlogFormData;
  setForm: React.Dispatch<React.SetStateAction<BlogFormData>>;
  updateField: <K extends keyof BlogFormData>(key: K, value: BlogFormData[K]) => void;
  isNew: boolean;
  selectedId: string | null;
  saving: boolean;
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
  onModeChange: (m: "template" | "sample") => void;
  trackUploadedKey: (key: string) => void;
  slugStatusRef?: React.MutableRefObject<SlugStatus>;
  config: BlogConfig;
  /** 블록 에디터 프리셋 (미제공 시 기본 BLOG_PRESET 사용) */
  editorPreset?: import("@withwiz/block-editor").BlockEditorConfig;
  /** 이미지 URL 변환기 (예: variant URL 생성) */
  imageUrlTransformer?: (url: string, size: string) => string;
  /** 에러 알림 콜백 */
  onError?: (msg: string) => void;
  /** 성공 알림 콜백 */
  onSuccess?: (msg: string) => void;
}

export default function BlogEditForm({
  form, setForm, updateField,
  isNew, selectedId,
  saving, loading,
  onSave, onCancel,
  onModeChange, trackUploadedKey, slugStatusRef,
  config, editorPreset,
  onError,
}: Props) {
  // ── 설정 기반 인증 fetch 래퍼 ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const blogFetch = useMemo(() => createBlogFetch(config), [config.authRefreshPath, config.loginPath]);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [attachUploading, setAttachUploading] = useState(false);

  // i18n 헬퍼 — resolveI18n으로 fallback 채워진 완전 객체 사용
  const i18n = resolveI18n(config.i18n);
  const maxAttachments = config.maxAttachments ?? 5;
  const categories = Object.entries(config.categories).map(([value, theme]) => ({
    value,
    label: theme.label,
  }));
  const ctaCategories = config.enableCta !== false
    ? Object.keys(config.categories)
    : [];

  // 에러/성공 알림 (호스트가 제공하지 않으면 console 사용)
  const notify = {
    error: onError || ((m: string) => console.error(m)),
  };

  /* ─── Slug ─── */
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const slugUserEditedRef = useRef(!isNew);
  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalSlugRef = useRef<string>("");
  const [host, setHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setHost(window.location.host);
  }, []);

  useEffect(() => {
    if (slugStatusRef) slugStatusRef.current = slugStatus;
  }, [slugStatus, slugStatusRef]);

  const checkSlug = useCallback((slug: string) => {
    if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current);
    if (!slug) { setSlugStatus("idle"); return; }
    if (!SLUG_PATTERN.test(slug)) { setSlugStatus("invalid"); return; }

    // 편집 모드: 기존 slug와 동일하면 중복 확인 불필요
    if (!isNew && slug === originalSlugRef.current) {
      setSlugStatus("available");
      return;
    }

    setSlugStatus("checking");
    slugCheckTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (!isNew && selectedId) params.set("excludeId", selectedId);
        const res = await blogFetch(`${config.adminApiBasePath}/slug-check?${params}`);
        const json = await res.json();
        setSlugStatus(json.data?.available ? "available" : "duplicate");
      } catch {
        setSlugStatus("idle");
      }
    }, 500);
  }, [isNew, selectedId, config.adminApiBasePath]);

  useEffect(() => {
    if (!isNew && form.slug) {
      originalSlugRef.current = form.slug;
      setSlugStatus("available");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    slugUserEditedRef.current = !isNew;
  }, [isNew, selectedId]);

  useEffect(() => {
    if (!isNew || slugUserEditedRef.current) return;
    const generated = slugify(form.title || "", { lower: true, strict: true });
    if (generated) {
      setForm((prev) => (prev.slug === generated ? prev : { ...prev, slug: generated }));
      checkSlug(generated);
    } else {
      setForm((prev) => (prev.slug === "" ? prev : { ...prev, slug: "" }));
      setSlugStatus("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  const handleSlugChange = (value: string) => {
    slugUserEditedRef.current = true;
    const sanitized = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    updateField("slug", sanitized);
    checkSlug(sanitized);
  };

  /* ─── 첨부파일 ─── */
  const handleAttachUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (form.attachments.length + files.length > maxAttachments) {
      notify.error(`${i18n.adminAttachmentMaxExceeded} (${maxAttachments})`);
      e.target.value = "";
      return;
    }
    setAttachUploading(true);
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      const fd = new window.FormData();
      fd.append("file", file);
      fd.append("type", "attachment");
      try {
        const res = await blogFetch(config.uploadEndpoint, { method: "POST", body: fd });
        const json = await res.json();
        if (json.success) {
          newAttachments.push({
            name: file.name, url: json.data.url, key: json.data.key,
            size: json.data.size, type: file.type,
          });
          trackUploadedKey(json.data.key);
        } else {
          notify.error(`${file.name}: ${json.error?.message || i18n.adminUploadFailed}`);
        }
      } catch {
        notify.error(`${file.name}: ${i18n.adminFileUploadError}`);
      }
    }
    if (newAttachments.length > 0) {
      setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
    }
    setAttachUploading(false);
    e.target.value = "";
  };

  const handleAttachRemove = (index: number) => {
    setForm((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  /* ─── 대표 이미지 ─── */
  const coverDrop = useImageDropZone({
    uploadEndpoint: config.uploadEndpoint,
    onUpload: (result) => {
      setForm((prev) => ({ ...prev, coverImageUrl: result.url, coverImageKey: result.key }));
    },
    onKeyTracked: trackUploadedKey,
    fetchFn: blogFetch,
    t: i18n,
  });

  /* ─── 블록 에디터 이미지 업로드 ─── */
  const uploadImage = useCallback(async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await blogFetch(config.uploadEndpoint, { method: "POST", body: fd });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || i18n.adminUploadFailed);
    return json.data as { url: string; key?: string };
  }, [config.uploadEndpoint]);

  const onEditorError = useCallback((msg: string) => notify.error(msg), [notify]);

  const canSave =
    !saving &&
    !!form.title.trim() &&
    !!form.content.trim() &&
    slugStatus !== "duplicate" &&
    slugStatus !== "invalid" &&
    slugStatus !== "checking";

  if (loading) {
    return <div className="blog-loading">{i18n.adminLoading}</div>;
  }

  return (
    <>
      {/* 툴바 */}
      <div className="blog-edit-toolbar">
        <div className="blog-edit-toolbar-right">
          {isNew && (
            <button type="button" className="blog-btn-ghost" onClick={() => onModeChange("sample")}>
              {i18n.adminSampleButton}
            </button>
          )}
        </div>
      </div>

      {/* 제목 & 토글 */}
      <div className="blog-edit-title-row">
        <h2 className="blog-edit-page-title">
          {isNew ? i18n.adminCreateTitle : i18n.adminEditTitle}
        </h2>
        <div className="blog-edit-title-actions">
          {config.enableFeatured !== false && (
            <ToggleSwitch
              checked={form.featured}
              onChange={(v) => updateField("featured", v)}
              label={i18n.adminFeaturedLabel}
            />
          )}
          <ToggleSwitch
            checked={form.published}
            onChange={(v) => updateField("published", v)}
            label={i18n.adminPublishedLabel}
          />
          <button className="blog-btn-ghost" onClick={onCancel}>
            {i18n.adminCancelButton}
          </button>
          <button className="blog-btn-save" onClick={onSave} disabled={!canSave}>
            {saving ? i18n.adminSaving : i18n.adminSaveButton}
          </button>
        </div>
      </div>

      {/* Slug URL */}
      <div className="blog-slug-bar">
        <span className="blog-slug-prefix">{host}{config.basePath}/</span>
        <input
          className="blog-slug-input"
          value={form.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder={i18n.adminSlugAutoGenerated}
          spellCheck={false}
        />
        <span className={`blog-slug-status blog-slug-status--${slugStatus}`}>
          {slugStatus === "checking" && <span className="blog-slug-spinner" />}
          {slugStatus === "available" && "\u2713"}
          {slugStatus === "duplicate" && i18n.adminSlugDuplicate}
          {slugStatus === "invalid" && i18n.adminSlugInvalid}
        </span>
      </div>

      {/* 카테고리 */}
      <div className="blog-cat-tabs">
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`blog-cat-tab ${c.value.toLowerCase()} ${form.category === c.value ? "on" : ""}`}
            onClick={() => updateField("category", c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 발행일시 */}
      <div className="blog-section">
        <div className="blog-section-title">{i18n.adminPublishedAtLabel}</div>
        <input
          type="datetime-local"
          value={form.publishedAt}
          onChange={(e) => updateField("publishedAt", e.target.value)}
          style={{ width: "100%", padding: "4px 6px", fontSize: 11, border: "1px solid rgba(0,0,0,0.15)", background: "#fff" }}
        />
      </div>

      {/* 기본 정보 */}
      <div className="blog-section">
        <div className="blog-section-title">
          {i18n.adminBasicInfoLabel} <span className="blog-section-tag">{i18n.adminRequiredLabel}</span>
        </div>
        <div className="blog-field">
          <input
            className="blog-input blog-title-input"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder={i18n.adminTitlePlaceholder}
          />
        </div>
        <div className="blog-field" style={{ marginTop: 6 }}>
          <input
            className="blog-input"
            value={form.excerpt}
            onChange={(e) => updateField("excerpt", e.target.value)}
            placeholder={i18n.adminExcerptPlaceholder}
          />
        </div>
      </div>

      {/* 대표 이미지 */}
      <div className="blog-section">
        <div className="blog-section-title">{i18n.adminCoverImageLabel}</div>
        <div
          className={`blog-cover-upload${form.coverImageUrl ? " has" : ""}${coverDrop.isDragOver ? " is-drag-over" : ""}${coverDrop.isResizing ? " is-resizing" : ""}`}
          onClick={() => !form.coverImageUrl && !coverDrop.isUploading && !coverDrop.isResizing && coverInputRef.current?.click()}
          {...coverDrop.dragHandlers}
        >
          {coverDrop.isResizing ? (
            <span>{i18n.adminImageResizing}</span>
          ) : coverDrop.isUploading ? (
            <span>{i18n.adminUploading}</span>
          ) : coverDrop.isDragOver ? (
            <span>{i18n.adminDropHere}</span>
          ) : (
            <>
              <span>{i18n.adminImageUploadButton}</span>
              <span style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{i18n.adminImageRatioHint}</span>
            </>
          )}
          {form.coverImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.coverImageUrl} alt="" />
              <button
                type="button"
                className="blog-cover-remove"
                onClick={(e) => { e.stopPropagation(); updateField("coverImageUrl", ""); updateField("coverImageKey", ""); }}
              >&times;</button>
            </>
          )}
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" onChange={async (e) => { await coverDrop.handleFileInput(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
        {coverDrop.error && <div style={{ color: "#c45", fontSize: 10, marginTop: 4 }}>{coverDrop.error}</div>}
      </div>

      {/* 콘텐츠 블록 */}
      <div className="blog-section">
        <div className="blog-section-title">
          {i18n.adminBlocksLabel} <span className="blog-section-tag">{i18n.adminBlocksTag}</span>
        </div>
        <div className="blog-block-editor-wrap">
          <BlockEditorProvider uploadImage={uploadImage} onError={onEditorError}>
            <BlockEditor
              content={form.content}
              onChange={(html: string) => updateField("content", html)}
              config={editorPreset ?? BLOG_PRESET}
              category={form.category}
              onImageUploaded={trackUploadedKey}
              onModeChange={onModeChange}
            />
          </BlockEditorProvider>
        </div>
      </div>

      {/* CTA */}
      {config.enableCta !== false && ctaCategories.includes(form.category) && (
        <div className="blog-section">
          <div className="blog-section-title">
            {i18n.adminCtaLabel} <span className="blog-section-tag">{i18n.adminOptionalLabel}</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--blog-text-dim)", marginBottom: 8, lineHeight: 1.6 }}>
            {i18n.adminCtaDescription}
          </div>
          <div className="blog-toggle-row">
            <div className={`blog-inline-toggle${form.ctaEnabled ? " on" : ""}`} onClick={() => updateField("ctaEnabled", !form.ctaEnabled)} />
            <span className="blog-toggle-label-text">{i18n.adminCtaToggle}</span>
          </div>
          <div className={`blog-cta-section${form.ctaEnabled ? "" : " disabled"}`}>
            <div className="blog-field">
              <label className="blog-field-label">{i18n.adminCtaMessageLabel}</label>
              <input className="blog-input" value={form.ctaMsg} onChange={(e) => updateField("ctaMsg", e.target.value)} placeholder={i18n.adminCtaMessagePlaceholder} />
            </div>
            <div className="blog-row-2">
              <div className="blog-field">
                <label className="blog-field-label">{i18n.adminCtaButtonLabel}</label>
                <input className="blog-input" value={form.ctaBtn} onChange={(e) => updateField("ctaBtn", e.target.value)} placeholder={i18n.adminCtaButtonPlaceholder} />
              </div>
              <div className="blog-field">
                <label className="blog-field-label">{i18n.adminCtaUrlLabel}</label>
                <input className="blog-input" value={form.ctaUrl} onChange={(e) => updateField("ctaUrl", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 첨부파일 */}
      {config.enableAttachments !== false && (
        <div className="blog-section">
          <div className="blog-section-title">
            {i18n.adminAttachmentsLabel} <span className="blog-section-tag">{i18n.adminOptionalLabel}</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--blog-text-dim)", marginBottom: 8, lineHeight: 1.6 }}>
            {i18n.adminAttachmentsHint} ({maxAttachments})
          </div>
          {form.attachments.length > 0 && (
            <div className="blog-attach-list">
              {form.attachments.map((att, i) => (
                <div key={att.key} className="blog-attach-item">
                  <span className="blog-attach-icon">{getFileIcon(att.type)}</span>
                  <span className="blog-attach-name" title={att.name}>{att.name}</span>
                  <span className="blog-attach-size">{formatFileSize(att.size)}</span>
                  <button type="button" className="blog-attach-rm" onClick={() => handleAttachRemove(i)}>&times;</button>
                </div>
              ))}
            </div>
          )}
          {form.attachments.length < maxAttachments && (
            <button
              type="button"
              className="blog-attach-add"
              onClick={() => attachInputRef.current?.click()}
              disabled={attachUploading}
            >
              {attachUploading ? i18n.adminUploading : `${i18n.adminAttachmentAddButton} (${form.attachments.length}/${maxAttachments})`}
            </button>
          )}
          <input ref={attachInputRef} type="file" multiple onChange={handleAttachUpload} style={{ display: "none" }} />
        </div>
      )}
    </>
  );
}

export { BlogEditForm };
