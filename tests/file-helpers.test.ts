import { describe, it, expect } from 'vitest';
import { formatFileSize, getFileIcon } from '@withwiz/blog-core/utils';

describe('formatFileSize', () => {
  // BC-F-01
  it('0 바이트를 "0B"로 표시한다', () => {
    expect(formatFileSize(0)).toBe('0B');
  });

  // BC-F-02
  it('KB 미만을 바이트 단위로 표시한다', () => {
    expect(formatFileSize(512)).toBe('512B');
  });

  // BC-F-03
  it('정확히 1KB를 "1.0KB"로 표시한다', () => {
    expect(formatFileSize(1024)).toBe('1.0KB');
  });

  // BC-F-04
  it('KB 소수점을 올바르게 표시한다', () => {
    expect(formatFileSize(1536)).toBe('1.5KB');
  });

  // BC-F-05
  it('정확히 1MB를 "1.0MB"로 표시한다', () => {
    expect(formatFileSize(1048576)).toBe('1.0MB');
  });

  // BC-F-06
  it('MB 소수점을 올바르게 표시한다', () => {
    expect(formatFileSize(2621440)).toBe('2.5MB');
  });
});

describe('getFileIcon', () => {
  // BC-F-07
  it('PDF에 문서 이모지를 반환한다', () => {
    expect(getFileIcon('application/pdf')).toBe('\u{1F4C4}');
  });

  // BC-F-08
  it('Word 문서에 메모 이모지를 반환한다', () => {
    expect(getFileIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('\u{1F4DD}');
  });

  // BC-F-09
  it('HWP에 메모 이모지를 반환한다', () => {
    expect(getFileIcon('application/haansofthwp')).toBe('\u{1F4DD}');
  });

  // BC-F-10
  it('Excel에 차트 이모지를 반환한다', () => {
    expect(getFileIcon('application/vnd.ms-excel')).toBe('\u{1F4CA}');
  });

  // BC-F-11
  it('이미지에 이미지 이모지를 반환한다', () => {
    expect(getFileIcon('image/jpeg')).toBe('\u{1F5BC}');
  });

  // BC-F-12
  it('ZIP에 박스 이모지를 반환한다', () => {
    expect(getFileIcon('application/zip')).toBe('\u{1F4E6}');
  });

  // BC-F-13
  it('미지정 타입에 클립 이모지를 반환한다', () => {
    expect(getFileIcon('application/octet-stream')).toBe('\u{1F4CE}');
  });
});
