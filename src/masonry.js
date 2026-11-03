// 瀑布流布局 — 纯 CSS columns 方案，简单高效
export function createMasonry(container) {
  function layout() {
    // 使用 CSS columns 实现瀑布流
    // 这里只做窗口变化时的微调
  }

  function schedule() {
    // 图片加载后不需要重排，CSS columns 自动处理
  }

  return { layout, schedule, container };
}
