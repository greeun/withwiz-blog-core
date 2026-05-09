/**
 * IP 해시 유틸리티
 *
 * Node 내장 crypto 모듈만 사용한다 (bcrypt 등 외부 의존성 없음).
 * 평문 IP는 저장하지 않고 해시만 DB에 저장하여 프라이버시를 보호한다.
 *
 * 보안 정책:
 * - 프로덕션(`NODE_ENV === 'production'`)에서는 시크릿이 반드시 주입되어야 한다.
 *   (env `IP_HASH_SECRET` 또는 `COMMENT_IP_HASH_SECRET`, 또는 함수 인자)
 * - 시크릿이 없으면 즉시 오류를 던져 fallback 시크릿이 운영 환경에 노출되는 것을 차단한다.
 * - 개발 환경에서는 fallback 시크릿을 사용하되 경고 로그를 남긴다.
 */
import { createHmac } from 'node:crypto';

/** 개발 전용 fallback (절대 프로덕션에서 사용 금지) */
const DEV_FALLBACK_SECRET = 'dev-fallback-secret';

/** 한 번만 경고를 출력하기 위한 플래그 (프로세스 단위) */
let devWarningEmitted = false;

/**
 * 환경/인자에서 시크릿을 결정한다.
 * @throws 프로덕션 환경에서 시크릿이 없는 경우
 */
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

  // 개발 환경 — 한 번만 경고 출력
  if (!devWarningEmitted) {
    devWarningEmitted = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[blog-core/ip-hash] 시크릿이 주입되지 않아 개발용 fallback을 사용합니다. ' +
        '운영 환경에서는 IP_HASH_SECRET을 반드시 설정하세요.',
    );
  }
  return DEV_FALLBACK_SECRET;
}

/**
 * IP 해시 함수를 캡슐화한 팩토리.
 *
 * 권장 사용 패턴 — 호스트 부팅 시 1회 생성하여 재사용한다.
 *
 * @param secret - HMAC 비밀키 (필수). 빈 문자열은 허용하지 않는다.
 * @returns `(ip: string) => string` 형태의 해시 함수
 */
export function createIpHasher(secret: string): (ip: string) => string {
  if (!secret || secret.length === 0) {
    throw new Error('createIpHasher: secret은 비어 있을 수 없습니다.');
  }
  return (ip: string) => createHmac('sha256', secret).update(ip).digest('hex');
}

/**
 * IP 주소를 HMAC-SHA256으로 해시한다.
 *
 * @deprecated `createIpHasher(secret)`를 사용하세요. 이 함수는 하위 호환을 위해 유지됩니다.
 * @param ip - 평문 IP 주소 (IPv4/IPv6)
 * @param secret - HMAC 비밀키. 미주입 시 환경 변수(IP_HASH_SECRET, COMMENT_IP_HASH_SECRET)에서 조회.
 *                 둘 다 없으면 프로덕션에서는 오류, 개발에서는 경고 후 fallback 사용.
 * @returns hex 인코딩된 해시 문자열
 */
export function hashIp(ip: string, secret?: string): string {
  const key = resolveSecret(secret);
  return createHmac('sha256', key).update(ip).digest('hex');
}
