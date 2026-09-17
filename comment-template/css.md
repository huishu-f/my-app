```css
/**
 * @file tokens.css
 * @description 全站设计令牌：颜色 / 阴影 / 动效时长唯一来源；组件内禁止写裸值
 * @author 辉叔
 * @date 2026-09-17
 */

/* ===== 颜色 ===== */

/** 品牌主色，hover 态见 --color-accent-hover */
--color-accent: #409eff;

/** 品牌主色 hover 态，仅按钮 / 链接可用 */
--color-accent-hover: #66b1ff;

/** 标题文字色（亮色模式），dark 模式由下方覆盖 */
--color-heading: #1a1a1a;

/** 暗色模式覆盖：媒体查询内的覆盖规则须注明触发条件 */
@media (prefers-color-scheme: dark) {
  --color-heading: #f5f5f5;
}

/* ===== 阴影 ===== */

/** 卡片默认阴影，禁止使用 shadow-black 裸值 */
--shadow-card: 0 1px 3px rgb(0 0 0 / 8%);

/* ===== 动效 ===== */

/** 交互反馈统一时长（hover / active / focus），装饰动画不适用 */
--duration-fast: 150ms;

/** 交互缓动函数，配合 --duration-fast 使用 */
--ease-out: ease-out;

/* ===== 组件级样式（scoped 场景） ===== */

/* 选中态描边：状态类由 JS 切换 */
.goods-card.selected {
  border-color: var(--color-accent);
}

/* 禁用态：降透明度并吞掉指针事件 */
.goods-card.disabled {
  opacity: 0.6;
  pointer-events: none;
}
```
