import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './vi';

export type AppLocale = 'en' | 'vi';
const SUPPORTED: readonly AppLocale[] = ['en','vi'];

export function resolveLocale(stored: string | null, browser: string | undefined): AppLocale {
  if (stored === 'en' || stored === 'vi') return stored;
  return browser?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

function initialLocale(): AppLocale {
  let stored: string | null = null;
  try { stored = localStorage.getItem('mh-locale'); } catch { /* Restricted browser storage */ }
  return resolveLocale(stored, typeof navigator !== 'undefined' ? navigator.language : undefined);
}

// Natural-language keys keep the English authoring copy canonical and avoid
// duplicating English source text in components and resource files.
const en = Object.fromEntries(Object.keys(vi).map(key => [key,key]));
export const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({
  resources: { en: {translation:en}, vi: {translation:vi} },
  lng: initialLocale(),
  fallbackLng:'en',
  supportedLngs:SUPPORTED,
  keySeparator:false,
  nsSeparator:false,
  interpolation:{escapeValue:false},
  returnNull:false,
  initAsync:false,
  react:{useSuspense:false}
});

export async function setAppLocale(locale: AppLocale): Promise<void> {
  if (!SUPPORTED.includes(locale)) throw new Error('Unsupported language');
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  try { localStorage.setItem('mh-locale',locale); } catch { /* Keep in-memory locale */ }
}
document.documentElement.lang = i18n.language || 'en';
