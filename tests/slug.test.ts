import { describe, it, expect } from 'vitest';
import { generateSlug, isValidSlug } from '@withwiz/blog-core/utils';

describe('generateSlug', () => {
  // BC-S-01
  it('영문 대문자를 소문자로 변환한다', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  // BC-S-02
  it('공백을 하이픈으로 변환한다', () => {
    expect(generateSlug('my title here')).toBe('my-title-here');
  });

  // BC-S-03
  it('특수문자를 제거한다', () => {
    const result = generateSlug('hello@world!');
    expect(result).not.toContain('@');
    expect(result).not.toContain('!');
  });

  // BC-S-04
  it('한글 입력 시 빈 문자열을 반환한다', () => {
    expect(generateSlug('안녕하세요')).toBe('');
  });
});

describe('isValidSlug', () => {
  // BC-S-05
  it('유효한 slug를 통과시킨다', () => {
    expect(isValidSlug('abc-123')).toBe(true);
  });

  // BC-S-06
  it('대문자를 포함한 slug를 거부한다', () => {
    expect(isValidSlug('Abc')).toBe(false);
  });

  // BC-S-07
  it('하이픈으로 시작하는 slug를 거부한다', () => {
    expect(isValidSlug('-abc')).toBe(false);
  });

  // BC-S-08
  it('하이픈으로 끝나는 slug를 거부한다', () => {
    expect(isValidSlug('abc-')).toBe(false);
  });

  // BC-S-09
  it('연속 하이픈을 포함한 slug를 거부한다', () => {
    expect(isValidSlug('a--b')).toBe(false);
  });

  // BC-S-10
  it('빈 문자열을 거부한다', () => {
    expect(isValidSlug('')).toBe(false);
  });

  // BC-S-11
  it('숫자만으로 된 slug를 통과시킨다', () => {
    expect(isValidSlug('123')).toBe(true);
  });

  // BC-S-12
  it('언더스코어를 포함한 slug를 거부한다', () => {
    expect(isValidSlug('a_b')).toBe(false);
  });
});
