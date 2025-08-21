# 🚀 AI Canvas 快速搭建指南

本指南将帮助你在几分钟内启动并运行 AI Canvas 项目。

## 📋 前置要求

确保你的开发环境满足以下要求：

- **Node.js**: 18.0 或更高版本
- **包管理器**: npm, yarn, 或 pnpm
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+, 或 Edge 90+

## 🛠️ 快速安装

### 1. 克隆项目

```bash
git clone <repository-url>
cd ai-canvas-brainstorm
```

### 2. 安装依赖

选择你喜欢的包管理器：

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### 3. 启动开发服务器

```bash
# 使用 npm
npm run dev

# 或使用 yarn
yarn dev

# 或使用 pnpm
pnpm dev
```

### 4. 访问应用

打开浏览器，访问 [http://localhost:3000](http://localhost:3000)

🎉 **恭喜！AI Canvas 现在已经运行在你的本地环境中了。**

## 🎯 首次使用体验

### 基础操作试用

1. **创建第一个文本节点**
   - 点击工具栏的 "T" 按钮（或按键盘 `T`）
   - 在画布上点击任意位置
   - 双击文本节点开始编辑

2. **添加卡片节点**
   - 点击工具栏的卡片按钮（或按键盘 `C`）
   - 在画布上点击放置
   - 双击标题或内容区域开始编辑

3. **体验 AI 功能**
   - 在底部输入框中输入："生成返校季海报创意"
   - 点击生成按钮，观察 AI 创建的卡片

4. **画布导航**
   - 按住 `Space` 键拖拽来平移画布
   - 使用 `Ctrl/⌘ + 滚轮` 缩放画布
   - 点击工具栏的 "Fit" 按钮适配全部内容

### 快捷键速览

- `V` - 选择工具
- `T` - 文本工具  
- `C` - 卡片工具
- `Space + 拖拽` - 平移画布
- `Ctrl/⌘ + Z` - 撤销
- `Ctrl/⌘ + A` - 全选

## 🔧 开发环境配置

### VS Code 推荐扩展

为了获得最佳开发体验，建议安装以下 VS Code 扩展：

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag"
  ]
}
```

### 代码格式化

项目已配置 Prettier 和 ESLint。运行以下命令来格式化代码：

```bash
# 检查代码质量
npm run lint

# 自动修复可修复的问题
npm run lint --fix

# 格式化所有文件（如果你安装了 prettier 全局）
npx prettier --write .
```

## 📱 浏览器兼容性

| 浏览器 | 支持版本 | 特殊说明 |
|--------|----------|----------|
| Chrome | 90+ | ✅ 完全支持 |
| Firefox | 88+ | ✅ 完全支持 |
| Safari | 14+ | ✅ 完全支持 |
| Edge | 90+ | ✅ 完全支持 |

## 🚨 常见问题排查

### 问题 1: 安装依赖失败

**错误信息**: `npm ERR! peer dep missing`

**解决方案**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 问题 2: 端口被占用

**错误信息**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决方案**:
```bash
# 指定其他端口
npm run dev -- -p 3001

# 或找到并终止占用 3000 端口的进程
lsof -ti:3000 | xargs kill
```

### 问题 3: TypeScript 类型错误

**解决方案**:
```bash
# 重新构建 TypeScript 项目
npm run type-check

# 如果问题持续，删除 .next 文件夹
rm -rf .next
npm run dev
```

### 问题 4: 样式不显示

**可能原因**: TailwindCSS 未正确编译

**解决方案**:
```bash
# 重启开发服务器
npm run dev

# 检查 tailwind.config.js 配置
# 确保 content 路径正确
```

## 🏗️ 项目结构概览

```
ai-canvas/
├── app/              # Next.js 13+ App Router
├── components/       # React 组件
│   ├── ui/          # 基础 UI 组件
│   ├── canvas/      # 画布相关组件
│   ├── node-types/  # 节点类型组件
│   ├── toolbar/     # 工具栏组件
│   └── ai-dock/     # AI 功能组件
├── store/           # Zustand 状态管理
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
└── public/          # 静态资源
```

## 🔄 开发工作流

### 1. 功能开发

```bash
# 创建新分支
git checkout -b feature/your-feature-name

# 开发过程中定期提交
git add .
git commit -m "feat: add new feature description"

# 推送到远程仓库
git push origin feature/your-feature-name
```

### 2. 代码质量检查

```bash
# 运行所有检查
npm run lint        # ESLint 检查
npm run type-check  # TypeScript 类型检查
npm run build       # 构建检查
```

### 3. 预生产测试

```bash
# 构建生产版本
npm run build

# 本地预览生产版本
npm start
```

## 📈 性能优化建议

### 开发模式优化

1. **启用严格模式**: 已在 `next.config.js` 中配置
2. **使用 React DevTools**: 监控组件重渲染
3. **避免不必要的重渲染**: 使用 `React.memo` 和 `useMemo`

### 生产部署优化

1. **代码分割**: Next.js 自动处理
2. **图片优化**: 使用 `next/image` 组件
3. **字体优化**: 已配置 Google Fonts 优化加载

## 🚀 部署到生产环境

### Vercel 部署（推荐）

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 中导入项目
3. Vercel 会自动检测 Next.js 并配置构建设置
4. 点击部署，几分钟内即可上线

### 自定义服务器部署

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start

# 或使用 PM2 进行进程管理
npm install -g pm2
pm2 start npm --name "ai-canvas" -- start
```

## 💡 下一步

现在你已经成功搭建了 AI Canvas，可以开始：

1. 🎨 **探索界面**: 熟悉各种工具和功能
2. 🔧 **自定义配置**: 根据需求调整配色、字体等
3. 🚀 **开发新功能**: 参考架构文档开始开发
4. 🤝 **参与贡献**: 查看 Issues 和 Discussions

## 📞 获取帮助

- 📖 **文档**: 查看 [README.md](README.md) 了解详细信息
- 🐛 **Bug 报告**: 在 GitHub Issues 中反馈问题
- 💬 **功能建议**: 在 GitHub Discussions 中讨论想法
- 📧 **联系我们**: 发送邮件到开发团队

---

**🎉 祝你使用愉快！如果遇到任何问题，随时联系我们。**
