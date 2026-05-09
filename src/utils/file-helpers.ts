/**
 * 파일 관련 헬퍼 유틸리티
 * 파일 크기 포맷, MIME 타입 기반 아이콘 매핑
 */

/**
 * 바이트 단위의 파일 크기를 사람이 읽기 쉬운 형식(B, KB, MB)으로 포맷한다.
 *
 * @param bytes - 파일 크기 (바이트)
 * @returns 포맷된 파일 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * MIME 타입 기반으로 파일 아이콘 이모지를 반환한다.
 *
 * @param mimeType - 파일의 MIME 타입
 * @returns 아이콘 이모지 문자열
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '\u{1F4C4}';
  if (mimeType.includes('word') || mimeType.includes('hwp') || mimeType.includes('document')) return '\u{1F4DD}';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '\u{1F4CA}';
  if (mimeType.includes('image')) return '\u{1F5BC}';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '\u{1F4E6}';
  return '\u{1F4CE}';
}
