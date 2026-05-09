import { describe, it, expect } from 'vitest';
import { toLocalDatetime, formatDateTime, formatDate } from '@withwiz/blog-core/utils';

describe('toLocalDatetime', () => {
  // BC-D-01
  it('ISO 문자열을 datetime-local 형식으로 변환한다', () => {
    const d = new Date(2025, 2, 15, 14, 30); // 2025-03-15 14:30 local
    const result = toLocalDatetime(d.toISOString());
    expect(result).toBe('2025-03-15T14:30');
  });

  // BC-D-02
  it('null을 빈 문자열로 반환한다', () => {
    expect(toLocalDatetime(null)).toBe('');
  });

  // BC-D-03
  it('유효하지 않은 날짜를 빈 문자열로 반환한다', () => {
    expect(toLocalDatetime('invalid')).toBe('');
  });

  // BC-D-04
  it('빈 문자열을 빈 문자열로 반환한다', () => {
    expect(toLocalDatetime('')).toBe('');
  });

  // BC-D-05
  it('월과 일을 2자리로 0-padding한다', () => {
    const d = new Date(2025, 0, 5, 9, 5); // 2025-01-05 09:05 local
    const result = toLocalDatetime(d.toISOString());
    expect(result).toBe('2025-01-05T09:05');
  });
});

describe('formatDateTime', () => {
  // BC-D-06
  it('날짜를 YYYY.MM.DD HH:MM 형식으로 포맷한다', () => {
    const d = new Date(2025, 11, 25, 18, 0);
    const result = formatDateTime(d.toISOString());
    expect(result).toBe('2025.12.25 18:00');
  });

  // BC-D-07
  it('null을 대시(-)로 반환한다', () => {
    expect(formatDateTime(null)).toBe('-');
  });

  // BC-D-08
  it('유효하지 않은 날짜를 대시(-)로 반환한다', () => {
    expect(formatDateTime('not-a-date')).toBe('-');
  });
});

describe('formatDate', () => {
  // BC-D-09
  it('날짜를 YYYY.MM.DD 형식으로 포맷한다', () => {
    const d = new Date(2025, 5, 15);
    const result = formatDate(d.toISOString());
    expect(result).toBe('2025.06.15');
  });

  // BC-D-10
  it('null을 대시(-)로 반환한다', () => {
    expect(formatDate(null)).toBe('-');
  });
});
