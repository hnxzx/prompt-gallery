// 中英双语国际化
const translations = {
  zh: {
    'hero.enter': '浏览灵感',
    'archive.title': '影像灵感库',
    'archive.intro': '让片刻的灵感，有处可寻。',
    'archive.updated': '更新于 {date}',
    'filter.open': '筛选',
    'filter.clear': '清除',
    'filter.title': '筛选作品',
    'filter.reset': '重置',
    'filter.apply': '应用筛选',
    'filter.allModels': '全部模型',
    'filter.allSources': '全部来源',
    'filter.allMethods': '全部方式',
    'result.count': '共 {count} 条',
    'result.loading': '正在整理影像…',
    'empty.title': '灵感还在别处',
    'empty.text': '换个关键词，或清除筛选再看看。',
    'empty.reset': '查看全部作品',
    'loadMore': '加载更多',
    'work.open': '打开作品：{title}',
    'work.copyPrompt': '复制提示词',
    'work.copyLink': '复制作品链接',
    'work.prompt': '提示词',
    'work.effect': '效果说明',
    'work.source': '查看原始来源',
    'toast.promptCopied': '提示词已复制',
    'toast.linkCopied': '链接已复制',
    'toast.noPrompt': '该作品无提示词，链接已复制',
    'media.playHint': '点击播放视频',
    'kind.prompt': '提示词',
    'kind.reference': '效果参考',
  },
  en: {
    'hero.enter': 'Browse Inspiration',
    'archive.title': 'Inspiration Archive',
    'archive.intro': 'Where fleeting ideas find a home.',
    'archive.updated': 'Updated {date}',
    'filter.open': 'Filter',
    'filter.clear': 'Clear',
    'filter.title': 'Filter Works',
    'filter.reset': 'Reset',
    'filter.apply': 'Apply',
    'filter.allModels': 'All Models',
    'filter.allSources': 'All Sources',
    'filter.allMethods': 'All Methods',
    'result.count': '{count} works',
    'result.loading': 'Loading gallery…',
    'empty.title': 'No matches',
    'empty.text': 'Try a different keyword or clear filters.',
    'empty.reset': 'View all works',
    'loadMore': 'Load more',
    'work.open': 'Open: {title}',
    'work.copyPrompt': 'Copy Prompt',
    'work.copyLink': 'Copy Link',
    'work.prompt': 'Prompt',
    'work.effect': 'Effect Description',
    'work.source': 'View Source',
    'toast.promptCopied': 'Prompt copied',
    'toast.linkCopied': 'Link copied',
    'toast.noPrompt': 'No prompt for this work, link copied',
    'media.playHint': 'Click to play',
    'kind.prompt': 'Prompt',
    'kind.reference': 'Reference',
  },
};

let currentLang = 'zh';

export function setLanguage(lang) {
  currentLang = lang;
  try { localStorage.setItem('gallery:lang', lang); } catch {}
}

export function language() {
  return currentLang;
}

export function t(key, params = {}) {
  let str = translations[currentLang]?.[key] || translations.zh[key] || key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

export function initLanguage() {
  let saved = null;
  try { saved = localStorage.getItem('gallery:lang'); } catch {}
  if (saved === 'zh' || saved === 'en') {
    currentLang = saved;
  } else {
    const browser = navigator.language?.toLowerCase() || 'zh';
    currentLang = browser.startsWith('zh') ? 'zh' : 'en';
  }
}

export function toggleLanguage() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem('gallery:lang', currentLang); } catch {}
  translatePage();
}

export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = currentLang === 'zh' ? 'EN' : '中';
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
}

// 搜索别名：中文关键词也能搜到英文内容
export function searchAlias(item) {
  const parts = [item.title, item.prompt, item.author, ...(item.tags || [])];
  return parts.join(' ').toLowerCase();
}
