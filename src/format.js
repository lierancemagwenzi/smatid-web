const dateTime = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'});
const dateOnly = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'});
const number = new Intl.NumberFormat();

export const formatDateTime = (v) => (v ? dateTime.format(new Date(v)) : '—');
export const formatDate = (v) => (v ? dateOnly.format(new Date(v)) : '—');
export const formatNumber = (v) => number.format(v || 0);
export const formatDuration = (ms) => (ms == null ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

export const CHECKS = {
    company: 'Company registration',
    sanctions: 'Sanctions & PEP',
    liveness: 'Liveness',
};
export const checkName = (type) => CHECKS[type] || type;

/** YYYY-MM-DD for a date `days` ago (UTC), as the API's from/to filters take. */
export const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

/** "1 error", "3 errors". */
export const plural = (n, word) => `${formatNumber(n)} ${word}${n === 1 ? '' : 's'}`;
