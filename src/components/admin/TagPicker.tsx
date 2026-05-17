'use client';

/**
 * 태그 검색/선택/생성 위젯
 *
 * 기존 태그를 자동완성으로 선택하거나, 없는 태그를 즉석 생성할 수 있다.
 * fetch 기반 REST API 통신. 외부 의존성 없음.
 *
 * API 계약:
 *   GET  {apiBasePath}?search=xxx → { success: true, data: { items: Tag[] } }
 *   POST {apiBasePath}            → { success: true, data: Tag }
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Tag } from '../../types/tag';
import type { TagPickerProps } from './types';
import { resolveI18n } from '../../i18n';
import { s, rootVars } from './styles';
import type { CSSProperties } from 'react';

/** 문자열을 URL-safe slug로 변환 */
function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** fetch 래퍼: authHeaders 자동 첨부 */
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

/** API 응답에서 items 배열 추출 */
function extractItems(json: unknown): Tag[] {
  const obj = json as Record<string, unknown>;
  // { success, data: { items } } 형식
  if (obj?.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>;
    if (Array.isArray(data.items)) return data.items as Tag[];
    if (Array.isArray(data)) return data as Tag[];
  }
  // { items } 형식
  if (Array.isArray(obj?.items)) return obj.items as Tag[];
  // 배열 직접 반환
  if (Array.isArray(json)) return json as Tag[];
  return [];
}

// ── 스타일 ──

const styles = {
  container: {
    position: 'relative' as const,
  } as CSSProperties,

  selectedArea: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    padding: 8,
    backgroundColor: 'var(--blog-bg-input)',
    border: '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius-sm)',
    minHeight: 38,
    alignItems: 'center',
    cursor: 'text',
  } as CSSProperties,

  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    backgroundColor: 'rgba(74,144,217,0.12)',
    color: 'var(--blog-accent)',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
  } as CSSProperties,

  chipRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--blog-accent)',
    cursor: 'pointer',
    padding: '0 2px',
    fontSize: 14,
    lineHeight: 1,
    opacity: 0.7,
  } as CSSProperties,

  input: {
    flex: 1,
    minWidth: 80,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: 'var(--blog-text)',
    fontSize: 13,
    fontFamily: 'var(--blog-font)',
    padding: '2px 0',
  } as CSSProperties,

  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: 'var(--blog-bg-card)',
    border: '1px solid var(--blog-border)',
    borderRadius: 'var(--blog-radius-sm)',
    maxHeight: 200,
    overflowY: 'auto' as const,
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  } as CSSProperties,

  option: {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--blog-text)',
    fontSize: 13,
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontFamily: 'var(--blog-font)',
  } as CSSProperties,

  optionCount: {
    color: 'var(--blog-text-dim)',
    marginLeft: 4,
    fontSize: 11,
  } as CSSProperties,

  createBtn: {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--blog-accent)',
    fontSize: 13,
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontFamily: 'var(--blog-font)',
    fontWeight: 500,
  } as CSSProperties,

  empty: {
    padding: '8px 12px',
    color: 'var(--blog-text-dim)',
    fontSize: 12,
  } as CSSProperties,

  loading: {
    padding: '8px 12px',
    color: 'var(--blog-text-muted)',
    fontSize: 12,
  } as CSSProperties,

  error: {
    ...s.errorText,
  } as CSSProperties,
};

/** 태그 선택/생성 피커 */
export default function TagPicker({
  selectedTagIds,
  onChange,
  apiBasePath,
  authHeaders,
  disabled = false,
  debounceMs = 200,
  i18n,
}: TagPickerProps) {
  const t = resolveI18n(i18n);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 초기 마운트 시 선택된 태그들의 정보 로드
  useEffect(() => {
    if (selectedTagIds.length === 0) {
      setSelectedTags([]);
      return;
    }
    const missing = selectedTagIds.filter(
      (id) => !selectedTags.some((t) => t.id === id),
    );
    if (missing.length === 0) return;

    apiFetch(apiBasePath, authHeaders)
      .then((r) => r.json())
      .then((json) => {
        const items = extractItems(json);
        const matched = items.filter((t) => selectedTagIds.includes(t.id));
        setSelectedTags(matched);
      })
      .catch(() => { /* 무시 */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagIds.join(',')]);

  // 쿼리 변경 시 자동완성 (디바운스)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${apiBasePath}?search=${encodeURIComponent(query.trim())}`;
        const res = await apiFetch(url, authHeaders);
        const json = await res.json();
        const items = extractItems(json);
        setSuggestions(items.filter((t) => !selectedTagIds.includes(t.id)));
      } catch {
        setError(t.errorNetwork);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, apiBasePath, debounceMs, selectedTagIds, authHeaders, t.errorNetwork]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addTag = useCallback((tag: Tag) => {
    if (selectedTagIds.includes(tag.id)) return;
    setSelectedTags((prev) => [...prev, tag]);
    onChange([...selectedTagIds, tag.id]);
    setQuery('');
    setSuggestions([]);
  }, [selectedTagIds, onChange]);

  const removeTag = useCallback((id: string) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== id));
    onChange(selectedTagIds.filter((x) => x !== id));
  }, [selectedTagIds, onChange]);

  const createTag = useCallback(async () => {
    const name = query.trim();
    if (!name) return;
    const slug = toSlug(name);
    if (!slug) {
      setError(t.tagPickerInvalidName);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(apiBasePath, authHeaders, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as Record<string, unknown>)?.error as string ?? t.errorUnknown);
      }
      const json = await res.json();
      const tag: Tag = (json as Record<string, unknown>)?.data as Tag ?? json;
      addTag(tag);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorUnknown);
    } finally {
      setLoading(false);
    }
  }, [query, apiBasePath, authHeaders, addTag, t]);

  const handleKey = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (query.trim()) {
        void createTag();
      }
    } else if (e.key === 'Backspace' && !query && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1].id);
    }
  }, [suggestions, query, selectedTags, addTag, removeTag, createTag]);

  const exactMatch = suggestions.some(
    (item) => item.name.toLowerCase() === query.trim().toLowerCase(),
  );
  const canCreate = query.trim().length > 0 && !exactMatch;

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.selectedArea}>
        {selectedTags.map((tag) => (
          <span key={tag.id} style={styles.chip}>
            #{tag.name}
            <button
              type="button"
              style={styles.chipRemove}
              onClick={() => removeTag(tag.id)}
              disabled={disabled}
              aria-label={tag.name}
            >
              x
            </button>
          </span>
        ))}
        <input
          type="text"
          style={styles.input}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKey}
          placeholder={selectedTags.length === 0 ? t.tagPickerPlaceholder : ''}
          disabled={disabled}
        />
      </div>

      {showDropdown && (query.trim() || suggestions.length > 0) && (
        <div style={styles.dropdown} role="listbox">
          {loading && <div style={styles.loading}>{t.tagPickerLoading}</div>}
          {!loading && suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              style={styles.option}
              onClick={() => addTag(tag)}
              role="option"
              aria-selected={false}
            >
              #{tag.name}
              {tag.postCount !== undefined && (
                <span style={styles.optionCount}>({tag.postCount})</span>
              )}
            </button>
          ))}
          {!loading && canCreate && (
            <button
              type="button"
              style={styles.createBtn}
              onClick={() => void createTag()}
            >
              + &quot;{query.trim()}&quot; {t.tagPickerCreateNew}
            </button>
          )}
          {!loading && !canCreate && suggestions.length === 0 && (
            <div style={styles.empty}>{t.tagPickerNoMatch}</div>
          )}
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}
