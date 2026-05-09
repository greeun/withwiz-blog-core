# 05. 댓글 시스템

`createCommentService`는 **트리 구조 댓글**, **상태 기반 모더레이션**, **허니팟 + 레이트 리밋**,
**사용자 정의 스팸 필터**를 지원한다.

## 팩토리

```ts
import { createCommentService, type CommentService } from '@withwiz/blog-core';

const commentService: CommentService = createCommentService(prisma, {
  modelName: 'comment',
  autoApprove: false,         // 기본 false → 관리자 승인 필요
  requireLogin: false,        // 기본 false → 게스트 허용
  maxDepth: 2,                // 루트=1, 대댓글 1단계까지
  rateLimit: { maxPerHour: 5 },
  spamFilter: (content) => /viagra|casino/i.test(content),
});
```

### `CommentServiceConfig`

| 필드 | 기본값 | 설명 |
|---|---|---|
| `modelName` | `'comment'` | Prisma delegate |
| `autoApprove` | `false` | true면 생성 즉시 `APPROVED` |
| `requireLogin` | `false` | true면 `context.userId` 필수 |
| `maxDepth` | `2` | 중첩 최대 깊이 (루트=1) |
| `rateLimit.maxPerHour` | `5` | 동일 IP 1시간당 최대 |
| `spamFilter` | — | `(content: string) => boolean` — true 반환 시 `SPAM` |

## 상태값

```ts
enum CommentStatus {
  PENDING,    // 승인 대기
  APPROVED,   // 공개
  REJECTED,   // 거부 (비공개)
  SPAM,       // 스팸 (비공개, 스팸 필터로 분류)
}
```

공개 목록(`listByPost`)은 `APPROVED`만 반환한다.

## API

### Public

```ts
// 댓글 생성
commentService.create(
  data: CreateCommentInput,
  context: { userId?: string; ipHash?: string },
): Promise<Comment>;

// 공개 댓글 트리
commentService.listByPost(
  postId: string,
  options?: { includeReplies?: boolean },
): Promise<Comment[]>;
```

### Admin

```ts
commentService.listAll({
  page?, limit?,
  status?: CommentStatus,
  postId?: string,
}): Promise<PaginatedResult<Comment>>;

commentService.updateStatus(id: string, status: CommentStatus): Promise<Comment>;
commentService.bulkUpdateStatus(ids: string[], status: CommentStatus): Promise<number>;
commentService.remove(id: string): Promise<void>;
commentService.removeMany(ids: string[]): Promise<number>;
commentService.getPendingCount(): Promise<number>;   // 배지용
```

## 댓글 타입

```ts
interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  content: string;
  status: CommentStatus;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];   // listByPost 결과에서 채워짐
}
```

## 허니팟 + 레이트 리밋 + 스팸 필터

### 허니팟(honeypot) 전략

검증 스키마 `CreateCommentSchema`는 `honeypot` 필드가 비어있어야 통과한다.
폼에서 **사용자에게 숨겨진 input**을 함께 제출하면 봇이 채울 경우 즉시 400으로 반려된다.

```tsx
<form>
  <input type="text" name="content" />
  {/* 봇 미끼 — CSS로 display:none */}
  <input
    type="text"
    name="honeypot"
    tabIndex={-1}
    autoComplete="off"
    className="sr-only"
    aria-hidden="true"
  />
</form>
```

### 레이트 리밋

`rateLimit.maxPerHour`는 `ipHash` 기반이다. 라우트에서 IP를 해시해 넘겨야 한다.

```ts
import { hashIp } from '@withwiz/blog-core';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const ipHash = hashIp(ip);
  const body = await req.json();
  await commentService.create(body, { ipHash, userId: session?.userId });
}
```

> **주의**: `x-forwarded-for`는 프록시가 여러 단계일 때 여러 IP가 쉼표로 구분된다.
> 첫 값이 원본 IP이지만, 호스트 환경에 따라 직접 연결 IP(`req.headers.get('cf-connecting-ip')` 등)를 써야 할 수도 있다.

### 사용자 정의 스팸 필터

```ts
createCommentService(prisma, {
  // ...
  spamFilter: (content) => {
    // URL 3개 이상 → 스팸
    const urlCount = (content.match(/https?:\/\//g) ?? []).length;
    return urlCount >= 3;
  },
});
```

`spamFilter`가 `true`를 반환하면 상태가 `SPAM`으로 저장된다 (차단이 아닌 분류).

## 대댓글(nested replies)

```ts
// 대댓글 생성: parentId 지정
await commentService.create(
  { postId: 'p1', parentId: 'c1', content: '동의합니다', guestName: '방문객' },
  { ipHash },
);
```

`maxDepth` 초과 시 에러를 던진다. 기본값 2는 "대댓글 1단계까지"를 의미한다.
(루트 1, 대댓글 2 → 대대댓글은 거부)

## 모더레이션 워크플로우

1. 사용자가 댓글 작성 → 상태 `PENDING` (autoApprove=false일 때)
2. 스팸 필터 통과 실패 → `SPAM`
3. 관리자가 `CommentModerationPanel`에서 `updateStatus` 호출
4. `APPROVED` → 공개, `REJECTED`/`SPAM` → 비공개 유지

```ts
// 대기 목록 조회
const pending = await commentService.listAll({ status: 'PENDING', page: 1 });

// 일괄 승인
await commentService.bulkUpdateStatus(['id1', 'id2'], 'APPROVED');

// 상단 배지용 개수
const count = await commentService.getPendingCount();
```

## 트리 렌더링 예

```tsx
function CommentNode({ c }: { c: Comment }) {
  return (
    <li>
      <div>{c.guestName ?? 'User'}: {c.content}</div>
      {c.replies && c.replies.length > 0 && (
        <ul>
          {c.replies.map((r) => <CommentNode key={r.id} c={r} />)}
        </ul>
      )}
    </li>
  );
}

export async function CommentList({ postId }: { postId: string }) {
  const roots = await commentService.listByPost(postId, { includeReplies: true });
  return <ul>{roots.map((c) => <CommentNode key={c.id} c={c} />)}</ul>;
}
```

> **주의**: `listByPost`는 트리 구조(루트 배열 + `replies`)로 반환된다.
> 정렬은 생성시각 오름차순(`createdAt ASC`).

## 관련 문서

- [02-prisma-schema.md](./02-prisma-schema.md) — Comment 모델 매핑
- [09-components.md](./09-components.md) — `CommentList`/`CommentForm`/`CommentModerationPanel`
- [10-validators.md](./10-validators.md) — `CreateCommentSchema`
