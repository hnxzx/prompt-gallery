# 灵感画廊 · Prompt Gallery

一个纯静态的 AI 提示词与影像灵感收集库，无需服务器，部署到 GitHub Pages 即可使用。

## 功能特点

- **Three.js 蓝色流体动画首页** — 沉浸式视觉开场
- **瀑布流画廊** — 卡片式展示，无限滚动加载
- **搜索 + 多维筛选** — 按关键词、模型、来源、生成方式、风格标签筛选
- **中英双语切换** — 一键切换中文/英文界面
- **作品详情弹窗** — 点击卡片查看完整提示词，一键复制
- **纯静态无后端** — 数据从 JSON 文件读取，部署简单
- **飞书多维表格后台**（可选）— 用飞书表格管理内容，GitHub Actions 自动同步

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发（http://127.0.0.1:5182）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
prompt-gallery/
├── index.html              # 入口 HTML
├── package.json            # 依赖配置
├── vite.config.js          # Vite 配置
├── data/
│   └── catalog.json        # 数据文件（核心！）
├── src/
│   ├── main.js             # 主逻辑
│   ├── background.js       # Three.js 流体动画
│   ├── catalog.js          # 数据加载与筛选
│   ├── i18n.js             # 中英双语
│   ├── masonry.js          # 瀑布流布局
│   ├── gallery-media.js    # 图片懒加载
│   ├── style.css           # 主样式
│   └── liquid-glass.css    # 玻璃拟态效果
├── scripts/
│   └── sync_feishu_api.py  # 飞书数据同步脚本
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions 自动部署
└── public/
    └── favicon.svg         # 网站图标
```

## 如何添加内容

### 方式一：直接编辑 JSON（最简单）

打开 `data/catalog.json`，按照格式添加新条目：

```json
{
  "id": "my-work-001",
  "title": "我的作品标题",
  "kind": "prompt",
  "prompt": "完整的提示词文本，用英文写效果最好",
  "description": "效果说明（如果没有提示词，就写这里）",
  "model": "Seedance",
  "source": "X",
  "method": "文生视频",
  "tags": ["标签1", "标签2"],
  "cover": "https://example.com/cover.jpg",
  "video": "https://example.com/video.mp4",
  "author": "作者名",
  "sourceUrl": "https://原始帖子链接",
  "width": 16,
  "height": 9
}
```

字段说明：
- `id` — 唯一标识，不能重复
- `kind` — `prompt`（有提示词）或 `reference`（仅效果参考）
- `title` — 作品名称
- `prompt` — 完整提示词文本（可选，reference 类型就留空）
- `description` — 效果说明或描述
- `model` — 使用的模型（如 Seedance、GPT Image、MiniMax 等）
- `source` — 来源平台（如 X、LINUX DO、小红书等）
- `method` — 生成方式（如文生视频、图生视频）
- `tags` — 风格标签数组
- `cover` — 封面图 URL
- `video` — 视频 URL（可选，没有就留空字符串）
- `author` — 原作者
- `sourceUrl` — 原帖链接
- `width` / `height` — 视频/图片比例

### 方式二：用飞书多维表格当后台（进阶）

1. 在飞书新建一个多维表格，列名按上面的字段设置
2. 在飞书开放平台创建一个企业自建应用，开通多维表格读取权限
3. 把应用添加为表格协作者（可阅读）
4. 拿到 `App ID`、`App Secret`、`Base Token`、`Table ID`
5. 在 GitHub 仓库的 Settings → Secrets and variables → Actions 里添加这四个密钥
6. 推送到 main 分支或手动触发工作流，就会自动从飞书同步数据

之后日常运营就是：打开飞书表格 → 新增一行 → 填字段、传附件 → 等自动同步。

## 部署到 GitHub Pages

1. 把这个项目推送到你的 GitHub 仓库
2. 仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. 推送到 main 分支，GitHub Actions 会自动构建并部署
4. 访问 `https://你的用户名.github.io/仓库名/`

## 自定义修改

- **改标题**：编辑 `index.html` 里的 `<title>` 和 Hero 区文字
- **改配色**：编辑 `src/style.css` 顶部的 CSS 变量
- **改流体动画颜色**：编辑 `src/background.js` 里 fragmentShader 的调色板
- **改 Logo**：替换 `public/favicon.svg`
- **改底部文案**：编辑 `index.html` 里的 `<footer>`

## 技术栈

- Vite 7 — 构建工具
- Three.js 0.180 — 首页流体动画
- 原生 JavaScript — 无框架依赖
- GitHub Actions — 自动部署

## License

MIT
