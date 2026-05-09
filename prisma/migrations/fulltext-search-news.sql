-- Full-text search 지원 — 호스트가 "news" 테이블을 사용하는 경우의 참조 예시
-- (blog-core의 fulltext-search.sql은 generic `blog_posts` 테이블 기준)
--
-- 이 파일은 참고용이며, dts-ballet-homepage의 실제 마이그레이션은
-- prisma/migrations/20260414000000_add_blog_tags_comments/migration.sql 에 포함된다.

-- 1. unaccent 확장 (악센트 제거 — 국제화 검색 품질 향상)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. tsvector 생성 컬럼 (title + excerpt + content)
ALTER TABLE news
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      unaccent(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, ''))
    )
  ) STORED;

-- 3. GIN 인덱스 (tsvector 검색 가속)
CREATE INDEX IF NOT EXISTS idx_news_search_vector
  ON news USING GIN (search_vector);
