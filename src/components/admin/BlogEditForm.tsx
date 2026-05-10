'use client';

/**
 * 블로그 편집 폼 컴포넌트
 *
 * 제목, slug(자동 생성/중복 체크), 카테고리, 본문(textarea), 요약,
 * 대표 이미지 드롭존, 첨부파일 관리, CTA, 공개/추천 토글, 발행일시,
 * 태그 피커를 제공한다.
 *
 * API 계약:
 *   GET    {adminApiBasePath}/posts/{id}
 *   POST   {adminApiBasePath}/posts
 *   PUT    {adminApiBasePath}/posts/{id}
 *   GET    {adminApiBasePath}/posts/slug-check?slug=xxx&excludeId=xxx
 *   POST   {uploadEndpoint}  (multipart/form-data)
 */

import {
  useCallback, useEffect, useRef, useState, useMemo,
  type CSSProperties, type DragEvent, type ChangeEvent,
} from 'react';
import slugify from 'slugify';
import type { Attachment, BlogListItem, BlogDetail } from '../../types/blog';
import type { BlogEditFormProps, BlogFormData, SlugStatus } from './types';
import { resolveI18n } from '../../i18n';
import { SLUG_PATTERN } from '../../utils/slug';
import { formatFileSize, getFileIcon } from '../../utils/file-helpers';
import { toLocalDatetime } from '../../utils/date';
import { s, rootVars } from './styles';
import TagPicker from './TagPicker';

/** fetch 래퍼 */
function apiFetch(
  url: string,
  authHeaders?: Record<string, string>,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: { ...options.headers, ...authHeaders },
  });
}

// ── 빈 폼 팩토리 ──

function createEmptyForm(categories: Record<string, unknown>): BlogFormData {
  const firstCategory = Object.keys(categories)[0] || '';
  return {
    title: '',
    slug: '',
    category: firstCategory,
    content: '',
    excerpt: '',
    coverImageUrl: '',
    coverImageKey: '',
    attachments: [],
    featured: false,
    published: false,
    publishedAt: '',
    tagIds: [],
    ctaEnabled: false,
    ctaMsg: '',
    ctaBtn: '',
    ctaUrl: '',
  };
}

// ── 허용 이미지 타입 ──
const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ── 스타일 ──

const ef = {
  form: {
    maxWidth: 800,
  } as CSSProperties,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  } as CSSProperties,

  slugRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as CSSProperties,

  slugStatus: (status: SlugStatus): CSSProperties => {
    const colors: Record<SlugStatus, string> = {
      idle: 'var(--blog-text-dim)',
      checking: 'var(--blog-warning)',
      available: 'var(--blog-success)',
      duplicate: 'var(--blog-danger)',
      invalid: 'var(--blog-danger)',
    };
    return { fontSize: 11, color: colors[status], marginTop: 4 };
  },

  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  } as CSSProperties,

  coverPreview: {
    maxWidth: '100%',
    maxHeight: 200,
    objectFit: 'cover' as const,
    borderRadius: 'var(--blog-radius-sm)',
    marginTop: 8,
  } as CSSProperties,

  coverRemove: {
    ...s.btnDanger,
    ...s.btnSmall,
    marginTop: 8,
  } as CSSProperties,

  attachList: {
    marginTop: 8,
  } as CSSProperties,

  attachItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    fontSize: 13,
    borderBottom: '1px solid var(--blog-border)',
  } as CSSProperties,

  attachRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--blog-danger)',
    cursor: 'pointer',
    padding: '2px 6px',
    fontSize: 14,
    fontFamily: 'var(--blog-font)',
  } as CSSProperties,

  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--blog-border)',
  } as CSSProperties,

  toggleLabel: {
    fontSize: 13,
    color: 'var(--blog-text)',
  } as CSSProperties,

  ctaSection: {
    padding: 16,
    backgroundColor: 'var(--blog-bg-card)',
    borderRadius: 'var(--blog-radius-sm)',
    border: '1px solid var(--blog-border)',
  } as CSSProperties,

  footer: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid var(--blog-border)',
  } as CSSProperties,
};

/** 토글 스위치 인라인 컴포넌트 */
function ToggleSwitch({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      style={s.toggle}
      onClick={() => !disabled && onChange(!checked)}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
    >
      <span style={s.toggleTrack(checked)} />
      <span style={s.toggleThumb(checked)} />
    </button>
  );
}

export default function BlogEditForm({
  adminApiBasePath,
  apiBasePath,
  authHeaders,
  uploadEndpoint,
  categories,
  editId,
  enableCta = true,
  enableAttachments = true,
  maxAttachments = 5,
  enableTags = false,
  i18n,
  onSave,
  onCancel,
}: BlogEditFormProps) {
  const t = resolveI18n(i18n);
  const isNew = !editId;

  const [form, setForm] = useState<BlogFormData>(createEmptyForm(categories));
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slug 관련
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const slugUserEditedRef = useRef(!isNew);
  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalSlugRef = useRef('');

  // 이미지 업로드 관련
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [attachUploading, setAttachUploading] = useState(false);
  const dragCounterRef = useRef(0);

  // 필드 업데이트 헬퍼
  const updateField = useCallback(<K extends keyof BlogFormData>(key: K, value: BlogFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── 편집 데이터 로드 ──

  useEffect(() => {
    if (isNew) {
      setForm(createEmptyForm(categories));
      setSlugStatus('idle');
      slugUserEditedRef.current = false;
      originalSlugRef.current = '';
      return;
    }
    setLoading(true);
    apiFetch(`${adminApiBasePath}/posts/${editId}`, authHeaders)
      .then((r) => r.json())
      .then((json) => {
        const data = ((json as Record<string, unknown>)?.data ?? json) as BlogDetail;
        setForm({
          title: data.title ?? '',
          slug: data.slug ?? '',
          category: data.category ?? Object.keys(categories)[0] ?? '',
          content: data.content ?? '',
          excerpt: data.excerpt ?? '',
          coverImageUrl: data.coverImageUrl ?? '',
          coverImageKey: data.coverImageKey ?? '',
          attachments: data.attachments ?? [],
          featured: data.featured ?? false,
          published: data.published ?? false,
          publishedAt: data.publishedAt ? toLocalDatetime(data.publishedAt as string) : '',
          tagIds: data.tags?.map((tag) => tag.id) ?? [],
          ctaEnabled: false,
          ctaMsg: '',
          ctaBtn: '',
          ctaUrl: '',
        });
        originalSlugRef.current = data.slug ?? '';
        slugUserEditedRef.current = true;
        setSlugStatus('available');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t.adminUnknownError);
      })
      .finally(() => setLoading(false));
  }, [editId, isNew, adminApiBasePath, authHeaders, categories, t.adminUnknownError]);

  // ── Slug 자동 생성 ──

  useEffect(() => {
    if (!isNew || slugUserEditedRef.current) return;
    const generated = slugify(form.title || '', { lower: true, strict: true });
    if (generated) {
      setForm((prev) => (prev.slug === generated ? prev : { ...prev, slug: generated }));
      checkSlug(generated);
    } else {
      setForm((prev) => (prev.slug === '' ? prev : { ...prev, slug: '' }));
      setSlugStatus('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

  // ── Slug 중복 체크 ──

  const checkSlug = useCallback((slug: string) => {
    if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current);
    if (!slug) { setSlugStatus('idle'); return; }
    if (!SLUG_PATTERN.test(slug)) { setSlugStatus('invalid'); return; }

    if (!isNew && slug === originalSlugRef.current) {
      setSlugStatus('available');
      return;
    }

    setSlugStatus('checking');
    slugCheckTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug });
        if (!isNew && editId) params.set('excludeId', editId);
        const res = await apiFetch(
          `${adminApiBasePath}/posts/slug-check?${params}`,
          authHeaders,
        );
        const json = await res.json();
        const data = (json as Record<string, unknown>)?.data ?? json;
        const available = (data as Record<string, unknown>)?.available;
        setSlugStatus(available ? 'available' : 'duplicate');
      } catch {
        setSlugStatus('idle');
      }
    }, 500);
  }, [isNew, editId, adminApiBasePath, authHeaders]);

  const handleSlugChange = useCallback((value: string) => {
    slugUserEditedRef.current = true;
    const sanitized = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    updateField('slug', sanitized);
    checkSlug(sanitized);
  }, [updateField, checkSlug]);

  // ── 대표 이미지 드롭존 ──

  const uploadCoverImage = useCallback(async (file: File) => {
    if (!ALLOWED_IMG_TYPES.includes(file.type)) {
      setError(t.adminImageOnlyAllowed);
      return;
    }
    if (!uploadEndpoint) {
      setError('uploadEndpoint is not configured');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch(uploadEndpoint, authHeaders, { method: 'POST', body: fd });
      const json = await res.json();
      const data = (json as Record<string, unknown>)?.data ?? json;
      const result = data as { url: string; key?: string };
      if (result.url) {
        updateField('coverImageUrl', result.url);
        if (result.key) updateField('coverImageKey', result.key);
      } else {
        setError(t.adminUploadFailed);
      }
    } catch {
      setError(t.adminFileUploadError);
    } finally {
      setIsUploading(false);
    }
  }, [uploadEndpoint, authHeaders, updateField, t]);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types.includes('Files')) setIsDragOver(true);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) void uploadCoverImage(file);
  }, [uploadCoverImage]);

  const handleCoverInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadCoverImage(file);
    e.target.value = '';
  }, [uploadCoverImage]);

  const removeCoverImage = useCallback(() => {
    updateField('coverImageUrl', '');
    updateField('coverImageKey', '');
  }, [updateField]);

  // ── 첨부파일 관리 ──

  const handleAttachUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!uploadEndpoint) {
      setError('uploadEndpoint is not configured');
      return;
    }
    if (form.attachments.length + files.length > maxAttachments) {
      setError(t.adminAttachmentMaxExceeded);
      e.target.value = '';
      return;
    }
    setAttachUploading(true);
    setError(null);
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await apiFetch(uploadEndpoint, authHeaders, { method: 'POST', body: fd });
        const json = await res.json();
        const data = (json as Record<string, unknown>)?.data ?? json;
        const result = data as { url: string; key?: string };
        if (result.url) {
          newAttachments.push({
            name: file.name,
            url: result.url,
            key: result.key || '',
            size: file.size,
            type: file.type,
          });
        }
      } catch {
        setError(t.adminFileUploadError);
      }
    }
    if (newAttachments.length > 0) {
      updateField('attachments', [...form.attachments, ...newAttachments]);
    }
    setAttachUploading(false);
    e.target.value = '';
  }, [form.attachments, maxAttachments, uploadEndpoint, authHeaders, updateField, t]);

  const removeAttachment = useCallback((index: number) => {
    updateField('attachments', form.attachments.filter((_, i) => i !== index));
  }, [form.attachments, updateField]);

  // ── Slug 상태 텍스트 ──

  const slugStatusText = useMemo((): string => {
    switch (slugStatus) {
      case 'idle': return t.adminSlugAutoGenerated;
      case 'checking': return t.adminSlugChecking;
      case 'available': return t.adminSlugAvailable;
      case 'duplicate': return t.adminSlugDuplicate;
      case 'invalid': return t.adminSlugInvalid;
    }
  }, [slugStatus, t]);

  // ── 저장 ──

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      setError(t.adminTitleRequired);
      return;
    }
    if (slugStatus === 'duplicate' || slugStatus === 'invalid') {
      setError(slugStatus === 'duplicate' ? t.adminSlugDuplicate : t.adminSlugInvalid);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        category: form.category,
        content: form.content,
        excerpt: form.excerpt || undefined,
        coverImageUrl: form.coverImageUrl || undefined,
        coverImageKey: form.coverImageKey || undefined,
        attachments: form.attachments,
        featured: form.featured,
        published: form.published,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      };

      if (enableTags) {
        body.tagIds = form.tagIds;
      }

      const url = isNew ? `${adminApiBasePath}/posts` : `${adminApiBasePath}/posts/${editId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await apiFetch(url, authHeaders, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const errData = json as Record<string, unknown>;
        const errMsg = (errData?.error as Record<string, unknown>)?.message as string ?? t.adminUnknownError;
        throw new Error(errMsg);
      }

      const json = await res.json();
      const data = ((json as Record<string, unknown>)?.data ?? json) as BlogListItem;
      onSave(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.adminUnknownError);
    } finally {
      setSaving(false);
    }
  }, [form, slugStatus, isNew, editId, adminApiBasePath, authHeaders, enableTags, onSave, t]);

  // ── 로딩 중 ──

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--blog-text-muted)' }}>
        {t.adminLoading}
      </div>
    );
  }

  const catKeys = Object.keys(categories);

  return (
    <div style={ef.form}>
      {/* 헤더 */}
      <div style={ef.header}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--blog-text)' }}>
          {isNew ? t.adminCreateTitle : t.adminEditTitle}
        </h2>
      </div>

      {/* 에러 */}
      {error && <p style={{ ...s.errorText, marginBottom: 16 }} role="alert">{error}</p>}

      {/* 제목 */}
      <div style={s.fieldGroup}>
        <label style={s.label}>
          {t.adminTitleLabel} <span style={{ color: 'var(--blog-danger)' }}>*</span>
        </label>
        <input
          type="text"
          style={s.input}
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder={t.adminTitlePlaceholder}
          disabled={saving}
        />
      </div>

      {/* Slug */}
      <div style={s.fieldGroup}>
        <label style={s.label}>{t.adminSlugLabel}</label>
        <input
          type="text"
          style={s.input}
          value={form.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder={t.adminSlugPlaceholder}
          disabled={saving}
        />
        <div style={ef.slugStatus(slugStatus)}>{slugStatusText}</div>
      </div>

      {/* 카테고리 + 발행일시 */}
      <div style={ef.twoCol}>
        <div style={s.fieldGroup}>
          <label style={s.label}>
            {t.adminCategoryLabel} <span style={{ color: 'var(--blog-danger)' }}>*</span>
          </label>
          <select
            style={{ ...s.select, width: '100%' }}
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            disabled={saving}
          >
            {catKeys.map((key) => (
              <option key={key} value={key}>{categories[key].label}</option>
            ))}
          </select>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>{t.adminPublishedAtLabel}</label>
          <input
            type="datetime-local"
            style={s.input}
            value={form.publishedAt}
            onChange={(e) => updateField('publishedAt', e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      {/* 본문 (Basic editor: textarea) */}
      <div style={s.fieldGroup}>
        <label style={s.label}>{t.adminContentLabel}</label>
        <textarea
          style={s.textarea}
          value={form.content}
          onChange={(e) => updateField('content', e.target.value)}
          placeholder={t.adminContentPlaceholder}
          disabled={saving}
        />
      </div>

      {/* 요약 */}
      <div style={s.fieldGroup}>
        <label style={s.label}>
          {t.adminExcerptLabel}
          <span style={{ ...s.helperText, marginLeft: 8 }}>{t.adminOptionalLabel}</span>
        </label>
        <input
          type="text"
          style={s.input}
          value={form.excerpt}
          onChange={(e) => updateField('excerpt', e.target.value)}
          placeholder={t.adminExcerptPlaceholder}
          disabled={saving}
        />
      </div>

      {/* 대표 이미지 */}
      <div style={s.fieldGroup}>
        <label style={s.label}>{t.adminCoverImageLabel}</label>
        {form.coverImageUrl ? (
          <div>
            <img src={form.coverImageUrl} alt="Cover" style={ef.coverPreview} />
            <br />
            <button
              type="button"
              style={ef.coverRemove}
              onClick={removeCoverImage}
              disabled={saving}
            >
              {t.commonDelete}
            </button>
          </div>
        ) : (
          <div
            style={s.dropzone(isDragOver)}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => coverInputRef.current?.click()}
          >
            {isUploading ? (
              <span style={{ color: 'var(--blog-text-muted)' }}>{t.adminUploading}</span>
            ) : (
              <span style={{ color: 'var(--blog-text-dim)' }}>
                {t.adminDropHere}
                <br />
                <span style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
                  {t.adminImageUploadButton}
                </span>
              </span>
            )}
          </div>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleCoverInput}
        />
      </div>

      {/* 첨부파일 */}
      {enableAttachments && (
        <div style={s.fieldGroup}>
          <label style={s.label}>
            {t.adminAttachmentsLabel}
            <span style={{ ...s.helperText, marginLeft: 8 }}>
              {form.attachments.length}/{maxAttachments}
            </span>
          </label>
          <div style={ef.attachList}>
            {form.attachments.map((a, i) => (
              <div key={i} style={ef.attachItem}>
                <span>{getFileIcon(a.type)}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </span>
                <span style={{ color: 'var(--blog-text-dim)', fontSize: 12 }}>
                  {formatFileSize(a.size)}
                </span>
                <button
                  type="button"
                  style={ef.attachRemove}
                  onClick={() => removeAttachment(i)}
                  disabled={saving}
                >
                  x
                </button>
              </div>
            ))}
          </div>
          {form.attachments.length < maxAttachments && (
            <button
              type="button"
              style={{ ...s.btn, ...s.btnSmall, marginTop: 8 }}
              onClick={() => attachInputRef.current?.click()}
              disabled={saving || attachUploading}
            >
              {attachUploading ? t.adminUploading : t.adminAttachmentAddButton}
            </button>
          )}
          <input
            ref={attachInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleAttachUpload}
          />
        </div>
      )}

      {/* 태그 피커 */}
      {enableTags && (
        <div style={s.fieldGroup}>
          <label style={s.label}>{t.adminBlocksTag}</label>
          <TagPicker
            selectedTagIds={form.tagIds}
            onChange={(ids) => updateField('tagIds', ids)}
            apiBasePath={`${adminApiBasePath}/tags`}
            authHeaders={authHeaders}
            disabled={saving}
            i18n={i18n}
          />
        </div>
      )}

      {/* CTA */}
      {enableCta && (
        <div style={s.fieldGroup}>
          <label style={s.label}>{t.adminCtaLabel}</label>
          <div style={ef.ctaSection}>
            <div style={ef.toggleRow}>
              <span style={ef.toggleLabel}>{t.adminCtaToggle}</span>
              <ToggleSwitch
                checked={form.ctaEnabled}
                onChange={(v) => updateField('ctaEnabled', v)}
                disabled={saving}
              />
            </div>
            {form.ctaEnabled && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ ...s.label, fontSize: 11 }}>{t.adminCtaMessageLabel}</label>
                  <input
                    type="text"
                    style={s.input}
                    value={form.ctaMsg}
                    onChange={(e) => updateField('ctaMsg', e.target.value)}
                    placeholder={t.adminCtaMessagePlaceholder}
                    disabled={saving}
                  />
                </div>
                <div style={ef.twoCol}>
                  <div>
                    <label style={{ ...s.label, fontSize: 11 }}>{t.adminCtaButtonLabel}</label>
                    <input
                      type="text"
                      style={s.input}
                      value={form.ctaBtn}
                      onChange={(e) => updateField('ctaBtn', e.target.value)}
                      placeholder={t.adminCtaButtonPlaceholder}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label style={{ ...s.label, fontSize: 11 }}>{t.adminCtaUrlLabel}</label>
                    <input
                      type="text"
                      style={s.input}
                      value={form.ctaUrl}
                      onChange={(e) => updateField('ctaUrl', e.target.value)}
                      placeholder="https://"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 공개/추천 토글 */}
      <div style={{ ...s.card, marginBottom: 20 }}>
        <div style={ef.toggleRow}>
          <span style={ef.toggleLabel}>{t.adminPublishedLabel}</span>
          <ToggleSwitch
            checked={form.published}
            onChange={(v) => updateField('published', v)}
            disabled={saving}
          />
        </div>
        <div style={{ ...ef.toggleRow, borderBottom: 'none' }}>
          <span style={ef.toggleLabel}>{t.adminFeaturedLabel}</span>
          <ToggleSwitch
            checked={form.featured}
            onChange={(v) => updateField('featured', v)}
            disabled={saving}
          />
        </div>
      </div>

      {/* 푸터 */}
      <div style={ef.footer}>
        <button type="button" style={s.btn} onClick={onCancel} disabled={saving}>
          {t.adminCancelButton}
        </button>
        <button
          type="button"
          style={{ ...s.btnPrimary, ...(saving ? s.btnDisabled : {}) }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t.adminSaving : t.adminSaveButton}
        </button>
      </div>
    </div>
  );
}
