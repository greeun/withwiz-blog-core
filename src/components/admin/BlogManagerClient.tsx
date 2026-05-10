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
import BlogListPreview from './BlogListPreview';
import BlogDashboard from './BlogDashboard';
import CommentModerationPanel from './CommentModerationPanel';

// ── 스타일 ──

const ms = {
  container: {
    ...rootVars(),
    fontFamily: 'var(--blog-font)',
    color: 'var(--blog-text)',
    backgroundColor: 'var(--blog-bg)',
    minHeight: '100%',
    fontSize: 14,
    lineHeight: 1.5,
    padding: 20,
  } as CSSProperties,

  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    borderBottom: '1px solid var(--blog-border)',
    paddingBottom: 8,
  } as CSSProperties,

  tab: (active: boolean): CSSProperties => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--blog-accent)' : 'var(--blog-text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid var(--blog-accent)' : '2px solid transparent',
    cursor: 'pointer',
    fontFamily: 'var(--blog-font)',
    transition: 'color 0.15s, border-color 0.15s',
    marginBottom: -9,
  }),

  backBtn: {
    ...s.btn,
    ...s.btnSmall,
    marginBottom: 16,
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
}: BlogManagerClientProps) {
  const t = resolveI18n(i18n);

  const [mode, setMode] = useState<AdminMode>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [previewForm, setPreviewForm] = useState<BlogFormData>(createEmptyForm(categories));

  // 편집 모드 (미리보기 탭용)
  const [editTab, setEditTab] = useState<'edit' | 'preview-detail' | 'preview-list'>('edit');

  // 목록에서 항목 선택 -> 편집
  const handleSelect = useCallback((id: string) => {
    setEditId(id);
    setEditTab('edit');
    setMode('edit');
  }, []);

  // 새 글 만들기
  const handleCreate = useCallback(() => {
    setEditId(null);
    setEditTab('edit');
    setMode('edit');
  }, []);

  // 편집 완료 -> 목록으로
  const handleSave = useCallback((post: BlogListItem) => {
    onSave?.(post);
    setMode('list');
    setEditId(null);
  }, [onSave]);

  // 편집 취소 -> 목록으로
  const handleCancel = useCallback(() => {
    setMode('list');
    setEditId(null);
  }, []);

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
    setMode('list');
    setEditId(null);
  }, []);

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

      {/* 편집 모드 */}
      {mode === 'edit' && (
        <div>
          {/* 뒤로 가기 */}
          <button type="button" style={ms.backBtn} onClick={goToList}>
            {t.adminBackButton}
          </button>

          {/* 편집/미리보기 탭 */}
          <div style={ms.tabs}>
            <button
              type="button"
              style={ms.tab(editTab === 'edit')}
              onClick={() => setEditTab('edit')}
            >
              {t.adminViewEdit}
            </button>
            <button
              type="button"
              style={ms.tab(editTab === 'preview-detail')}
              onClick={() => setEditTab('preview-detail')}
            >
              {t.adminViewPreviewDetail}
            </button>
            <button
              type="button"
              style={ms.tab(editTab === 'preview-list')}
              onClick={() => setEditTab('preview-list')}
            >
              {t.adminViewPreviewList}
            </button>
          </div>

          {/* 편집 폼 */}
          {editTab === 'edit' && (
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
            />
          )}

          {/* 상세 미리보기 */}
          {editTab === 'preview-detail' && (
            <BlogDetailPreview
              form={previewForm}
              categories={categories}
              basePath={basePath}
              i18n={i18n}
            />
          )}

          {/* 목록 미리보기 */}
          {editTab === 'preview-list' && (
            <BlogListPreview
              apiBasePath={apiBasePath}
              adminApiBasePath={adminApiBasePath}
              authHeaders={authHeaders}
              categories={categories}
              basePath={basePath}
              pageSize={pageSize}
              i18n={i18n}
              onSelectItem={handleSelect}
            />
          )}
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
