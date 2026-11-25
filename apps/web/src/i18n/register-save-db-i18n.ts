import { i18n } from './index';
import saveDbVi from './save-db-vi';

let registered = false;

export function registerSaveDbI18n(): void {
  if (registered) return;
  registered = true;
  i18n.addResourceBundle('vi', 'translation', saveDbVi, true, false);
  const enEntries = Object.fromEntries(Object.keys(saveDbVi).map(key => [key, key]));
  i18n.addResourceBundle('en', 'translation', enEntries, true, false);
}
