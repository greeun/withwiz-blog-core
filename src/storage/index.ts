/**
 * blog-core-v2 스토리지 어댑터 re-export (서버 전용 — 엔트리 분리로 경계 강제)
 */
export { createS3StorageAdapter } from './s3-adapter';
export type { S3StorageConfig } from './s3-adapter';
