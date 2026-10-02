import { Language } from './i18n.ts';

export function formatCurrency(amount: number | undefined | null, currency = 'EGP', lang: Language = 'en'): string {
  const val = amount || 0;
  try {
    const formattedNum = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);

    if (lang === 'ar') {
      return `${formattedNum} ${currency === 'EGP' ? 'ج.م' : currency}`;
    }
    return `${currency} ${formattedNum}`;
  } catch (e) {
    return `${val.toLocaleString()} ${currency}`;
  }
}

export function formatDate(dateString: string | undefined | null, lang: Language = 'en'): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

export function formatNumber(num: number | undefined | null, lang: Language = 'en'): string {
  const val = num || 0;
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US').format(val);
}

export function formatPercent(num: number | undefined | null): string {
  const val = num || 0;
  return `${val.toFixed(1).replace(/\.0$/, '')}%`;
}
