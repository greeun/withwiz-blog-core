# 02. Prisma 스키마 통합

`@withwiz/blog-core`는 자체 Prisma 마이그레이션을 실행하지 않는다.
참조용 스키마는 `packages/blog-core/prisma/blog.prisma`에 있으며,
호스트 프로젝트가 이를 **복사/각색**하여 자신의 `schema.prisma`에 포함시킨다.

## 참조 스키마 (요약)

```prisma
model BlogPost {
  id            String   @id @default(cuid())
  slug          String   @unique
  category      BlogCategory
  title         String
  content       String   @db.Text
  excerpt       String?
  coverImageUrl String?  @map("cover_image_url")
  coverImageKey String?  @map("cover_image_key")
  attachments   Json?    @default("[]")
  featured      Boolean  @default(false)
  published     Boolean  @default(false)
  publishedAt   DateTime? @map("published_at")
  authorId      String   @map("author_id")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  tags     PostTag[]
  comments Comment[]

  @@index([published, publishedAt(sort: Desc)])
  @@index([published, featured, publishedAt(sort: Desc)])
  @@index([category])
  @@map("blog_posts")
}

model Tag {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  posts PostTag[]
  @@map("tags")
}

model PostTag {
  postId     String
  tagId      String
  assignedAt DateTime @default(now())

  post BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag  Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@index([tagId])
  @@map("post_tags")
}

model Comment {
  id         String        @id @default(cuid())
  postId     String
  parentId   String?
  authorId   String?
  guestName  String?
  guestEmail String?
  content    String        @db.Text
  status     CommentStatus @default(PENDING)
  ipHash     String?
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  post    BlogPost  @relation(fields: [postId], references: [id], onDelete: Cascade)
  parent  Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies Comment[] @relation("CommentReplies")

  @@index([postId, status, createdAt])
  @@index([ipHash, createdAt])
  @@map("comments")
}

enum CommentStatus {
  PENDING
  APPROVED
  REJECTED
  SPAM
}
```

## 모델명 커스터마이즈 — `BlogPost` → `News`

호스트 프로젝트에서 모델명을 `News`로 쓰려면 아래처럼 작성한다.

```prisma
model News {
  id            String   @id @default(cuid())
  slug          String   @unique
  category      String
  title         String
  content       String   @db.Text
  // ... 동일 필드
  tags     PostTag[]
  comments Comment[]
  @@map("news")
}

model PostTag {
  newsId     String   @map("news_id")
  tagId      String
  assignedAt DateTime @default(now())

  news News @relation(fields: [newsId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([newsId, tagId])
  @@index([tagId])
  @@map("post_tags")
}

model Comment {
  id        String  @id @default(cuid())
  newsId    String  @map("news_id")
  // ...
  news News @relation(fields: [newsId], references: [id], onDelete: Cascade)
}
```

> **주의**: blog-core 서비스는 delegate 이름을 config로 주입받으므로,
> `modelName: 'news'`, `postModelName: 'news'`로 설정하면 동작한다.
> FK 컬럼 이름(`news_id`)은 Prisma select 시 자동으로 `newsId`로 매핑된다.

## category 타입 전략

blog-core는 `category`를 **문자열**로 처리한다. 호스트가 enum을 쓰든 문자열을 쓰든 호환된다.

```prisma
// 방법 A: enum
enum NewsCategory { notice performance media }
model News { category NewsCategory }

// 방법 B: 단순 문자열
model News { category String }
```

## 전문 검색(Full-Text Search) 마이그레이션 SQL

PostgreSQL FTS를 쓰려면 마이그레이션 SQL을 직접 추가한다.
아래는 `news` 테이블 기준 예시다 (일반 `blog_posts`는
`packages/blog-core/prisma/migrations/fulltext-search.sql` 참조).

```sql
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
```

이 SQL을 `prisma/migrations/<timestamp>_add_fts/migration.sql`에 넣은 뒤
`npx prisma migrate dev`를 실행한다.

> **주의**: `GENERATED ALWAYS AS ... STORED` 컬럼은 Prisma 스키마에
> 선언하지 않아도 된다. SearchService가 raw SQL로 직접 사용한다.

## 태그/댓글 없이 쓰기

태그/댓글이 필요 없다면 `BlogPost`(또는 `News`)만 두고 `Tag/PostTag/Comment` 모델을 생략해도 된다.
`createBlogService`에 `enableTags: false`를 주고 `TagService`/`CommentService`를 생성하지 않으면 된다.

## 관련 문서

- [03-blog-service.md](./03-blog-service.md) — 서비스 설정
- [04-tags.md](./04-tags.md) — 태그 스키마 상세
- [06-search.md](./06-search.md) — FTS 사용법
