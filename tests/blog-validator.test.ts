import { describe, it, expect } from 'vitest';
import {
  slugSchema,
  optionalUrlSchema,
  attachmentSchema,
  CreateBlogPostSchema,
  UpdateBlogPostSchema,
  BulkUpdateSchema,
  createBlogSchemas,
} from '@withwiz/blog-core/validators';

describe('slugSchema', () => {
  // BC-V-01
  it('유효한 slug를 통과시킨다', () => {
    expect(slugSchema.safeParse('hello-world').success).toBe(true);
  });

  // BC-V-02
  it('빈 문자열을 거부한다', () => {
    expect(slugSchema.safeParse('').success).toBe(false);
  });

  // BC-V-03
  it('201자 이상을 거부한다', () => {
    const longSlug = 'a'.repeat(201);
    expect(slugSchema.safeParse(longSlug).success).toBe(false);
  });

  // BC-V-04
  it('대문자를 거부한다', () => {
    expect(slugSchema.safeParse('Hello').success).toBe(false);
  });
});

describe('optionalUrlSchema', () => {
  // BC-V-05
  it('유효한 https URL을 통과시킨다', () => {
    expect(optionalUrlSchema.safeParse('https://example.com').success).toBe(true);
  });

  // BC-V-06
  it('빈 문자열을 통과시킨다', () => {
    expect(optionalUrlSchema.safeParse('').success).toBe(true);
  });

  // BC-V-07
  it('file:// 프로토콜을 차단한다', () => {
    expect(optionalUrlSchema.safeParse('file:///etc/passwd').success).toBe(false);
  });

  // BC-V-08
  it('javascript: 프로토콜을 차단한다', () => {
    expect(optionalUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });

  // BC-V-09
  it('data: 프로토콜을 차단한다', () => {
    expect(optionalUrlSchema.safeParse('data:text/html,<script>alert(1)</script>').success).toBe(false);
  });
});

describe('attachmentSchema', () => {
  // BC-V-10
  it('필수 필드 누락 시 실패한다', () => {
    expect(attachmentSchema.safeParse({}).success).toBe(false);
  });

  // BC-V-11
  it('유효한 데이터를 통과시킨다', () => {
    const valid = {
      name: 'file.pdf',
      url: 'https://example.com/file.pdf',
      key: 'uploads/file.pdf',
      size: 1024,
      type: 'application/pdf',
    };
    expect(attachmentSchema.safeParse(valid).success).toBe(true);
  });
});

describe('CreateBlogPostSchema', () => {
  const validData = {
    title: '테스트 글',
    content: '<p>본문 내용</p>',
    category: 'NOTICE',
    slug: 'test-post',
  };

  // BC-V-12
  it('유효한 데이터를 통과시킨다', () => {
    expect(CreateBlogPostSchema.safeParse(validData).success).toBe(true);
  });

  // BC-V-13
  it('제목 빈 문자열을 거부하고 에러 메시지를 확인한다', () => {
    const result = CreateBlogPostSchema.safeParse({ ...validData, title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleError = result.error.issues.find((i) => i.path.includes('title'));
      expect(titleError?.message).toBe('제목을 입력해주세요');
    }
  });

  // BC-V-14
  it('content 빈 문자열을 거부한다', () => {
    const result = CreateBlogPostSchema.safeParse({ ...validData, content: '' });
    expect(result.success).toBe(false);
  });

  // BC-V-15
  it('featured와 published 기본값이 false이다', () => {
    const result = CreateBlogPostSchema.parse(validData);
    expect(result.featured).toBe(false);
    expect(result.published).toBe(false);
  });

  // BC-V-16
  it('attachments 기본값이 빈 배열이다', () => {
    const result = CreateBlogPostSchema.parse(validData);
    expect(result.attachments).toEqual([]);
  });

  // BC-V-17
  it('attachments 6개를 거부한다 (max 5)', () => {
    const attachment = {
      name: 'f.pdf',
      url: 'https://example.com/f.pdf',
      key: 'k',
      size: 100,
      type: 'application/pdf',
    };
    const result = CreateBlogPostSchema.safeParse({
      ...validData,
      attachments: Array(6).fill(attachment),
    });
    expect(result.success).toBe(false);
  });

  // BC-V-18
  it('publishedAt 문자열을 Date로 강제 변환한다', () => {
    const result = CreateBlogPostSchema.parse({
      ...validData,
      publishedAt: '2025-06-15T10:00:00Z',
    });
    expect(result.publishedAt).toBeInstanceOf(Date);
  });
});

describe('UpdateBlogPostSchema', () => {
  // BC-V-19
  it('빈 객체를 통과시킨다 (partial)', () => {
    expect(UpdateBlogPostSchema.safeParse({}).success).toBe(true);
  });
});

describe('BulkUpdateSchema', () => {
  // BC-V-20
  it('빈 ids 배열을 거부하고 에러 메시지를 확인한다', () => {
    const result = BulkUpdateSchema.safeParse({ ids: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const idsError = result.error.issues.find((i) => i.path.includes('ids'));
      expect(idsError?.message).toBe('대상을 선택해주세요');
    }
  });

  // BC-V-21
  it('ids 1개 이상을 통과시킨다', () => {
    expect(BulkUpdateSchema.safeParse({ ids: ['id-1'] }).success).toBe(true);
  });
});

describe('createBlogSchemas', () => {
  // BC-V-22
  it('maxAttachments=3일 때 4개를 거부한다', () => {
    const { CreateBlogPostSchema: Schema } = createBlogSchemas({ maxAttachments: 3 });
    const attachment = {
      name: 'f.pdf',
      url: 'https://example.com/f.pdf',
      key: 'k',
      size: 100,
      type: 'application/pdf',
    };
    const result = Schema.safeParse({
      title: '제목',
      content: '본문',
      category: 'NOTICE',
      slug: 'test',
      attachments: Array(4).fill(attachment),
    });
    expect(result.success).toBe(false);
  });

  // BC-V-23
  it('maxAttachments=3일 때 3개를 통과시킨다', () => {
    const { CreateBlogPostSchema: Schema } = createBlogSchemas({ maxAttachments: 3 });
    const attachment = {
      name: 'f.pdf',
      url: 'https://example.com/f.pdf',
      key: 'k',
      size: 100,
      type: 'application/pdf',
    };
    const result = Schema.safeParse({
      title: '제목',
      content: '본문',
      category: 'NOTICE',
      slug: 'test',
      attachments: Array(3).fill(attachment),
    });
    expect(result.success).toBe(true);
  });
});
