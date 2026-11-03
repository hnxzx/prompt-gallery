// 图片懒加载和封面加载
export function createCoverLoader(mediaURL, onLoad) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const card = entry.target;
      const img = card.querySelector('img');
      if (!img || img.dataset.loaded) continue;
      const src = img.dataset.src;
      if (!src) continue;
      img.src = mediaURL(src);
      img.dataset.loaded = 'true';
      observer.unobserve(card);
      if (onLoad) onLoad();
    }
  }, { rootMargin: '200px 0px' });

  function observe(card, item) {
    const img = card.querySelector('img');
    if (!img) return;
    if (item.cover) {
      img.dataset.src = item.cover;
    }
    observer.observe(card);
  }

  function clear(container) {
    container.querySelectorAll('.work-card').forEach(card => observer.unobserve(card));
  }

  return { observe, clear };
}
