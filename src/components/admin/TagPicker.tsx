"use client";

/**
 * 태그 선택/생성 컴포넌트
 *
 * 기존 태그를 자동완성으로 선택하거나, 없는 태그는 새로 생성할 수 있다.
 * fetch 기반으로 REST API와 통신한다.
 *
 * API 계약:
 *   GET    {apiBasePath}?search=xxx   → { items: Tag[] } 또는 PaginatedResult<Tag>
 *   POST   {apiBasePath}              → Tag (body: { slug, name })
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Tag } from "../../types";
import type { BlogI18nStrings } from "../../types/blog";
import { resolveI18n } from "../../i18n";

interface TagPickerProps {
  /** 현재 선택된 태그 ID 배열 */
  selectedTagIds: string[];
  /** 선택 변경 콜백 */
  onChange: (ids: string[]) => void;
  /** 태그 API 기본 경로 (예: "/api/admin/tags") */
  apiBasePath: string;
  /** placeholder 문구 (미제공 시 i18n.tagPickerPlaceholder 사용) */
  placeholder?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 자동완성 디바운스(ms) — default: 200 */
  debounceMs?: number;
  /** i18n 오버라이드 (선택) — 미제공 시 한국어 기본값 사용 */
  i18n?: BlogI18nStrings;
}

/** 문자열을 URL-safe slug로 단순 변환 */
function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 태그 선택/생성 피커 */
export default function TagPicker({
  selectedTagIds,
  onChange,
  apiBasePath,
  placeholder,
  disabled = false,
  debounceMs = 200,
  i18n,
}: TagPickerProps) {
  const i18nT = resolveI18n(i18n);
  const effectivePlaceholder = placeholder ?? i18nT.tagPickerPlaceholder;
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 초기 마운트 시 이미 선택된 태그들의 정보를 불러옴
  useEffect(() => {
    if (selectedTagIds.length === 0) {
      setSelectedTags([]);
      return;
    }
    // selectedTags에 이미 모두 있으면 스킵
    const missing = selectedTagIds.filter(
      (id) => !selectedTags.some((t) => t.id === id),
    );
    if (missing.length === 0) return;

    // 간단한 전체 fetch — 실제 운영 시 더 효율적인 bulk endpoint 필요
    fetch(apiBasePath, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((json) => {
        const items: Tag[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.data)
          ? json.data
          : [];
        const matched = items.filter((t) => selectedTagIds.includes(t.id));
        setSelectedTags(matched);
      })
      .catch(() => {
        /* 무시 */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagIds.join(",")]);

  // 쿼리 변경 시 자동완성 요청 (디바운스)
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
        const res = await fetch(url, { credentials: "same-origin" });
        const json = await res.json();
        const items: Tag[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.data)
          ? json.data
          : [];
        // 이미 선택된 것 제외
        setSuggestions(items.filter((t) => !selectedTagIds.includes(t.id)));
      } catch (e) {
        setError(i18nT.errorNetwork);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, apiBasePath, debounceMs, selectedTagIds]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addTag = (tag: Tag) => {
    if (selectedTagIds.includes(tag.id)) return;
    setSelectedTags([...selectedTags, tag]);
    onChange([...selectedTagIds, tag.id]);
    setQuery("");
    setSuggestions([]);
  };

  const removeTag = (id: string) => {
    setSelectedTags(selectedTags.filter((t) => t.id !== id));
    onChange(selectedTagIds.filter((x) => x !== id));
  };

  const createTag = async () => {
    const name = query.trim();
    if (!name) return;
    const slug = toSlug(name);
    if (!slug) {
      setError(i18nT.tagPickerInvalidName);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBasePath, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? i18nT.errorUnknown);
      }
      const json = await res.json();
      const tag: Tag = json?.data ?? json;
      addTag(tag);
    } catch (e: any) {
      setError(e?.message ?? i18nT.errorUnknown);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (query.trim()) {
        void createTag();
      }
    } else if (e.key === "Backspace" && !query && selectedTags.length > 0) {
      // 빈 입력에서 백스페이스 → 마지막 태그 제거
      removeTag(selectedTags[selectedTags.length - 1].id);
    }
  };

  const exactMatch = suggestions.some(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
  );
  const canCreate = query.trim().length > 0 && !exactMatch;

  return (
    <div ref={containerRef} className="blog-tag-picker">
      <div className="blog-tag-picker__selected">
        {selectedTags.map((t) => (
          <span key={t.id} className="blog-tag-picker__chip">
            #{t.name}
            <button
              type="button"
              className="blog-tag-picker__chip-remove"
              onClick={() => removeTag(t.id)}
              disabled={disabled}
              aria-label={t.name}
            >
              {/* 제거 아이콘 */}
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          className="blog-tag-picker__input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKey}
          placeholder={selectedTags.length === 0 ? effectivePlaceholder : ""}
          disabled={disabled}
        />
      </div>

      {showDropdown && (query.trim() || suggestions.length > 0) && (
        <div className="blog-tag-picker__dropdown" role="listbox">
          {loading && <div className="blog-tag-picker__loading">{i18nT.tagPickerLoading}</div>}
          {!loading && suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              className="blog-tag-picker__option"
              onClick={() => addTag(t)}
              role="option"
              aria-selected={false}
            >
              #{t.name}
              {t.postCount !== undefined && (
                <span className="blog-tag-picker__option-count">({t.postCount})</span>
              )}
            </button>
          ))}
          {!loading && canCreate && (
            <button
              type="button"
              className="blog-tag-picker__create"
              onClick={() => void createTag()}
            >
              + &quot;{query.trim()}&quot; {i18nT.tagPickerCreateNew}
            </button>
          )}
          {!loading && !canCreate && suggestions.length === 0 && (
            <div className="blog-tag-picker__empty">{i18nT.tagPickerNoMatch}</div>
          )}
        </div>
      )}

      {error && <div className="blog-tag-picker__error">{error}</div>}
    </div>
  );
}

export { TagPicker };
