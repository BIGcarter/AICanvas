# README_dev - Developer Guide

本文件为开发者提供项目的结构说明、关键模块的职责，以及主要函数/方法的用途速查。建议与源码配合阅读。

## 目录
- app/
  - page.tsx
- components/
  - canvas/
    - canvas-root.tsx
    - cards-layer.tsx
    - edges-layer.tsx
    - overlay-layer.tsx
  - cards/
    - base-card.tsx
    - text-card.tsx
    - text-content-card.tsx
    - figure-card.tsx
    - pdf-card.tsx
    - video-card.tsx
    - ai-card.tsx
  - toolbar/
    - toolbar.tsx
    - formatting-toolbar.tsx
  - ai-dock/
    - ai-dock.tsx
  - ai/
    - model-selector.tsx
- store/
  - canvas.store.ts
- types/
  - canvas.ts
- utils/
  - transforms.ts
  - grid-alignment.ts

---

## app/page.tsx
应用入口，拼装页面各主要区域，并注册全局快捷键。

- export default function HomePage(): JSX.Element
  - 组合结构：`Toolbar`（顶部）、`CanvasRoot`（中间）、`ModelSelector`（右上浮层）、`AIDock`（底部）。
  - useEffect(handleKeyDown): 全局键盘处理
    - 拦截 Cmd/Ctrl 组合键（撤销/重做/复制/剪切/粘贴/全选）。
    - 保护输入态：当焦点位于 input/textarea/contenteditable 时，不拦截快捷键。
    - Delete/Backspace 删除选中卡片（若不在输入态）。
  - 预留 handlePaste（已注释）：后续用于剪贴板图片粘贴创建图片卡片。

---

## components/canvas/canvas-root.tsx
画布根组件，处理画布级的指针/键盘事件、平移缩放、框选、卡片创建触发。

- export function CanvasRoot(): JSX.Element
  - 本地状态
    - isPanning / isSpacePressed：空格或中键/直接拖拽触发画布平移
    - selectionStartScreenRef / dragStartRef：用于区分点击/拖拽、框选起点
  - 取自 store 的字段
    - camera, setCamera：画布相机（x,y,zoom）
    - tool, setTool：当前工具
    - selectedIds, clearSelection：已选卡片
    - isDragging, setDragging / isDrawingSelection, setDrawingSelection, selectionBox
    - addCard/selectCard：新卡创建与选择
    - gridSize, snapToGrid
  - 事件函数
    - handleKeyDown(e): 非输入态时，响应工具快捷键（v/t/c/i/p/u/esc），空格键进入平移模式
    - handleKeyUp(e): 释放空格键
    - handleWheel(e): 支持在 `data-scroll-container="true"` 区域内优先滚动卡片内容，否则缩放/平移
    - handlePointerDown(e):
      - 空白区：select 工具 + 非 shift → 平移；按住 shift → 框选起点
      - 点击卡片：委托到 BaseCard（卡片内子元素点击由卡片处理）
    - handlePointerMove(e): 更新平移/框选/拖拽中的状态
    - handlePointerUp(e): 结束平移/框选/拖拽
  - 渲染
    - CardsLayer：卡片层
    - EdgesLayer：边层（当前返回 null）
    - OverlayLayer：覆盖层（如框选框）

---

## components/canvas/cards-layer.tsx
根据文档中卡片列表渲染对应的卡片组件。

- const renderCard(card: AnyCard): JSX.Element
  - 分派到 `TextCardComponent | TextContentCardComponent | FigureCardComponent | PdfCardComponent | VideoCardComponent | AICardComponent`
- 渲染顺序：对 cards 按 z 值排序后输出。

## components/canvas/edges-layer.tsx
- export function EdgesLayer(): JSX.Element
  - 当前返回 null（已移除连线功能）。

## components/canvas/overlay-layer.tsx
- 负责显示覆盖元素（如框选框 selectionBox）。

---

## components/cards/base-card.tsx
所有卡片的基础外壳，统一实现选中、拖拽、缩放、对齐网格等通用行为。

- export function BaseCardComponent(props): JSX.Element
  - 重要 props：
    - card: BaseCard 派生类型
    - isSelected: 是否选中
    - dragFromHandleOnly?: 仅允许通过带 `data-drag-handle="true"` 的元素拖拽（用于 PDF/视频）
    - onSaveEdit?: 点击卡片背景时触发保存（非双击）
  - 事件：
    - handlePointerDown(e):
      - 区分点击可编辑/交互元素 vs. 卡片背景
      - 若 dragFromHandleOnly=true，则仅在 drag-handle 上开始拖拽
    - handlePointerMove(e): 执行移动/缩放逻辑
    - handlePointerUp(e): 结束拖拽/缩放
  - 行为：
    - 支持四角/四边 resize（遵循 `lockAspectRatio/aspectRatio` 时的约束）
    - `text` 类型在选中时显示虚线边框

### 具体卡片组件
- text-card.tsx → TextCardComponent：使用 TipTap 做富文本编辑，`onUpdate` 同步 HTML
- text-content-card.tsx → TextContentCardComponent：标题 textarea + TipTap 正文，支持编辑/保存/取消、双击进入编辑
- figure-card.tsx → FigureCardComponent：图片显示；空态支持点击上传；拖拽/放置图片
- pdf-card.tsx → PdfCardComponent：使用 `<embed>` 显示 PDF；左上圆点为唯一拖拽把手
- video-card.tsx → VideoCardComponent：textarea 粘贴 iframe 代码；“✓嵌入/重设/删除/拖拽把手”；仅把手可拖拽
- ai-card.tsx → AICardComponent：基于 TextContentCard 的样式，`react-markdown` 渲染 Markdown + LaTeX/代码

---

## components/toolbar/toolbar.tsx
顶部工具栏，包含工具选择、撤销/重做、复制剪切粘贴、对齐分布、视图控制、网格控制，以及 Save/Load。

- export function Toolbar(): JSX.Element
  - handleZoomIn/handleZoomOut/resetZoom/zoomToFit：视图缩放控制
  - saveCanvasToJson(): 将当前文档（camera/grid/cards/AI设置）序列化为 JSON 并下载
  - loadCanvasFromJson(): 从 JSON 读取并恢复文档、相机与网格设置，写入本地存储的 AI 设置

## components/toolbar/formatting-toolbar.tsx
富文本格式工具条，与 TipTap Editor 动态交互。
- 按钮：加粗/斜体/下划线/删除线/颜色（字号与高亮当前标记为 TBC）
- 交互：通过 `onMouseDown` 抑制编辑器 blur；调用 `setSuppressBlur` 避免误触导致的退出编辑

---

## components/ai-dock/ai-dock.tsx
底部 AI 输入 Dock（长胶囊输入 + 建议胶囊 + 发送按钮）。
- 负责发起两段式调用：先 `/api/complete` 总结标题，再 `/api/chat` 流式生成内容，并创建 `ai-card`。
- 读取/使用 `ModelSelector` 中保存的 baseUrl/apiKey/model/systemPrompt。

## components/ai/model-selector.tsx
右上角模型选择/配置面板。
- Base URL / API Key / Model 下拉 / 验证按钮
- 预置多家 Provider 的 Base URL
- “系统 Prompt” 文本域（含默认值），数据持久化到 localStorage

---

## store/canvas.store.ts
Zustand 全局状态与业务逻辑核心，定义文档结构、卡片增删改查、选择、多选、对齐分布、相机控制、历史记录等。

- 文档结构（document）
  - cards: AnyCard[]
  - edges: Edge[]（保留，当前未启用）
  - camera: { x, y, zoom }
  - gridSize / snapToGrid

- 主要方法（节选）
  - setDocument(doc): 替换整个文档（用于 Load）
  - addCard(card): 新增卡片（Omit<AnyCard,'id'|'createdAt'|'updatedAt'>）
  - updateCard(id, updates): 更新卡片
  - deleteCard(id): 删除卡片
  - duplicateCard(id): 复制卡片
  - selectCard(id, multiSelect?): 选中卡片
  - selectCards(ids: string[]): 多选
  - clearSelection(): 取消选择
  - alignCards(direction): 多卡对齐（left/center/right/top/middle/bottom）
  - distributeCards(direction): 等距分布（horizontal/vertical）
  - arrangeCards(type): 排列（grid/list/circle）
  - setCamera(updates): 更新相机（支持局部）
  - zoomToFit(): 缩放至适配
  - undo/redo/canUndo/canRedo/pushHistory(): 历史栈
  - setTextEditing(isEditing)/setActiveEditor(editor)/setSuppressBlur(ms): 富文本编辑态控制

---

## types/canvas.ts
统一卡片类型系统定义。
- CardType: 'text' | 'text-card' | 'ai-card' | 'figure-card' | 'pdf-card' | 'video-card'
- BaseCard: 通用属性（位置/尺寸/层级/网格/样式）
- 各派生卡：TextCard / TextContentCard / AIContentCard / FigureCard / PdfCard / VideoCard
- AnyCard 联合类型、Document 结构、Camera/Edge、SelectionBox 等

---

## utils/transforms.ts
画布坐标变换与几何工具。
- screenToWorld / worldToScreen：坐标空间互转
- screenBoundsToWorld：屏幕框选区域 → 世界坐标
- snapPointToGrid：点吸附到网格
- isPointInBounds：点在矩形内测试

## utils/grid-alignment.ts
网格对齐工具类（如需要可在此扩展更复杂的吸附策略）。

---

## 事件与防抖策略备忘
- 在可编辑元素上阻止 `pointerdown`/`keydown` 冒泡，避免误触 BaseCard 拖拽
- 通过 `e.nativeEvent.stopImmediatePropagation()` 处理顽固事件冲突
- 双击检测：结合 `onDoubleClick` 与 `onPointerDown` 的 detail 判定
- 通过 `suppressBlurUntil` 延迟 blur，避免点击外部工具条导致编辑退出

---

## 开发建议
- 新增卡片类型时：
  1) 在 `types/canvas.ts` 增加类型
  2) 在 `components/cards/*` 新建组件
  3) 在 `cards-layer.tsx` 的 `renderCard` 注册
  4) 在工具栏增加入口（如需要）
- 涉及通用交互（拖拽/缩放）优先改动 `BaseCardComponent`
- 坚持事件边界与坐标系统一（world/screen 分层清晰）

---

如需更深入的实现细节，请在源码中搜索对应函数名，或在 Issue 中提出需要补充的模块。
