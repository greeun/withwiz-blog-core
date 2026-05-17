import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommentRoutes } from '../../dist/routes/index.mjs';

function makeService() {
  const captured = {};
  const svc = {
    async create(input, opts) {
      captured.input = input;
      captured.opts = opts;
      return { id: 'c1', ...input };
    },
    async listByPost() {
      return [];
    },
    async listAll() {
      return { items: [], total: 0, page: 1, limit: 20 };
    },
    async updateStatus() {},
    async remove() {},
    async bulkUpdateStatus() {
      return 0;
    },
    async removeMany() {
      return 0;
    },
    async getPendingCount() {
      return 0;
    },
  };
  return { svc, captured };
}

function postReq() {
  return new Request('https://x.test/api/posts/p1/comments', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'cf-connecting-ip': '8.8.8.8',
      'x-real-ip': '7.7.7.7',
      'x-forwarded-for': '9.9.9.9, 1.1.1.1',
    },
    body: JSON.stringify({ content: 'hello world' }),
  });
}

const ctx = { params: Promise.resolve({ postId: 'p1' }) };

async function run(ipHeader) {
  const { svc, captured } = makeService();
  const { public: pub } = createCommentRoutes(svc, {
    hmacSecret: 'test-secret',
    enableValidation: false,
    ...(ipHeader === undefined ? {} : { ipHeader }),
  });
  const res = await pub.create.POST(postReq(), ctx);
  return { res, captured };
}

test("ipHeader 'auto'(기본): cf-connecting-ip 채택 → ipHash 정의됨", async () => {
  const { res, captured } = await run(undefined);
  assert.equal(res.status, 201);
  assert.match(captured.opts.ipHash, /^[0-9a-f]{64}$/);
});

test("ipHeader 'none': 헤더 있어도 IP 미수집 → ipHash undefined", async () => {
  const { res, captured } = await run('none');
  assert.equal(res.status, 201);
  assert.equal(captured.opts.ipHash, undefined);
});

test("명시 헤더 'x-forwarded-for': 첫 세그먼트 사용, auto와 다른 해시", async () => {
  const auto = await run('auto');
  const xff = await run('x-forwarded-for');
  assert.match(xff.captured.opts.ipHash, /^[0-9a-f]{64}$/);
  assert.notEqual(
    auto.captured.opts.ipHash,
    xff.captured.opts.ipHash,
    '8.8.8.8(cf) 해시 ≠ 9.9.9.9(xff) 해시',
  );
});

test("스푸핑 방어: 'none'이면 어떤 프록시 헤더도 신뢰하지 않음", async () => {
  const { captured } = await run('none');
  assert.equal(captured.opts.ipHash, undefined);
  assert.equal(captured.input.content, 'hello world', '댓글 자체는 정상 생성');
});
