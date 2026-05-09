import { describe, it, expect } from 'vitest';
import { sanitizeHtmlContent } from '@withwiz/blog-core/utils';

describe('sanitizeHtmlContent', () => {
  // BC-H-01
  it('null을 null로 반환한다', () => {
    expect(sanitizeHtmlContent(null)).toBeNull();
  });

  // BC-H-02
  it('undefined를 falsy로 반환한다', () => {
    expect(sanitizeHtmlContent(undefined)).toBeFalsy();
  });

  // BC-H-03
  it('빈 문자열을 보존한다', () => {
    expect(sanitizeHtmlContent('')).toBeFalsy();
  });

  // BC-H-04
  it('안전한 HTML을 보존한다', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtmlContent(html)).toBe(html);
  });

  // BC-H-05
  it('img 태그를 보존한다', () => {
    const html = '<img src="https://example.com/img.jpg" alt="test">';
    expect(sanitizeHtmlContent(html)).toBe(html);
  });

  // BC-H-06
  it('script 태그와 내용을 제거한다', () => {
    expect(sanitizeHtmlContent('<script>alert(1)</script>')).toBe('');
  });

  // BC-H-07
  it('style 태그와 내용을 제거하고 안전한 태그를 보존한다', () => {
    const result = sanitizeHtmlContent('<style>body{}</style><p>ok</p>');
    expect(result).toBe('<p>ok</p>');
  });

  // BC-H-08
  it('비신뢰 iframe을 제거한다', () => {
    const result = sanitizeHtmlContent('<iframe src="https://evil.com"></iframe>');
    expect(result).not.toContain('iframe');
  });

  // BC-H-09
  it('YouTube iframe을 보존한다', () => {
    const html = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>';
    expect(sanitizeHtmlContent(html)).toBe(html);
  });

  // BC-H-10
  it('Vimeo iframe을 보존한다', () => {
    const html = '<iframe src="https://player.vimeo.com/video/123"></iframe>';
    expect(sanitizeHtmlContent(html)).toBe(html);
  });

  // BC-H-11
  it('onclick 속성을 제거한다', () => {
    const result = sanitizeHtmlContent('<div onclick="alert(1)">text</div>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('text');
  });

  // BC-H-12
  it('onerror 속성을 제거한다', () => {
    const result = sanitizeHtmlContent('<img onerror="alert(1)" src="x">');
    expect(result).not.toContain('onerror');
  });

  // BC-H-13
  it('javascript: 프로토콜을 무력화한다', () => {
    const result = sanitizeHtmlContent('<a href="javascript:void(0)">link</a>');
    expect(result).toContain('href=""');
  });

  // BC-H-14
  it('vbscript: 프로토콜을 무력화한다', () => {
    const result = sanitizeHtmlContent('<a href="vbscript:alert(1)">link</a>');
    expect(result).toContain('href=""');
  });

  // BC-H-15
  it('data:text/html을 무력화한다', () => {
    const result = sanitizeHtmlContent('<img src="data:text/html,<script>alert(1)</script>">');
    expect(result).toContain('src=""');
  });

  // BC-H-16
  it('data:image를 보존한다', () => {
    const html = '<img src="data:image/png;base64,iVBOR...">';
    expect(sanitizeHtmlContent(html)).toBe(html);
  });

  // BC-H-17
  it('object 태그를 제거한다', () => {
    const result = sanitizeHtmlContent('<object data="x"></object>');
    expect(result).not.toContain('object');
  });

  // BC-H-18
  it('embed 태그를 제거한다', () => {
    const result = sanitizeHtmlContent('<embed src="x">');
    expect(result).not.toContain('embed');
  });

  // BC-H-19
  it('form과 input 태그를 제거한다', () => {
    const result = sanitizeHtmlContent('<form><input type="text"></form>');
    expect(result).not.toContain('form');
    expect(result).not.toContain('input');
  });

  // BC-H-20
  it('복합 XSS를 모두 제거하고 안전한 태그를 보존한다', () => {
    const html = '<p>safe</p><script>alert(1)</script><div onclick="alert(2)"><a href="javascript:void(0)">link</a></div>';
    const result = sanitizeHtmlContent(html)!;
    expect(result).toContain('<p>safe</p>');
    expect(result).not.toContain('script');
    expect(result).not.toContain('onclick');
    expect(result).toContain('href=""');
  });
});
