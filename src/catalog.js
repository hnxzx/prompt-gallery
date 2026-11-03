// 数据加载、筛选和工具函数
export function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function safeURL(url) {
  if (!url) return '';
  try {
    const u = new URL(url, location.href);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    return '';
  } catch {
    return '';
  }
}

// 加载 catalog.json
export async function loadCatalog(base = './') {
  const response = await fetch(base + 'data/catalog.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Failed to load catalog');
  const catalog = await response.json();
  if (!catalog.items || !Array.isArray(catalog.items)) throw new Error('Invalid catalog');
  return catalog;
}

// 筛选逻辑
export function filterItems(items, filters) {
  let result = [...items];

  // 关键词搜索
  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(item => {
      const haystack = [
        item.title,
        item.prompt,
        item.description,
        item.author,
        ...(item.tags || []),
        item.model,
        item.source,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  // 模型筛选
  if (filters.model) {
    result = result.filter(item => item.model === filters.model);
  }

  // 来源筛选
  if (filters.source) {
    result = result.filter(item => item.source === filters.source);
  }

  // 生成方式筛选
  if (filters.method) {
    result = result.filter(item => item.method === filters.method);
  }

  // 标签筛选
  if (filters.tag) {
    result = result.filter(item => (item.tags || []).includes(filters.tag));
  }

  return result;
}

// 生成摘要
export function summaryFor(item) {
  if (item.prompt) {
    return item.prompt.slice(0, 100) + (item.prompt.length > 100 ? '…' : '');
  }
  return item.description || '';
}

// 收集所有选项
export function collectOptions(items) {
  const options = {
    models: new Set(),
    sources: new Set(),
    methods: new Set(),
    tags: new Set(),
  };
  for (const item of items) {
    if (item.model) options.models.add(item.model);
    if (item.source) options.sources.add(item.source);
    if (item.method) options.methods.add(item.method);
    (item.tags || []).forEach(t => options.tags.add(t));
  }
  return {
    models: [...options.models].sort(),
    sources: [...options.sources].sort(),
    methods: [...options.methods].sort(),
    tags: [...options.tags].sort(),
  };
}
