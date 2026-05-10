/**
 * 날짜/시간 포맷 유틸리티
 */

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * ISO 날짜 문자열을 datetime-local 입력 형식(YYYY-MM-DDTHH:MM)으로 변환한다.
 */
export function toLocalDatetime(iso: string | null): string {
  const d = toDate(iso);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 날짜를 시간 포함 형식으로 포맷한다.
 */
export function formatDateTime(
  date: Date | string | null,
  locale: string = 'ko',
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(date);
  if (!d) return '-';

  if (locale === 'ko' && !options) {
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const opts: Intl.DateTimeFormatOptions = options ?? {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

/**
 * 날짜를 시간 미포함 형식으로 포맷한다.
 */
export function formatDate(
  date: Date | string | null,
  locale: string = 'ko',
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(date);
  if (!d) return '-';

  if (locale === 'ko' && !options) {
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  }
  const opts: Intl.DateTimeFormatOptions = options ?? {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

/**
 * 날짜를 ISO 8601 문자열로 포맷한다 (UTC 기준).
 */
export function formatDateISO(date: Date | string | null): string {
  const d = toDate(date);
  if (!d) return '';
  return d.toISOString();
}

/**
 * 상대 시간 포맷 (예: "3일 전", "2 hours ago").
 */
export function formatDateRelative(
  date: Date | string | null,
  locale: string = 'ko',
  now: Date | number = Date.now(),
): string {
  const d = toDate(date);
  if (!d) return '';
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const diffSec = Math.round((d.getTime() - nowMs) / 1000);

  const RTF = (Intl as unknown as { RelativeTimeFormat?: typeof Intl.RelativeTimeFormat }).RelativeTimeFormat;
  if (typeof RTF !== 'function') return formatDate(d, locale);
  const rtf = new RTF(locale, { numeric: 'auto' });

  const absSec = Math.abs(diffSec);
  if (absSec < 60) return rtf.format(diffSec, 'second');
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (absSec < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (absSec < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), 'month');
  return rtf.format(Math.round(diffSec / (86400 * 365)), 'year');
}
