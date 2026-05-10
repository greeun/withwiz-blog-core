/**
 * 파일 관련 헬퍼 유틸리티
 */

/**
 * 바이트 단위의 파일 크기를 사람이 읽기 쉬운 형식으로 포맷한다.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * MIME 타입 기반으로 파일 아이콘 이모지를 반환한다.
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '\u{1F4C4}';
  if (mimeType.includes('word') || mimeType.includes('hwp') || mimeType.includes('document')) return '\u{1F4DD}';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '\u{1F4CA}';
  if (mimeType.includes('image')) return '\u{1F5BC}';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '\u{1F4E6}';
  return '\u{1F4CE}';
}
