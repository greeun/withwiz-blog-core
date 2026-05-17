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
import type { Attachment, BlogListItem, BlogDetail, EditorType } from '../../types/blog';
import type { BlogEditFormProps, BlogFormData, SlugStatus } from './types';
import { resolveI18n } from '../../i18n';
import { SLUG_PATTERN } from '../../utils/slug';
import { formatFileSize, getFileIcon } from '../../utils/file-helpers';
import { toLocalDatetime } from '../../utils/date';
import { s, rootVars } from './styles';
import TagPicker from './TagPicker';
import BlockEditorForm from './editor/BlockEditorForm';
import { useBlogUI } from '../../context/BlogUIContext';

// fetch 래퍼 / 빈 폼 팩토리 / 허용 이미지 타입 / 스타일(ef) 은
// ./BlogEditForm.internal 로 분리되었다 (동작 불변).
import {
  apiFetch,
  createEmptyForm,
  ALLOWED_IMG_TYPES,
  ef,
} from './BlogEditForm.internal';

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
  basePath,
  BlockEditorComponent,
  BlockEditorProviderComponent,
  editorConfig,
  onFormChange,
  uploadImage: uploadImageProp,
  onImageUploaded,
}: BlogEditFormProps) {
  const { Button, Toggle, Input } = useBlogUI();
  const t = resolveI18n(i18n);
  const isNew = !editId;

  const [form, setForm] = useState<BlogFormData>(createEmptyForm(categories));
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onFormChange?.(form);
  }, [form, onFormChange]);

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

  // ── uploadImage 함수 (prop 우선, 없으면 uploadEndpoint로 생성) ──
  const resolvedUploadImage = useMemo(() => {
    if (uploadImageProp) return uploadImageProp;
    if (!uploadEndpoint) return undefined;
    return async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch(uploadEndpoint, authHeaders, { method: 'POST', body: fd });
      const json = await res.json();
      const data = (json as Record<string, unknown>)?.data ?? json;
      return data as { url: string; key?: string };
    };
  }, [uploadImageProp, uploadEndpoint, authHeaders]);

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
          editorType: (data.editorType as EditorType) ?? 'block',
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
        editorType: form.editorType,
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
      {/* 헤더: 제목 + 토글 + 액션 */}
      <div style={ef.headerRow}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--blog-text)', margin: 0 }}>
          {isNew ? t.adminCreateTitle : t.adminEditTitle}
        </h2>
        <div style={ef.headerActions}>
          <Toggle checked={form.featured} onChange={(v) => updateField('featured', v)} disabled={saving} label={t.adminFeaturedLabel} />
          <Toggle checked={form.published} onChange={(v) => updateField('published', v)} disabled={saving} label={t.adminPublishedLabel} />
          <Button onClick={onCancel} disabled={saving}>
            {t.adminCancelButton}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t.adminSaving : t.adminSaveButton}
          </Button>
        </div>
      </div>

      {/* 에러 */}
      {error && <p style={{ ...s.errorText, marginBottom: 16 }} role="alert">{error}</p>}

      {/* Slug URL */}
      <div style={ef.slugBar}>
        <span style={ef.slugPrefix}>{basePath ?? '/blog'}/</span>
        <input
          style={ef.slugInput}
          value={form.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder={t.adminSlugPlaceholder}
          disabled={saving}
          spellCheck={false}
        />
        <span style={ef.slugStatus(slugStatus)}>
          {slugStatus === 'checking' && '...'}
          {slugStatus === 'available' && '✓'}
          {slugStatus === 'duplicate' && '✗ ' + t.adminSlugDuplicate}
          {slugStatus === 'invalid' && '✗ ' + t.adminSlugInvalid}
        </span>
      </div>

      {/* 카테고리 탭 */}
      <div style={ef.catTabs}>
        {catKeys.map((key) => (
          <button
            key={key}
            type="button"
            style={ef.catTab(form.category === key)}
            onClick={() => updateField('category', key)}
            disabled={saving}
          >
            {categories[key].label}
          </button>
        ))}
      </div>

      {/* 발행일시 */}
      <div style={s.fieldGroup}>
        <div style={ef.sectionTitle}>{t.adminPublishedAtLabel}</div>
        <Input type="datetime-local" style={{ fontSize: 12 }} value={form.publishedAt} onChange={(v) => updateField('publishedAt', v)} disabled={saving} />
      </div>

      {/* 기본 정보 */}
      <div style={s.fieldGroup}>
        <div style={ef.sectionTitle}>
          {t.adminTitleLabel} <span style={ef.sectionTag}>*</span>
        </div>
        <Input style={{ padding: '10px 12px', fontSize: 16, fontWeight: 600 }} value={form.title} onChange={(v) => updateField('title', v)} placeholder={t.adminTitlePlaceholder} disabled={saving} />
        <Input style={{ marginTop: 8 }} value={form.excerpt} onChange={(v) => updateField('excerpt', v)} placeholder={t.adminExcerptPlaceholder} disabled={saving} />
      </div>

      {/* 대표 이미지 */}
      <div style={s.fieldGroup}>
        <div style={ef.sectionTitle}>{t.adminCoverImageLabel}</div>
        {form.coverImageUrl ? (
          <div style={{ position: 'relative' }}>
            <img src={form.coverImageUrl} alt="Cover" style={ef.coverPreview} />
            <Button variant="danger" size="small" style={{ marginTop: 8 }} onClick={removeCoverImage} disabled={saving}>{t.commonDelete}</Button>
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

      {/* 콘텐츠 블록 */}
      <div style={s.fieldGroup}>
        <div style={ef.sectionTitle}>
          {t.adminBlocksLabel} <span style={ef.sectionTag}>{t.adminBlocksTag}</span>
        </div>
        <BlockEditorForm
          content={form.content}
          onContentChange={(c: string) => updateField('content', c)}
          category={form.category}
          editorConfig={editorConfig!}
          uploadImage={resolvedUploadImage}
          onError={(msg) => setError(msg)}
          onImageUploaded={onImageUploaded}
          BlockEditorComponent={BlockEditorComponent}
          BlockEditorProviderComponent={BlockEditorProviderComponent}
        />
      </div>

      {/* 태그 피커 */}
      {enableTags && (
        <div style={s.fieldGroup}>
          <div style={ef.sectionTitle}>{t.adminBlocksTag}</div>
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
          <div style={ef.sectionTitle}>{t.adminCtaLabel}</div>
          <div style={ef.ctaSection}>
            <div style={ef.toggleRow}>
              <span style={ef.toggleLabel}>{t.adminCtaToggle}</span>
              <Toggle checked={form.ctaEnabled} onChange={(v) => updateField('ctaEnabled', v)} disabled={saving} />
            </div>
            {form.ctaEnabled && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ ...s.label, fontSize: 11 }}>{t.adminCtaMessageLabel}</label>
                  <Input value={form.ctaMsg} onChange={(v) => updateField('ctaMsg', v)} placeholder={t.adminCtaMessagePlaceholder} disabled={saving} />
                </div>
                <div style={ef.twoCol}>
                  <div>
                    <label style={{ ...s.label, fontSize: 11 }}>{t.adminCtaButtonLabel}</label>
                    <Input value={form.ctaBtn} onChange={(v) => updateField('ctaBtn', v)} placeholder={t.adminCtaButtonPlaceholder} disabled={saving} />
                  </div>
                  <div>
                    <label style={{ ...s.label, fontSize: 11 }}>{t.adminCtaUrlLabel}</label>
                    <Input value={form.ctaUrl} onChange={(v) => updateField('ctaUrl', v)} placeholder="https://" disabled={saving} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 첨부파일 */}
      {enableAttachments && (
        <div style={s.fieldGroup}>
          <div style={ef.sectionTitle}>
            {t.adminAttachmentsLabel}
            <span style={ef.sectionTag}>
              {form.attachments.length}/{maxAttachments}
            </span>
          </div>
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
            <Button size="small" style={{ marginTop: 8 }} onClick={() => attachInputRef.current?.click()} disabled={saving || attachUploading}>{attachUploading ? t.adminUploading : t.adminAttachmentAddButton}</Button>
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
    </div>
  );
}
