import { describe, expect, it } from 'vitest';
import vi from './vi';
import { i18n, resolveLocale } from './index';

describe('ManagerHub internationalization',()=>{
  it('prefers explicit language choice, then Vietnamese browser locale, then English',()=>{
    expect(resolveLocale('en','vi-VN')).toBe('en');
    expect(resolveLocale('vi','en-US')).toBe('vi');
    expect(resolveLocale(null,'vi-VN')).toBe('vi');
    expect(resolveLocale('unknown','fr-FR')).toBe('en');
  });
  it('contains user-facing guidance for the major workspaces',()=>{
    for(const text of ['Player Lab','Save Library','Squad Planner',
      'Every decision.','CA and PA are different from role fit',
      'What do CA, PA and role fit mean?']){
      expect(vi[text as keyof typeof vi]).toBeTruthy();
    }
    expect(Object.values(vi).every(x=>x.trim().length>0)).toBe(true);
  });
  it('changes live translations without changing source data or metrics',async()=>{
    const previous=i18n.language;
    try{
      await i18n.changeLanguage('vi');
      expect(i18n.t('Player Lab')).toBe('Phân tích cầu thủ');
      expect(i18n.t('Passing')).toBe('Chuyền bóng');
      await i18n.changeLanguage('en');
      expect(i18n.t('Player Lab')).toBe('Player Lab');
      expect(i18n.t('Passing')).toBe('Passing');
    }finally{await i18n.changeLanguage(previous);}
  });
});
