"use client";

/**
 * 관리자 블로그 관리 메인 컴포넌트
 */

import { useState, useCallback, useRef, useMemo, memo, useEffect } from "react";
import slugify from "slugify";
import type { BlogConfig } from "../../types";
import { resolveI18n } from "../../i18n";
import { toLocalDatetime } from "../../utils/date";
import { BLOG_FALLBACK_PATHS } from "../../utils/defaults";
import BlogEditForm, { type SlugStatus } from "./BlogEditForm";
import { BlogDetailPreview } from "./BlogDetailPreview";
import BlogListPreview from "./BlogListPreview";
import type { BlogItem, BlogFormData, CtaData } from "./constants";
import {
  createEmptyForm, deserializeCta, stripCtaFromContent, serializeCta,
  hEsc, getCatClass, getCatLabel, formatDateOnly,
  CTA_HTML_START, CTA_HTML_END,
} from "./constants";

// ── 인증 fetch 래퍼 (self-contained, pms 의존 없음) ──

/** fallback 경로 사용 시 1회 경고 (개발 모드만) */
let fallbackPathWarned = false;
function warnFallbackPathOnce(field: string, fallback: string): void {
  if (fallbackPathWarned) return;
  fallbackPathWarned = true;
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      `[BlogManagerClient] config.${field} 미설정 — fallback "${fallback}" 사용. ` +
        '운영 환경에서는 BlogConfig에 명시적으로 경로를 설정하세요.',
    );
  }
}

/** 설정 가능한 인증 경로를 사용하는 fetch 래퍼 생성 */
function createBlogFetch(
  config: BlogConfig,
  onFetchError?: (err: unknown, url: string) => void,
) {
  let refreshPath = config.authRefreshPath;
  let loginPath = config.loginPath;
  if (!refreshPath) {
    refreshPath = BLOG_FALLBACK_PATHS.authRefreshPath;
    warnFallbackPathOnce('authRefreshPath', refreshPath);
  }
  if (!loginPath) {
    loginPath = BLOG_FALLBACK_PATHS.loginPath;
    warnFallbackPathOnce('loginPath', loginPath);
  }

  return async function blogFetch(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      const res = await fetch(url, { ...options, credentials: "same-origin" });
      if (res.status === 401 && typeof window !== "undefined") {
        try {
          const refreshRes = await fetch(refreshPath, { method: "POST", credentials: "same-origin" });
          if (refreshRes.ok) return fetch(url, { ...options, credentials: "same-origin" });
        } catch (refreshErr) {
          onFetchError?.(refreshErr, refreshPath);
        }
        window.location.href = loginPath;
      }
      return res;
    } catch (err) {
      // 네트워크 오류는 호스트가 관측할 수 있도록 콜백으로 통보 후 재던지기
      onFetchError?.(err, url);
      throw err;
    }
  };
}

// ── 날짜 포맷 ──

function fmtDate(v: string | Date | null | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// ── 목록 행 컴포넌트 ──

const BlogListItemRow = memo(function BlogListItemRow({
  item, isSelected, isChecked, config,
  onNavigate, onDelete, onToggleSelect,
}: {
  item: BlogItem;
  isSelected: boolean;
  isChecked: boolean;
  config: BlogConfig;
  onNavigate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
}) {
  const i18n = resolveI18n(config.i18n);
  const cls = [
    "blog-list-item",
    isSelected ? "blog-active" : "",
    !item.published ? "blog-hidden" : "",
    isChecked ? "blog-checked" : "",
  ].filter(Boolean).join(" ");
  return (
    <div className={cls} onClick={() => onNavigate(item.id)}>
      <input
        type="checkbox"
        className="blog-item-checkbox"
        checked={isChecked}
        onClick={(e) => onToggleSelect(item.id, e)}
        onChange={() => {}}
      />
      <div className="blog-item-img">
        {item.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverImageUrl} alt="" />
        )}
      </div>
      <div className="blog-item-body">
        <div className="blog-item-title">
          {item.title || i18n.adminItemNoTitle}
          <span className={`blog-cat-badge ${getCatClass(item.category, config)}`}>
            {getCatLabel(item.category, config)}
          </span>
          {item.hasAttachments && <span className="blog-attach-icon" title={i18n.adminAttachmentTitle}>{"\u{1F4CE}"}</span>}
          {item.featured && <span className="blog-badge-featured" style={{ fontSize: 8, padding: "1px 4px" }}>{i18n.adminFeaturedShort}</span>}
          {item.published
            ? <span className="blog-badge-on">{i18n.adminPublishedLabel}</span>
            : <span className="blog-badge-off">{i18n.adminUnpublishedLabel}</span>
          }
          {item.viewCount != null && item.viewCount > 0 && (
            <span className="blog-item-views">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {item.viewCount.toLocaleString()}
            </span>
          )}
        </div>
        <div className="blog-item-meta blog-item-dates">
          {fmtDate(item.publishedAt) && <span>{i18n.adminMetaPublishedAt} {fmtDate(item.publishedAt)}</span>}
          <span>{i18n.adminMetaCreatedAt} {fmtDate(item.createdAt)}</span>
          <span>{i18n.adminMetaUpdatedAt} {fmtDate(item.updatedAt)}</span>
        </div>
      </div>
      <button className="blog-item-delete" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
        &times;
      </button>
    </div>
  );
});

// ── 메인 컴포넌트 ──

interface Props {
  items: BlogItem[];
  config: BlogConfig;
  /** 초기 선택 ID */
  initialSelectedId?: string | null;
  /** 새 글 작성 모드 시작 */
  startWithNew?: boolean;
  /** 초기 카테고리 필터 */
  defaultCategory?: string;
  /** 블록 에디터 프리셋 */
  editorPreset?: import("@withwiz/block-editor").BlockEditorConfig;
  /**
   * 에러 알림 콜백.
   *
   * @warning 미제공 시 에러는 콘솔에만 기록되어 사용자에게 노출되지 않습니다.
   *          호스트는 toast/alert 등 가시적 피드백 처리기를 반드시 주입하는 것이 권장됩니다.
   */
  onError?: (msg: string) => void;
  /**
   * 성공 알림 콜백.
   *
   * @warning 미제공 시 성공 메시지는 콘솔에만 기록됩니다. 호스트가 toast 등을 주입하세요.
   */
  onSuccess?: (msg: string) => void;
  /**
   * blogFetch 네트워크/리프레시 오류 콜백.
   *
   * onError와 별개로 fetch 단계의 raw error를 호스트가 관측(Sentry 등)할 수 있게 한다.
   */
  onFetchError?: (err: unknown, url: string) => void;
  /** 이미지 URL 변환기 */
  imageUrlTransformer?: (url: string, size: string) => string;
  /** 샘플 메타데이터 (카테고리별 예시 콘텐츠) */
  sampleMeta?: Record<string, {
    title: string; excerpt: string; coverImageUrl: string;
    ctaEnabled: boolean; ctaMsg: string; ctaBtn: string;
  }>;
}

export default function BlogManagerClient({
  items: initialItems,
  config,
  initialSelectedId,
  startWithNew,
  defaultCategory,
  editorPreset,
  onError,
  onSuccess,
  onFetchError,
  sampleMeta,
}: Props) {
  const i18n = resolveI18n(config.i18n);
  // 알림 처리 — 콜백 미제공 시 콘솔로 fallback 하되, 개발 모드에서 1회 경고
  const notify = useMemo(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      if (!onError) {
        // eslint-disable-next-line no-console
        console.warn('[BlogManagerClient] onError 콜백 미제공 — 에러 메시지가 콘솔에만 출력됩니다.');
      }
    }
    return {
      error: (m: string) => {
        if (onError) onError(m);
        else console.error('[BlogManagerClient]', m);
      },
      success: (m: string) => {
        if (onSuccess) onSuccess(m);
        else console.log('[BlogManagerClient]', m);
      },
    };
  }, [onError, onSuccess]);

  // ── 설정 기반 인증 fetch 래퍼 ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const blogFetch = useMemo(
    () => createBlogFetch(config, onFetchError),
    [config.authRefreshPath, config.loginPath, onFetchError],
  );

  // ── 상태 ──
  const [items, setItems] = useState<BlogItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [isNew, setIsNew] = useState(startWithNew || false);
  const [form, setForm] = useState<BlogFormData>(createEmptyForm(config));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterValue, setFilterValue] = useState(defaultCategory || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("publishedAt");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview-detail" | "preview-list">("edit");

  const uploadedKeysRef = useRef<string[]>([]);
  const slugStatusRef = useRef<SlugStatus>("idle");

  const trackUploadedKey = useCallback((key: string) => {
    uploadedKeysRef.current.push(key);
  }, []);

  // ── 필터링 + 정렬 ──
  const filteredItems = useMemo(() => {
    let result = items;
    if (filterValue !== "all") result = result.filter((n) => n.category === filterValue);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        (n.excerpt || "").toLowerCase().includes(q) ||
        getCatLabel(n.category, config).toLowerCase().includes(q)
      );
    }
    // 정렬
    result = [...result].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortKey];
      const bVal = (b as unknown as Record<string, unknown>)[sortKey];
      const aTime = aVal ? new Date(aVal as string).getTime() : 0;
      const bTime = bVal ? new Date(bVal as string).getTime() : 0;
      return bTime - aTime;
    });
    return result;
  }, [items, filterValue, searchQuery, sortKey, config]);

  const publishedItems = useMemo(() => filteredItems.filter((i) => i.published), [filteredItems]);

  // ── 아이템 선택/로드 ──
  const selectItem = useCallback(async (id: string) => {
    setSelectedId(id);
    setIsNew(false);
    setViewMode("edit");
    setLoading(true);
    try {
      const res = await blogFetch(`${config.adminApiBasePath}/${id}`);
      const json = await res.json();
      if (json.success) {
        const n = json.data;
        const rawContent = n.content || "";
        const cta = deserializeCta(rawContent);
        setForm({
          title: n.title || "",
          slug: n.slug || "",
          category: n.category || Object.keys(config.categories)[0] || "",
          content: stripCtaFromContent(rawContent),
          excerpt: n.excerpt || "",
          coverImageUrl: n.coverImageUrl || "",
          coverImageKey: n.coverImageKey || "",
          attachments: Array.isArray(n.attachments) ? n.attachments : [],
          featured: n.featured || false,
          published: n.published || false,
          publishedAt: toLocalDatetime(n.publishedAt || null),
          ctaEnabled: cta.enabled,
          ctaMsg: cta.msg,
          ctaBtn: cta.btn,
          ctaUrl: cta.url,
        });
      }
    } catch (err) {
      notify.error(i18n.errorNetwork);
      onFetchError?.(err, `${config.adminApiBasePath}/${id}`);
    } finally {
      setLoading(false);
    }
  }, [config, notify, onFetchError]);

  // 초기 선택
  useEffect(() => {
    if (initialSelectedId) selectItem(initialSelectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToItem = useCallback((id: string) => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${config.adminBasePath}/${id}`);
    }
    selectItem(id);
  }, [config.adminBasePath, selectItem]);

  const startNewItem = useCallback(() => {
    setSelectedId(null);
    setIsNew(true);
    setForm(createEmptyForm(config));
    setViewMode("edit");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${config.adminBasePath}/new`);
    }
  }, [config]);

  // ── 저장 ──
  const handleSave = useCallback(async () => {
    // 유효성 검사
    if (!form.title.trim()) { notify.error(i18n.adminTitleRequired); return; }
    if (!form.content.trim()) { notify.error(i18n.adminContentRequired); return; }
    if (slugStatusRef.current === "duplicate") { notify.error(i18n.adminSlugDuplicate); return; }
    if (slugStatusRef.current === "invalid") { notify.error(i18n.adminSlugInvalid); return; }
    if (slugStatusRef.current === "checking") { notify.error(i18n.adminSlugDuplicate); return; }

    let slug = form.slug;
    if (!slug) {
      slug = slugify(form.title || "", { lower: true, strict: true });
      if (!slug) slug = `post-${Date.now()}`;
    }

    // CTA 직렬화
    const ctaData: CtaData = { enabled: form.ctaEnabled, msg: form.ctaMsg, btn: form.ctaBtn, url: form.ctaUrl };
    const ctaMarker = serializeCta(ctaData);
    let ctaHtml = "";
    if (ctaData.enabled && ctaData.btn) {
      const cat = getCatClass(form.category, config);
      ctaHtml = `${CTA_HTML_START}<div class="nbe-pvb-cta">${ctaData.msg ? `<p>${hEsc(ctaData.msg)}</p>` : ""}<a href="${ctaData.url || "#"}" class="nbe-pvb-cta-btn ${cat}">${hEsc(ctaData.btn)}</a></div>${CTA_HTML_END}`;
    }

    const injectCta = (content: string): string => {
      const idx = content.indexOf("\n<!-- nbe-blocks:");
      if (idx >= 0) return content.substring(0, idx) + ctaHtml + content.substring(idx) + ctaMarker;
      return content + ctaHtml + ctaMarker;
    };

    const payload = {
      title: form.title,
      slug,
      category: form.category,
      content: injectCta(form.content),
      excerpt: form.excerpt,
      coverImageUrl: form.coverImageUrl,
      coverImageKey: form.coverImageKey,
      attachments: form.attachments,
      featured: form.featured,
      published: form.published,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
    };

    setSaving(true);
    try {
      const url = isNew ? config.adminApiBasePath : `${config.adminApiBasePath}/${selectedId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await blogFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        notify.success(isNew ? i18n.adminPublishedSuffix : i18n.adminDraftSuffix);
        uploadedKeysRef.current = [];
        // 목록 새로고침
        await refreshList();
        if (isNew && json.data?.id) {
          navigateToItem(json.data.id);
        }
      } else {
        notify.error(json.error?.message || i18n.adminUploadFailed);
      }
    } catch (err) {
      notify.error(i18n.adminFileUploadError);
      onFetchError?.(err, isNew ? config.adminApiBasePath : `${config.adminApiBasePath}/${selectedId}`);
    } finally {
      setSaving(false);
    }
  }, [form, isNew, selectedId, config, notify, navigateToItem, onFetchError]);

  // ── 삭제 ──
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(i18n.adminDeleteConfirm)) return;
    try {
      const res = await blogFetch(`${config.adminApiBasePath}/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        notify.success(i18n.adminDraftSuffix);
        if (selectedId === id) {
          setSelectedId(null);
          setIsNew(false);
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", config.adminBasePath);
          }
        }
        await refreshList();
      } else {
        notify.error(json.error?.message || i18n.adminUnknownError);
      }
    } catch (err) {
      notify.error(i18n.errorNetwork);
      onFetchError?.(err, `${config.adminApiBasePath}/${id}`);
    }
  }, [config, selectedId, i18n, notify, onFetchError]);

  // ── 목록 새로고침 ──
  const refreshList = useCallback(async () => {
    try {
      const res = await blogFetch(config.adminApiBasePath);
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.items)) {
        setItems(json.data.items.map((n: Record<string, unknown>) => ({
          ...n,
          publishedAt: n.publishedAt ? new Date(n.publishedAt as string).toISOString() : null,
          createdAt: new Date(n.createdAt as string).toISOString(),
          updatedAt: new Date(n.updatedAt as string).toISOString(),
        })));
      }
    } catch { /* 무시 */ }
  }, [config.adminApiBasePath]);

  // ── 선택/일괄 작업 ──
  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const ids = filteredItems.map((i) => i.id);
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  }, [filteredItems]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkAction = useCallback(async (action: Record<string, unknown>) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkProcessing(true);
    try {
      const res = await blogFetch(`${config.adminApiBasePath}/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, ...action }),
      });
      const json = await res.json();
      if (json.success) {
        notify.success(`${json.data.count}${i18n.adminDraftSuffix}`);
        setSelectedIds(new Set());
        await refreshList();
      } else {
        notify.error(json.error?.message || i18n.adminUnknownError);
      }
    } catch (err) {
      notify.error(i18n.errorNetwork);
      onFetchError?.(err, `${config.adminApiBasePath}/bulk`);
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, config.adminApiBasePath, notify, refreshList, onFetchError]);

  const handleCancel = useCallback(() => {
    setSelectedId(null);
    setIsNew(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", config.adminBasePath);
    }
  }, [config.adminBasePath]);

  const handleModeChange = useCallback((m: "template" | "sample") => {
    if (m === "sample" && sampleMeta) {
      const meta = sampleMeta[form.category];
      if (meta) {
        setForm((prev) => ({
          ...prev,
          title: meta.title,
          excerpt: meta.excerpt,
          coverImageUrl: meta.coverImageUrl,
          coverImageKey: "",
          ctaEnabled: meta.ctaEnabled,
          ctaMsg: meta.ctaMsg,
          ctaBtn: meta.ctaBtn,
        }));
      }
    }
  }, [form.category, sampleMeta]);

  const updateField = useCallback(<K extends keyof BlogFormData>(key: K, value: BlogFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── 정렬 옵션 ──
  const sortOptions = [
    { value: "createdAt", label: i18n.adminSortCreatedAt },
    { value: "publishedAt", label: i18n.adminSortPublishedAt },
    { value: "updatedAt", label: i18n.adminSortUpdatedAt },
  ];

  const categories = Object.entries(config.categories).map(([value, theme]) => ({
    value,
    label: theme.label,
  }));

  const allSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id));
  const someSelected = selectedIds.size > 0;

  return (
    <div className="blog-manager">
      {/* 3패널 레이아웃: 목록 | 편집/미리보기 | 상세미리보기 */}
      <div className="blog-manager-layout">

        {/* 왼쪽 패널: 목록 */}
        <div className="blog-manager-list-panel">
          <div className="blog-manager-header">
            <h1 className="blog-manager-title">{i18n.adminListTitle}</h1>
          </div>

          {/* 툴바 */}
          <div className="blog-manager-toolbar">
            {someSelected ? (
              <div className="blog-bulk-bar">
                <input type="checkbox" className="blog-bulk-checkbox" checked={allSelected} onChange={toggleSelectAll} />
                <span className="blog-bulk-count">{selectedIds.size}{i18n.adminBulkSelectedSuffix}</span>
                <button className="blog-bulk-btn blog-bulk-publish" type="button" disabled={bulkProcessing} onClick={() => handleBulkAction({ published: true })}>{i18n.adminBulkPublish}</button>
                <button className="blog-bulk-btn blog-bulk-unpublish" type="button" disabled={bulkProcessing} onClick={() => handleBulkAction({ published: false })}>{i18n.adminBulkUnpublish}</button>
                {config.enableFeatured !== false && (
                  <>
                    <button className="blog-bulk-btn blog-bulk-publish" type="button" disabled={bulkProcessing} onClick={() => handleBulkAction({ featured: true })}>{i18n.adminBulkFeature}</button>
                    <button className="blog-bulk-btn blog-bulk-unpublish" type="button" disabled={bulkProcessing} onClick={() => handleBulkAction({ featured: false })}>{i18n.adminBulkUnfeature}</button>
                  </>
                )}
                <button className="blog-bulk-btn blog-bulk-cancel" type="button" onClick={clearSelection}>{i18n.adminBulkClear}</button>
              </div>
            ) : (
              <>
                <input type="checkbox" className="blog-bulk-checkbox" checked={allSelected} onChange={toggleSelectAll} title={i18n.adminSelectAll} />
                <select className="blog-filter-select" value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                  <option value="all">{i18n.adminCategoryAll}</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <div className="blog-search-wrap">
                  <input className="blog-search-input" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={i18n.adminSearchPlaceholder} />
                  {searchQuery && <button className="blog-search-clear" type="button" onClick={() => setSearchQuery("")}>&times;</button>}
                </div>
                <select className="blog-filter-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="blog-count">{filteredItems.length}{i18n.adminCountSuffix}</span>
                <button className="blog-add-btn" type="button" onClick={startNewItem}>
                  {i18n.adminCreateButton}
                </button>
              </>
            )}
          </div>

          {/* 목록 */}
          <div className="blog-manager-items">
            {filteredItems.map((item) => (
              <BlogListItemRow
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                isChecked={selectedIds.has(item.id)}
                config={config}
                onNavigate={navigateToItem}
                onDelete={handleDelete}
                onToggleSelect={toggleSelect}
              />
            ))}
            {filteredItems.length === 0 && (
              <div className="blog-empty">{i18n.adminListEmpty}</div>
            )}
          </div>
        </div>

        {/* 가운데 패널: 편집 또는 미리보기 */}
        <div className="blog-manager-edit-panel">
          {/* 뷰 모드 탭 */}
          <div className="blog-view-tabs">
            <button className={`blog-view-tab ${viewMode === "edit" ? "on" : ""}`} onClick={() => setViewMode("edit")}>{i18n.adminViewEdit}</button>
            <button className={`blog-view-tab ${viewMode === "preview-detail" ? "on" : ""}`} onClick={() => setViewMode("preview-detail")}>{i18n.adminViewPreviewDetail}</button>
            <button className={`blog-view-tab ${viewMode === "preview-list" ? "on" : ""}`} onClick={() => setViewMode("preview-list")}>{i18n.adminViewPreviewList}</button>
          </div>

          {viewMode === "edit" && (
            <div className="blog-edit-scroll">
              <BlogEditForm
                key={selectedId || (isNew ? "new" : "none")}
                form={form}
                setForm={setForm}
                updateField={updateField}
                isNew={isNew}
                selectedId={selectedId}
                saving={saving}
                loading={loading}
                onSave={handleSave}
                onCancel={handleCancel}
                onModeChange={handleModeChange}
                trackUploadedKey={trackUploadedKey}
                slugStatusRef={slugStatusRef}
                config={config}
                editorPreset={editorPreset}
                onError={onError}
              />
            </div>
          )}

          {viewMode === "preview-detail" && (
            <div className="blog-preview-scroll">
              <BlogDetailPreview
                form={form}
                isNew={isNew}
                selectedId={selectedId}
                config={config}
              />
            </div>
          )}

          {viewMode === "preview-list" && (
            <div className="blog-preview-scroll">
              <BlogListPreview
                publishedItems={publishedItems}
                onSelectItem={navigateToItem}
                config={config}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { BlogManagerClient };
