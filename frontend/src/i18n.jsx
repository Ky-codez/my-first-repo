import { createContext, useContext, useState, useCallback } from 'react';

// ─── Lightweight i18n ────────────────────────────────────────────────────────
// Usage in any component:
//   const { t, lang, setLang } = useLang();
//   <span>{t('feed.explore')}</span>
//
// To add a language: copy the 'en' block, translate the values, add the
// code to LANGUAGES. Keys that are missing fall back to English.

export const LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'zh', label: '繁體中文', flag: '🇹🇼' },
  // { code: 'fr', label: 'Français', flag: '🇫🇷' },  ← next up
];

const DICT = {
  en: {
    'nav.alerts': 'Alerts',
    'nav.vibes': 'Vibes',
    'nav.me': 'Me',
    'feed.explore': 'Explore',
    'feed.following': 'Following',
    'feed.trending': 'Trending this week',
    'feed.trendingSub': 'Most loved by the community — swipe through',
    'feed.allReviews': 'All reviews',
    'feed.pymk': 'People you may know',
    'feed.follow': 'Follow',
    'addwine.log': 'Log a Wine',
    'addwine.edit': 'Edit Wine',
    'addwine.relog': 'Re-log Wine',
    'addwine.share': 'Share Wine',
    'addwine.saveChanges': 'Save Changes',
    'addwine.relogBtn': 'Re-log Wine',
    'addwine.rating': 'Your Rating',
    'addwine.notes': 'Tasting Notes',
    'addwine.cancel': 'Cancel',
    'addwine.quick': 'Quick',
    'addwine.full': 'Full tasting',
    'addwine.logIt': 'Log it',
    'addwine.quickNote': 'Quick note (optional)',
    'addwine.quickNotePh': "One line you'll remember it by…",
    'addwine.editDetails': 'Edit details →',
    'profile.journal': 'Journal',
    'profile.activity': 'Activity',
    'profile.badges': 'Badges',
    'cellar.title': 'My Cellar',
    'cellar.wishlist': 'Want to Try',
    'cellar.cellar': 'In My Cellar',
    'menu.language': 'Language',
    'translate.btn': 'Translate',
    'translate.original': 'Show original',
    'translate.loading': 'Translating…',
  },
  zh: {
    'nav.alerts': '通知',
    'nav.vibes': '靈感',
    'nav.me': '我的',
    'feed.explore': '探索',
    'feed.following': '追蹤中',
    'feed.trending': '本週熱門',
    'feed.trendingSub': '社群最愛 — 左右滑動瀏覽',
    'feed.allReviews': '全部評論',
    'feed.pymk': '你可能認識的人',
    'feed.follow': '追蹤',
    'addwine.log': '記錄葡萄酒',
    'addwine.edit': '編輯葡萄酒',
    'addwine.relog': '再次記錄',
    'addwine.share': '分享葡萄酒',
    'addwine.saveChanges': '儲存變更',
    'addwine.relogBtn': '再次記錄',
    'addwine.rating': '你的評分',
    'addwine.notes': '品飲筆記',
    'addwine.cancel': '取消',
    'addwine.quick': '快速',
    'addwine.full': '完整品飲',
    'addwine.logIt': '記錄',
    'addwine.quickNote': '快速筆記（選填）',
    'addwine.quickNotePh': '寫一句日後想得起的話…',
    'addwine.editDetails': '編輯詳情 →',
    'profile.journal': '酒誌',
    'profile.activity': '動態',
    'profile.badges': '徽章',
    'cellar.title': '我的酒窖',
    'cellar.wishlist': '想嘗試',
    'cellar.cellar': '在我的酒窖',
    'menu.language': '語言',
    'translate.btn': '翻譯',
    'translate.original': '顯示原文',
    'translate.loading': '翻譯中…',
  },
};

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('sipiary_lang') || 'en');

  const setLang = useCallback((code) => {
    localStorage.setItem('sipiary_lang', code);
    setLangState(code);
  }, []);

  const t = useCallback(
    (key) => DICT[lang]?.[key] ?? DICT.en[key] ?? key,
    [lang]
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

// Human-readable target name for the AI review translator
export const LANG_NAMES = { en: 'English', zh: 'Traditional Chinese', fr: 'French' };
