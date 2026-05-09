# 07. 예약 발행 (Scheduler)

`createSchedulerService`는 `publishedAt`이 미래이고 `published=false`인 글을,
현재 시각이 `publishedAt`을 지나면 자동으로 `published=true`로 전환한다.

트리거는 **외부 Cron 시스템**(node-cron, GitHub Actions, AWS EventBridge 등)이 담당한다.
패키지는 HTTP 라우트 팩토리 `createSchedulerRoutes`를 제공한다.

## 서비스 팩토리

```ts
import { createSchedulerService, type SchedulerService } from '@withwiz/blog-core';

const schedulerService: SchedulerService = createSchedulerService(prisma, {
  modelName: 'news',   // 기본 'blogPost'
});
```

### API

```ts
interface ProcessScheduledResult {
  processed: number;
  postIds: string[];
}

schedulerService.processScheduledPosts(): Promise<ProcessScheduledResult>;
schedulerService.listScheduled(options?: { limit?: number }): Promise<BlogListItem[]>;
schedulerService.cancelSchedule(postId: string): Promise<void>;
```

- `processScheduledPosts`: 지금 시각이 지난 예약 글을 `updateMany`로 일괄 발행 전환.
- `listScheduled`: 아직 미래인 예약 글 (기본 50건, `publishedAt ASC`).
- `cancelSchedule`: `publishedAt`을 `null`로 돌려 예약 취소.

## 라우트 팩토리 — `createSchedulerRoutes`

Next.js App Router에서 바로 사용할 수 있는 핸들러를 반환한다.

```ts
// app/api/cron/blog-publish/route.ts
import { createSchedulerRoutes, createSchedulerService } from '@withwiz/blog-core';
import { prisma } from '@/lib/prisma';

const schedulerService = createSchedulerService(prisma, { modelName: 'news' });
const routes = createSchedulerRoutes({
  schedulerService,
  cronSecret: process.env.CRON_SECRET!,
});

export const GET = routes.publishScheduled.GET;
export const POST = routes.publishScheduled.POST;
```

요청은 `Authorization: Bearer <CRON_SECRET>` 헤더로 인증된다.
누락/불일치 시 `401 Unauthorized`.

### 응답 형식

```json
// 200
{ "success": true, "processed": 3, "postIds": ["c1","c2","c3"] }

// 401
{ "success": false, "error": "Unauthorized" }

// 500
{ "success": false, "error": "…" }
```

## Cron 연동 가이드 (크로스 플랫폼)

### 1) Node.js (node-cron — 자가 스케줄링)

```ts
// scripts/scheduler.ts
import cron from 'node-cron';
import { schedulerService } from '@/lib/services/scheduler';

// 1분마다 실행
cron.schedule('* * * * *', async () => {
  const result = await schedulerService.processScheduledPosts();
  if (result.processed > 0) {
    console.log(`Published: ${result.processed}`, result.postIds);
  }
});
```

> **주의**: Next.js 서버리스 환경에서는 프로세스가 유지되지 않는다.
> node-cron은 **장기 실행 Node 서버 또는 별도 워커**에서만 의미가 있다.

### 2) Docker crontab

```dockerfile
# Dockerfile (cron worker)
FROM node:20-alpine
RUN apk add --no-cache curl
COPY crontab /etc/crontabs/root
CMD ["crond", "-f"]
```

```cron
# crontab — 1분마다 HTTP 트리거
* * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://example.com/api/cron/blog-publish
```

### 3) GitHub Actions

```yaml
# .github/workflows/blog-scheduler.yml
name: Blog Scheduler
on:
  schedule:
    - cron: '*/5 * * * *'   # 5분마다
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger scheduled publish
        run: |
          curl -fsS -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://example.com/api/cron/blog-publish
```

### 4) AWS EventBridge + Lambda (또는 HTTP 타겟)

EventBridge 규칙에 cron 표현식을 설정한 뒤, 대상을:
- **Lambda**: `fetch`로 Next.js 엔드포인트 POST 호출
- **HTTP API target**: 직접 호출 (커넥터 연결 필요)

```js
// Lambda handler 예
export const handler = async () => {
  const res = await fetch(process.env.CRON_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  return { statusCode: res.status };
};
```

### 5) GCP Cloud Scheduler

```bash
gcloud scheduler jobs create http blog-publish \
  --schedule "*/5 * * * *" \
  --uri "https://example.com/api/cron/blog-publish" \
  --http-method POST \
  --headers "Authorization=Bearer $CRON_SECRET"
```

### 6) Vercel Cron (간단 언급)

Vercel을 쓴다면 `vercel.json`에 Cron을 등록할 수 있다 (본 프로젝트는 미사용).

```json
// vercel.json (사용 시)
{
  "crons": [{ "path": "/api/cron/blog-publish", "schedule": "*/5 * * * *" }]
}
```

Vercel이 GET 요청을 자동으로 호출하며, 동일한 `Authorization: Bearer` 헤더를 보낸다.

## 예약 글 만들기

```ts
await blogService.create(
  {
    slug: 'summer-2026',
    title: '여름 공연',
    content: '...',
    category: 'performance',
    published: false,                        // 아직 미공개
    publishedAt: new Date('2026-06-01T09:00:00+09:00'),  // 예약 시각
  },
  'author-id',
);
```

`publishedAt`이 미래 + `published=false` 조합을 **예약 상태**로 인식한다.

## CRON_SECRET 보안

- 최소 32자 랜덤 문자열 권장.
- `.env`에서 절대 커밋하지 말 것.
- GitHub Secrets / AWS SSM / Vercel Env 등 보안 저장소 사용.

> **주의**: 짧은 `CRON_SECRET`은 브루트포스에 취약하다. `openssl rand -hex 32` 같은 명령으로 생성하자.

> **주의**: Cron 주기를 너무 짧게 하면 DB 부하가 커진다. 보통 1~5분이 무난.

## 관련 문서

- [03-blog-service.md](./03-blog-service.md) — 글 생성 시 `publishedAt`
- [10-validators.md](./10-validators.md) — `publishedAt` 검증
