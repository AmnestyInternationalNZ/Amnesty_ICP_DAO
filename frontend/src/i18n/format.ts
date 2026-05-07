import { getIntlLocale } from './types';

function normalizeLocale(locale?: string): string {
    return getIntlLocale(locale);
}

function toSafeNumber(value: number | bigint): number {
    return typeof value === 'bigint' ? Number(value) : value;
}

export function formatNumber(
    value: number | bigint,
    locale?: string,
    options?: Intl.NumberFormatOptions
): string {
    return new Intl.NumberFormat(normalizeLocale(locale), options).format(toSafeNumber(value));
}

export function formatCurrency(
    value: number | bigint,
    locale?: string,
    currency = 'NZD',
    options?: Intl.NumberFormatOptions
): string {
    return new Intl.NumberFormat(normalizeLocale(locale), {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...options
    }).format(toSafeNumber(value));
}

export function formatDate(
    value: Date | number,
    locale?: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(normalizeLocale(locale), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options
    }).format(date);
}

export function formatDateTime(
    value: Date | number,
    locale?: string,
    options?: Intl.DateTimeFormatOptions
): string {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(normalizeLocale(locale), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        ...options
    }).format(date);
}

export function formatRelativeDays(days: number, locale?: string): string {
    return new Intl.RelativeTimeFormat(normalizeLocale(locale), { numeric: 'auto' }).format(days, 'day');
}
