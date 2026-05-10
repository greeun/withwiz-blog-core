/**
 * S3 호환 스토리지 어댑터
 *
 * @aws-sdk/client-s3를 dynamic import로 로드하여
 * 사용하지 않는 프로젝트에서 SDK 설치를 강제하지 않는다.
 *
 * S3, Cloudflare R2, MinIO 등 S3 API 호환 서비스와 동작한다.
 */
import type { StorageAdapter } from '../types/config';

// ── S3 설정 ──

/** S3 호환 스토리지 설정 */
export interface S3StorageConfig {
  /** S3 버킷명 */
  bucket: string;
  /** AWS 리전 (예: 'ap-northeast-2', R2의 경우 'auto') */
  region: string;
  /** S3 호환 엔드포인트 URL (R2, MinIO 등에서 필요) */
  endpoint?: string;
  /** AWS 인증 정보 */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  /**
   * 스토리지 키 접두사 (예: 'blog/', 'uploads/')
   * collectKeysFromHtml에서 URL -> 키 변환 시 사용
   */
  keyPrefix?: string;
  /**
   * 공개 URL 패턴 (regex)
   * HTML에서 이미지 URL을 매칭할 때 사용
   * 미제공 시 기본 패턴: bucket/endpoint 기반 자동 생성
   */
  publicUrlPattern?: RegExp;
  /**
   * URL -> 키 변환 함수 (optional)
   * 미제공 시 기본 변환 로직 사용
   */
  urlToKey?: (url: string) => string | null;
}

// ── S3 삭제 배치 크기 ──
const DELETE_BATCH_SIZE = 1000; // S3 DeleteObjects max

// ── 기본 URL -> 키 매칭 패턴 ──

/**
 * HTML에서 이미지/미디어 URL을 추출하는 기본 패턴
 * src="...", href="..." 속성에서 URL을 추출한다.
 */
const ATTR_URL_RE = /(?:src|href)=["']([^"']+)["']/gi;

// ── 팩토리 함수 ──

/**
 * S3 호환 스토리지 어댑터를 생성한다.
 *
 * @param config - S3 설정 (bucket, region, endpoint, credentials 등)
 * @returns StorageAdapter 구현체
 *
 * @example
 * ```typescript
 * import { createS3StorageAdapter } from 'blog-core-v2/storage';
 *
 * const storage = createS3StorageAdapter({
 *   bucket: 'my-blog-assets',
 *   region: 'auto',
 *   endpoint: 'https://<account>.r2.cloudflarestorage.com',
 *   credentials: {
 *     accessKeyId: process.env.R2_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
 *   },
 *   keyPrefix: 'blog/',
 * });
 *
 * const blog = createBlog({ ..., storage });
 * ```
 */
export function createS3StorageAdapter(config: S3StorageConfig): StorageAdapter {
  const { bucket, region, endpoint, credentials, keyPrefix = '' } = config;

  // URL -> 키 변환 함수 결정
  const extractKey = config.urlToKey ?? createDefaultUrlToKey(config);

  return {
    async deleteKeys(keys: string[]): Promise<void> {
      if (keys.length === 0) return;

      // 중복 제거
      const uniqueKeys = [...new Set(keys)];

      // @aws-sdk/client-s3 dynamic import (optional peer dependency)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      let s3Module: any;
      try {
        s3Module = await (Function('return import("@aws-sdk/client-s3")')() as Promise<any>);
      } catch {
        // eslint-disable-next-line no-console
        console.error('[blog-core-v2] @aws-sdk/client-s3 is not installed. Storage cleanup skipped.');
        return;
      }

      const { S3Client, DeleteObjectsCommand } = s3Module;

      const client = new S3Client({
        region,
        ...(endpoint ? { endpoint } : {}),
        ...(credentials ? { credentials } : {}),
      });

      // S3 DeleteObjects는 한 번에 최대 1000개까지 삭제 가능
      for (let i = 0; i < uniqueKeys.length; i += DELETE_BATCH_SIZE) {
        const batch = uniqueKeys.slice(i, i + DELETE_BATCH_SIZE);

        try {
          await client.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: {
                Objects: batch.map((Key: string) => ({ Key })),
                Quiet: true,
              },
            }),
          );
        } catch (err) {
          // 삭제 실패 시 에러 로깅만 하고 계속 진행 (글 삭제 자체는 성공해야 함)
          // eslint-disable-next-line no-console
          console.error('[blog-core-v2] S3 deleteKeys failed for batch:', err);
        }
      }
    },

    collectKeysFromHtml(html: string | null): string[] {
      if (!html) return [];

      const keys: string[] = [];
      let match: RegExpExecArray | null;

      // HTML 속성에서 URL 추출
      const regex = new RegExp(ATTR_URL_RE.source, ATTR_URL_RE.flags);
      while ((match = regex.exec(html)) !== null) {
        const url = match[1];
        if (!url) continue;
        const key = extractKey(url);
        if (key) keys.push(key);
      }

      return [...new Set(keys)]; // 중복 제거
    },
  };
}

// ── 내부 헬퍼 ──

/**
 * 기본 URL -> 키 변환 함수를 생성한다.
 *
 * URL에서 버킷/엔드포인트 부분을 제거하고 키를 추출한다.
 * keyPrefix가 설정된 경우, 해당 접두사를 가진 경로만 매칭한다.
 */
function createDefaultUrlToKey(config: S3StorageConfig): (url: string) => string | null {
  // 커스텀 publicUrlPattern이 제공된 경우
  if (config.publicUrlPattern) {
    const pattern = config.publicUrlPattern;
    return (url: string) => {
      const m = pattern.exec(url);
      if (!m) return null;
      // 캡처 그룹이 있으면 첫 번째 그룹이 키, 없으면 전체 매칭
      return m[1] ?? m[0] ?? null;
    };
  }

  // 엔드포인트/버킷 기반 자동 패턴 생성
  const urlBases: string[] = [];

  if (config.endpoint) {
    // R2/MinIO: endpoint 기반
    const base = config.endpoint.replace(/\/$/, '');
    urlBases.push(`${base}/${config.bucket}/`);
    // 커스텀 도메인 (버킷 이름 없이 직접 접근하는 경우)
    urlBases.push(`${base}/`);
  }

  // 표준 S3 URL 패턴
  urlBases.push(`https://${config.bucket}.s3.${config.region}.amazonaws.com/`);
  urlBases.push(`https://${config.bucket}.s3.amazonaws.com/`);
  urlBases.push(`https://s3.${config.region}.amazonaws.com/${config.bucket}/`);

  const prefix = config.keyPrefix ?? '';

  return (url: string) => {
    for (const base of urlBases) {
      if (url.startsWith(base)) {
        const key = url.slice(base.length);
        if (key && (!prefix || key.startsWith(prefix))) {
          return decodeURIComponent(key);
        }
      }
    }
    return null;
  };
}
