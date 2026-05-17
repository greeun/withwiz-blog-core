/**
 * IP 해시 유틸리티
 *
 * Node 내장 crypto 모듈만 사용한다.
 * 평문 IP는 저장하지 않고 해시만 DB에 저장하여 프라이버시를 보호한다.
 *
 * 시크릿은 반드시 호스트가 주입한다. 이 라이브러리는 process.env 등
 * 어떤 환경 변수도 직접 읽지 않으며, 기본값/폴백 시크릿도 제공하지 않는다.
 * 시크릿이 주입되지 않으면 즉시 throw 한다(fail-closed).
 */
import { createHmac } from 'node:crypto';

function resolveSecret(secret?: string): string {
  if (secret && secret.length > 0) return secret;
  throw new Error(
    'IP 해시 시크릿이 주입되지 않았습니다. ' +
      'createBlog({ commentHmacSecret })로 시크릿을 주입하거나 ' +
      'hashIp(ip, secret)에 시크릿을 전달하세요. ' +
      '이 라이브러리는 환경 변수를 직접 읽지 않습니다(무조건 주입).',
  );
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
 * secret 미주입 시 throw 한다.
 */
export function hashIp(ip: string, secret?: string): string {
  const key = resolveSecret(secret);
  return createHmac('sha256', key).update(ip).digest('hex');
}
