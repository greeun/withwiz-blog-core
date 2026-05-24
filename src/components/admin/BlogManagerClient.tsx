'use client';

/**
 * 관리자 블로그 관리 메인 컴포넌트
 *
 * 목록, 편집, 미리보기(상세/목록), 대시보드, 댓글 모더레이션 간
 * 상태 전환을 관리하는 마스터 컴포넌트.
 */

import { useCallback, useState, type CSSProperties } from 'react';
import type { BlogListItem } from '../../types/blog';
import type { BlogManagerClientProps, AdminMode, BlogFormData } from './types';
import { resolveI18n } from '../../i18n';
import { s, rootVars } from './styles';
import BlogListView from './BlogListView';
import BlogEditForm from './BlogEditForm';
import BlogDetailPreview from './BlogDetailPreview';
import BlogDashboard from './BlogDashboard';
import CommentModerationPanel from './CommentModerationPanel';

// ── 스타일 ──

const ms = {
  container: {
    ...rootVars(),
    fontFamily: 'var(--blog-admin-font)',
    color: 'var(--blog-admin-text)',
    backgroundColor: 'var(--blog-admin-bg)',
    minHeight: '100%',
    fontSize: 14,
    lineHeight: 1.5,
    padding: 20,
  } as CSSProperties,

  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    borderBottom: '1px solid var(--blog-admin-border)',
    paddingBottom: 8,
  } as CSSProperties,

  tab: (active: boolean): CSSProperties => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--blog-admin-accent)' : 'var(--blog-admin-text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid var(--blog-admin-accent)' : '2px solid transparent',
    cursor: 'pointer',
    fontFamily: 'var(--blog-admin-font)',
    transition: 'color 0.15s, border-color 0.15s',
    marginBottom: -9,
  }),

  backBtn: {
    ...s.btn,
    ...s.btnSmall,
    marginBottom: 16,
  } as CSSProperties,

  editSplit: {
    display: 'grid',
    gridTemplateColumns: '4fr 7fr',
    gap: 0,
    height: 'calc(100vh - 120px)',
  } as CSSProperties,

  editLeft: {
    overflowY: 'auto' as const,
    paddingRight: 16,
  } as CSSProperties,

  editRight: {
    overflowY: 'auto' as const,
    borderLeft: '1px solid var(--blog-admin-border)',
    paddingLeft: 16,
    backgroundColor: '#fff',
  } as CSSProperties,

  previewLabel: {
    fontSize: 10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
    color: 'var(--blog-admin-text-dim)',
    textAlign: 'center' as const,
    marginBottom: 12,
    fontWeight: 600,
  } as CSSProperties,
};

/** 빈 폼 데이터 */
function createEmptyForm(categories: Record<string, unknown>): BlogFormData {
  const firstCategory = Object.keys(categories)[0] || '';
  return {
    title: '',
    slug: '',
    category: firstCategory,
    content: '',
    editorType: 'block',
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

export default function BlogManagerClient({
  apiBasePath,
  adminApiBasePath,
  authHeaders,
  uploadEndpoint,
  categories,
  basePath,
  pageSize = 12,
  enableCta = true,
  enableAttachments = true,
  maxAttachments = 5,
  enableTags = false,
  enableComments = false,
  i18n,
  onSave,
  onDelete,
  className,
  BlockEditorComponent,
  BlockEditorProviderComponent,
  editorConfig,
  adminBasePath,
  initialMode = 'list',
  initialEditId = null,
  navigate,
  uploadImage,
  onImageUploaded,
}: BlogManagerClientProps) {
  const t = resolveI18n(i18n);

  const useRouting = !!(navigate && adminBasePath);

  const [mode, setMode] = useState<AdminMode>(initialMode);
  const [editId, setEditId] = useState<string | null>(initialEditId);
  const [previewForm, setPreviewForm] = useState<BlogFormData>(createEmptyForm(categories));

  // 목록에서 항목 선택 -> 편집
  const handleSelect = useCallback((id: string) => {
    if (useRouting) {
      navigate!(`${adminBasePath}/${id}`);
    } else {
      setEditId(id);
      setMode('edit');
    }
  }, [useRouting, navigate, adminBasePath]);

  // 새 글 만들기
  const handleCreate = useCallback(() => {
    if (useRouting) {
      navigate!(`${adminBasePath}/new`);
    } else {
      setEditId(null);
      setMode('edit');
    }
  }, [useRouting, navigate, adminBasePath]);

  // 편집 완료 -> 목록으로
  const handleSave = useCallback((post: BlogListItem) => {
    onSave?.(post);
    if (useRouting) {
      navigate!(adminBasePath!);
    } else {
      setMode('list');
      setEditId(null);
    }
  }, [onSave, useRouting, navigate, adminBasePath]);

  // 편집 취소 -> 목록으로
  const handleCancel = useCallback(() => {
    if (useRouting) {
      navigate!(adminBasePath!);
    } else {
      setMode('list');
      setEditId(null);
    }
  }, [useRouting, navigate, adminBasePath]);

  // 대시보드
  const handleDashboard = useCallback(() => {
    setMode('dashboard');
  }, []);

  // 댓글 모더레이션
  const handleComments = useCallback(() => {
    setMode('comments');
  }, []);

  // 목록으로 돌아가기
  const goToList = useCallback(() => {
    if (useRouting) {
      navigate!(adminBasePath!);
    } else {
      setMode('list');
      setEditId(null);
    }
  }, [useRouting, navigate, adminBasePath]);

  return (
    <div style={ms.container} className={className}>
      {/* 목록 모드 */}
      {mode === 'list' && (
        <BlogListView
          apiBasePath={apiBasePath}
          adminApiBasePath={adminApiBasePath}
          authHeaders={authHeaders}
          categories={categories}
          pageSize={pageSize}
          i18n={i18n}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDashboard={handleDashboard}
          onComments={enableComments ? handleComments : undefined}
        />
      )}

      {/* 편집 모드 — 좌우 분할 */}
      {mode === 'edit' && (
        <div>
          <button type="button" style={ms.backBtn} onClick={goToList}>
            {t.adminBackButton}
          </button>

          <div style={ms.editSplit}>
            {/* 좌측: 편집 폼 */}
            <div style={ms.editLeft}>
              <BlogEditForm
                apiBasePath={apiBasePath}
                adminApiBasePath={adminApiBasePath}
                authHeaders={authHeaders}
                uploadEndpoint={uploadEndpoint}
                categories={categories}
                editId={editId}
                enableCta={enableCta}
                enableAttachments={enableAttachments}
                maxAttachments={maxAttachments}
                enableTags={enableTags}
                i18n={i18n}
                onSave={handleSave}
                onCancel={handleCancel}
                basePath={basePath}
                BlockEditorComponent={BlockEditorComponent}
                BlockEditorProviderComponent={BlockEditorProviderComponent}
                editorConfig={editorConfig}
                onFormChange={setPreviewForm}
                uploadImage={uploadImage}
                onImageUploaded={onImageUploaded}
              />
            </div>

            {/* 우측: 실시간 미리보기 */}
            <div style={ms.editRight}>
              <div style={ms.previewLabel}>{t.adminViewPreviewDetail}</div>
              <BlogDetailPreview
                form={previewForm}
                categories={categories}
                basePath={basePath}
                i18n={i18n}
              />
            </div>
          </div>
        </div>
      )}

      {/* 대시보드 모드 */}
      {mode === 'dashboard' && (
        <div>
          <button type="button" style={ms.backBtn} onClick={goToList}>
            {t.adminBackButton}
          </button>
          <BlogDashboard
            apiBasePath={apiBasePath}
            adminApiBasePath={adminApiBasePath}
            authHeaders={authHeaders}
            categories={categories}
            i18n={i18n}
            onNavigate={goToList}
          />
        </div>
      )}

      {/* 댓글 모더레이션 모드 */}
      {mode === 'comments' && (
        <div>
          <button type="button" style={ms.backBtn} onClick={goToList}>
            {t.adminBackButton}
          </button>
          <CommentModerationPanel
            apiBasePath={apiBasePath}
            adminApiBasePath={adminApiBasePath}
            authHeaders={authHeaders}
            i18n={i18n}
          />
        </div>
      )}
    </div>
  );
}
