import './style.css';
import './liquid-glass.css';
import { startBackground } from './background.js';
import { initLanguage, toggleLanguage, t, language } from './i18n.js';
import { loadCatalog, filterItems, summaryFor, escapeHTML as esc, collectOptions } from './catalog.js';
import { createMasonry } from './masonry.js';
import { createCoverLoader } from './gallery-media.js';

// ========== 初始化 ==========
initLanguage();
const $ = (sel) => document.querySelector(sel);

// 语言切换
$('#lang-toggle').addEventListener('click', () => {
  toggleLanguage();
  // 重新渲染以更新文案
  if (items.length) render();
});

// 启动背景动画
startBackground();

// ========== 状态 ==========
let items = [];
let filtered = [];
let limit = 24;
let current = null;
let modalItems = [];
const filters = { query: '', model: '', source: '', method: '', tag: '' };

const base = import.meta.env.BASE_URL;
const mediaURL = (path) => {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return new URL(base + path, location.href).href;
};

// ========== 工具函数 ==========
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('visible'), 2500);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); return true; }
    catch { return false; }
    finally { ta.remove(); }
  }
}

// ========== 画廊渲染 ==========
const masonry = createMasonry($('#gallery'));
const covers = createCoverLoader(mediaURL);

function card(item) {
  const article = document.createElement('article');
  article.className = 'work-card';
  article.dataset.id = item.id;

  const ratio = item.height && item.width ? (item.height / item.width * 100).toFixed(1) : 140;
  const model = item.model || '';
  const source = item.source || '';

  article.innerHTML = `
    <button class="card-open" data-open="${esc(item.id)}" aria-label="${esc(t('work.open', { title: item.title }))}">
      <div class="card-media" style="aspect-ratio: ${item.width || 4}/${item.height || 3}">
        <div class="card-placeholder">
          <span class="ph-icon">✦</span>
          <span class="ph-title">${esc(item.title)}</span>
        </div>
        <img alt="${esc(item.title)}" loading="lazy" decoding="async">
      </div>
      <div class="card-info">
        <div class="card-title">${esc(item.title)}</div>
        <div class="card-desc">${esc(summaryFor(item))}</div>
        <div class="card-meta">${esc(source)} · ${esc(model)}</div>
      </div>
    </button>
    <button class="card-copy" data-copy="${esc(item.id)}" title="${t('work.copyPrompt')}">
      📋
    </button>
  `;

  covers.observe(article, item);
  return article;
}

function render(append = false) {
  filtered = filterItems(items, filters);
  const gallery = $('#gallery');
  const before = append ? gallery.children.length : 0;

  if (!append) {
    gallery.replaceChildren();
  }

  const fragment = document.createDocumentFragment();
  filtered.slice(before, limit).forEach(item => fragment.append(card(item)));
  gallery.append(fragment);

  $('#empty-state').hidden = filtered.length > 0 || items.length === 0;
  $('#result-count').textContent = t('result.count', { count: filtered.length });
  $('#reset-filters').hidden = !filters.query && !filters.model && !filters.source && !filters.method && !filters.tag;
  $('#load-more-area').hidden = limit >= filtered.length;
}

function applyFilters() {
  limit = 24;
  render();
}

function resetFilters() {
  filters.query = '';
  filters.model = '';
  filters.source = '';
  filters.method = '';
  filters.tag = '';
  $('#search').value = '';
  ['model', 'source', 'method'].forEach(n => $(`#${n}-filter`).value = '');
  applyFilters();
}

// ========== 搜索和筛选事件 ==========
let searchTimer;
$('#search').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filters.query = e.target.value;
    applyFilters();
  }, 250);
});

$('#reset-filters').addEventListener('click', resetFilters);
$('#empty-reset').addEventListener('click', resetFilters);

// 筛选弹窗
const filterDialog = $('#filter-dialog');
$('#open-filters').addEventListener('click', () => filterDialog.showModal());
$('#close-filters').addEventListener('click', () => filterDialog.close());
$('#apply-filters').addEventListener('click', () => {
  filters.model = $('#model-filter').value;
  filters.source = $('#source-filter').value;
  filters.method = $('#method-filter').value;
  const activeTag = document.querySelector('#tag-filters button[aria-pressed="true"]');
  filters.tag = activeTag?.dataset.tag || '';
  filterDialog.close();
  applyFilters();
});
$('#reset-filter-draft').addEventListener('click', () => {
  ['model', 'source', 'method'].forEach(n => $(`#${n}-filter`).value = '');
  document.querySelectorAll('#tag-filters button').forEach(b => b.setAttribute('aria-pressed', 'false'));
});

// 标签选择
$('#tag-filters').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const isPressed = btn.getAttribute('aria-pressed') === 'true';
  document.querySelectorAll('#tag-filters button').forEach(b => b.setAttribute('aria-pressed', 'false'));
  if (!isPressed) btn.setAttribute('aria-pressed', 'true');
});

// ========== 加载更多 ==========
$('#load-more').addEventListener('click', () => {
  limit += 24;
  render(true);
});

// ========== 作品详情 ==========
const workDialog = $('#work-dialog');
const video = $('#work-video');
const workImage = $('#work-image');

function openWork(id, push = false) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  if (!workDialog.open) {
    modalItems = filtered.length ? [...filtered] : [...items];
  }
  current = item;

  const pos = modalItems.findIndex(i => i.id === id);
  $('#work-position').textContent = `${String(pos + 1).padStart(2, '0')} / ${String(modalItems.length).padStart(2, '0')}`;

  $('#work-title').textContent = item.title;
  $('#work-credit').textContent = [item.author, item.source].filter(Boolean).join(' · ');
  $('#work-tags').innerHTML = (item.tags || []).map(tag => `<span>${esc(tag)}</span>`).join('');

  // 提示词或效果说明
  $('#prompt-title').textContent = item.prompt ? t('work.prompt') : t('work.effect');
  $('#prompt-text').textContent = item.prompt || item.description || '';

  // 视频或图片
  video.pause();
  video.removeAttribute('src');
  workImage.hidden = true;

  if (item.video) {
    video.src = mediaURL(item.video);
    video.poster = mediaURL(item.cover);
    video.hidden = false;
    $('#media-caption').textContent = t('media.playHint');
  } else if (item.cover) {
    workImage.hidden = false;
    workImage.src = mediaURL(item.cover);
    workImage.alt = item.title;
    video.hidden = true;
  } else {
    video.hidden = true;
    $('#media-caption').textContent = '';
  }

  // 来源链接
  const sourceLink = $('#source-link');
  if (item.sourceUrl) {
    sourceLink.href = item.sourceUrl;
    sourceLink.hidden = false;
  } else {
    sourceLink.hidden = true;
  }

  workDialog.showModal();
  if (push) history.pushState(null, '', `#work/${encodeURIComponent(id)}`);
}

function closeWork() {
  video.pause();
  video.removeAttribute('src');
  current = null;
  if (workDialog.open) workDialog.close();
  if (location.hash.startsWith('#work/')) history.replaceState(null, '', '#archive');
}

$('#close-work').addEventListener('click', closeWork);
workDialog.addEventListener('cancel', (e) => { e.preventDefault(); closeWork(); });

// 点击背景关闭
workDialog.addEventListener('click', (e) => {
  if (e.target === workDialog) closeWork();
});

// 画廊点击事件
$('#gallery').addEventListener('click', (e) => {
  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) {
    const item = items.find(i => i.id === copyBtn.dataset.copy);
    if (item) {
      const text = item.prompt || new URL(`#work/${item.id}`, location.href).href;
      copyText(text).then(() => toast(item.prompt ? t('toast.promptCopied') : t('toast.noPrompt')));
    }
    return;
  }
  const openBtn = e.target.closest('[data-open]');
  if (openBtn) openWork(openBtn.dataset.open, true);
});

// 复制提示词
$('#copy-prompt').addEventListener('click', () => {
  if (current?.prompt) {
    copyText(current.prompt).then(() => toast(t('toast.promptCopied')));
  }
});

// 复制链接
$('#share-work').addEventListener('click', () => {
  if (current) {
    const url = new URL(`#work/${current.id}`, location.href).href;
    copyText(url).then(() => toast(t('toast.linkCopied')));
  }
});

// 键盘导航
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  if (workDialog.open && e.key === 'Escape') closeWork();
});

// Hash 路由
function readHash() {
  if (location.hash.startsWith('#work/')) {
    const id = decodeURIComponent(location.hash.slice(6));
    if (items.some(i => i.id === id)) openWork(id);
  } else if (workDialog.open) {
    closeWork();
  }
}
window.addEventListener('popstate', readHash);

// ========== 回到顶部 ==========
$('#back-to-top').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', () => {
  const btn = $('#back-to-top');
  btn.classList.toggle('visible', window.scrollY > 600);
});

// ========== 数据加载 ==========
async function loadData() {
  try {
    const catalog = await loadCatalog(base);
    items = catalog.items.map(item => ({
      ...item,
      width: item.width || 4,
      height: item.height || 3,
    }));

    $('#total-count').textContent = `(${items.length})`;
    $('#hero-count').textContent = `${items.length} 条作品 · 提示词 · 视觉参考`;

    const updated = new Date(catalog.updatedAt || Date.now());
    $('#updated-at').textContent = t('archive.updated', {
      date: new Intl.DateTimeFormat(language() === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(updated),
    });

    // 填充筛选选项
    const options = collectOptions(items);
    fillSelect('#model-filter', options.models, t('filter.allModels'));
    fillSelect('#source-filter', options.sources, t('filter.allSources'));
    fillSelect('#method-filter', options.methods, t('filter.allMethods'));
    $('#tag-filters').innerHTML = options.tags.map(tag =>
      `<button data-tag="${esc(tag)}" aria-pressed="false">${esc(tag)}</button>`
    ).join('');

    applyFilters();
    readHash();
  } catch (err) {
    console.error(err);
    $('#catalog-error').hidden = false;
  }
}

function fillSelect(selector, values, allLabel) {
  const sel = $(selector);
  sel.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());
  values.forEach(v => sel.add(new Option(v, v)));
}

$('#retry-catalog').addEventListener('click', loadData);

loadData();
