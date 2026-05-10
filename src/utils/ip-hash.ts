/**
 * IP 해시 유틸리티
 *
 * Node 내장 crypto 모듈만 사용한다.
 * 평문 IP는 저장하지 않고 해시만 DB에 저장하여 프라이버시를 보호한다.
 */
import { createHmac } from 'node:crypto';

const DEV_FALLBACK_SECRET = 'dev-fallback-secret';
let devWarningEmitted = false;

function resolveSecret(secret?: string): string {
  if (secret && secret.length > 0) return secret;

  const envSecret =
    process.env.IP_HASH_SECRET ?? process.env.COMMENT_IP_HASH_SECRET;
  if (envSecret && envSecret.length > 0) return envSecret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'IP_HASH_SECRET 환경 변수가 설정되지 않았습니다. ' +
        '프로덕션 환경에서는 IP 해시 시크릿이 반드시 필요합니다.',
    );
  }

  if (!devWarningEmitted) {
    devWarningEmitted = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[blog-core-v2/ip-hash] 시크릿이 주입되지 않아 개발용 fallback을 사용합니다. ' +
        '운영 환경에서는 IP_HASH_SECRET을 반드시 설정하세요.',
    );
  }
  return DEV_FALLBACK_SECRET;
}

/**
 * IP 해시 함수를 캡슐화한 팩토리.
 */
export function createIpHasher(secret: string): (ip: string) => string {
  if (!secret || secret.length === 0) {
    throw new Error('createIpHasher: secret은 비어 있을 수 없습니다.');
  }
  return (ip: string) => createHmac('sha256', secret).update(ip).digest('hex');
}

/**
 * IP 주소를 HMAC-SHA256으로 해시한다.
 */
export function hashIp(ip: string, secret?: string): string {
  const key = resolveSecret(secret);
  return createHmac('sha256', key).update(ip).digest('hex');
}
