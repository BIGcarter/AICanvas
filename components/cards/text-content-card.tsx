'use client';

import React, { useState, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextContentCard } from '@/types/canvas';
import { BaseCardComponent } from '@/components/cards/base-card';
import { useCanvasStore } from '@/store/canvas.store';

interface TextContentCardProps {
  card: TextContentCard;
  style: React.CSSProperties;
}

export function TextContentCardComponent({ card, style }: TextContentCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);
  const [bodyValue, setBodyValue] = useState(card.bodyHtml);
  
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  
  const { updateCard, selectedIds } = useCanvasStore();
  const isSelected = selectedIds.includes(card.id);
  const { editingCardId, cancelEditNonce } = useCanvasStore() as any;

  // TipTap editor for body (when editing)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
    ],
    content: bodyValue || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setBodyValue(html);
    },
  });

  // 同步编辑器内容（进入编辑时加载当前文本）
  React.useEffect(() => {
    if (isEditingBody && editor) {
      editor.commands.setContent(bodyValue || '', false);
      useCanvasStore.getState().setActiveEditor(editor);
      useCanvasStore.getState().setTextEditing(true);
    }
  }, [isEditingBody, editor]);

  // 手动双击检测，避免父级pointer逻辑影响React的dblclick
  const lastTitleClickTs = useRef<number>(0);
  const lastBodyClickTs = useRef<number>(0);
  const tryTitleDoubleClick = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTitleClickTs.current < 300) {
      handleTitleEdit();
    }
    lastTitleClickTs.current = now;
  };
  const tryBodyDoubleClick = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastBodyClickTs.current < 300) {
      handleBodyEdit();
    }
    lastBodyClickTs.current = now;
  };

  // 编辑标题
  const handleTitleEdit = () => {
    console.log('🎯 handleTitleEdit 被调用');
    console.log('🎯 当前 isEditingTitle:', isEditingTitle);
    setIsEditingBody(false); // 确保只开启一个编辑态，避免相互打断
    setIsEditingTitle(true);
    // 使用当前卡片的最新标题，允许为空
    const currentTitle = card.title ?? '';
    setTitleValue(currentTitle);
    console.log('🎯 设置 isEditingTitle 为 true，标题值:', currentTitle);
  };

  // 编辑内容
  const handleBodyEdit = () => {
    console.log('🎯 handleBodyEdit 被调用');
    console.log('🎯 当前 isEditingBody:', isEditingBody);
    setIsEditingTitle(false); // 确保只开启一个编辑态
    setIsEditingBody(true);
    useCanvasStore.getState().setActiveEditor(editor);
    useCanvasStore.getState().setTextEditing(true);
    // 使用当前卡片的最新内容，允许为空
    const currentBody = card.bodyHtml ?? '';
    setBodyValue(currentBody);
    console.log('🎯 设置 isEditingBody 为 true，内容值:', currentBody);
  };

  // React to external edit controls
  React.useEffect(() => {
    if (editingCardId === card.id && !isEditingBody && !isEditingTitle) {
      handleBodyEdit();
    }
    if (editingCardId !== card.id && (isEditingBody || isEditingTitle)) {
      handleSaveEdit();
    }
  }, [editingCardId]);

  React.useEffect(() => {
    if (isEditingBody || isEditingTitle) {
      setIsEditingBody(false);
      setIsEditingTitle(false);
      useCanvasStore.getState().setActiveEditor(null);
      useCanvasStore.getState().setTextEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelEditNonce]);

  // 完成标题编辑
  const handleTitleComplete = () => {
    const currentTitle = titleRef.current?.value || '';
    console.log('🎯 完成标题编辑，当前标题:', currentTitle);
    
    // 只要内容发生变化就保存（允许空字符串）
    if (currentTitle !== card.title) {
      console.log('🎯 保存新标题:', currentTitle);
      updateCard(card.id, { title: currentTitle });
      setTitleValue(currentTitle);
    } else {
      console.log('🎯 标题未变化或为空，恢复到原始内容');
      setTitleValue(card.title);
    }
    
    setIsEditingTitle(false);
  };

  // 完成内容编辑
  const handleBodyComplete = () => {
    const currentBody = editor?.getHTML() || '';
    console.log('🎯 完成内容编辑，当前内容长度:', currentBody.length);
    
    // 只要内容发生变化就保存（允许空字符串）
    if (currentBody !== card.bodyHtml) {
      console.log('🎯 保存新内容，长度:', currentBody.length);
      updateCard(card.id, { bodyHtml: currentBody });
      setBodyValue(currentBody);
    } else {
      console.log('🎯 内容未变化或为空，恢复到原始内容');
      setBodyValue(card.bodyHtml);
    }
    
    setIsEditingBody(false);
    useCanvasStore.getState().setActiveEditor(null);
    useCanvasStore.getState().setTextEditing(false);
  };

  // 处理标题失去焦点
  const handleTitleBlur = () => {
    // 延迟处理，避免立即保存
    setTimeout(() => {
      if (!isEditingTitle) return; // 如果已经不在编辑状态，不处理
      
      const currentTitle = titleRef.current?.value || '';
      // 与原始内容不同时才保存（允许空字符串）
      if (currentTitle !== card.title) {
        console.log('🎯 标题失去焦点，保存内容:', currentTitle);
        updateCard(card.id, { title: currentTitle });
        setTitleValue(currentTitle);
      } else {
        console.log('🎯 标题失去焦点，内容未变化，不保存');
        setTitleValue(card.title);
      }
      
      setIsEditingTitle(false);
    }, 200); // 缩短延迟，减少“闪入又闪出”的体感，同时仍避免按钮点击冲突
  };

  // 处理内容失去焦点
  const handleBodyBlur = () => {
    // 延迟处理，避免立即保存
    setTimeout(() => {
      // 若刚从格式工具条点击返回，短时间内忽略一次 blur
      const { suppressBlurUntil } = useCanvasStore.getState() as any;
      if (Date.now() < suppressBlurUntil) return;
      if (!isEditingBody) return; // 如果已经不在编辑状态，不处理
      
      const currentBody = editor?.getHTML() || '';
      // 与原始内容不同时才保存（允许空字符串）
      if (currentBody !== card.bodyHtml) {
        console.log('🎯 内容失去焦点，保存内容，长度:', currentBody.length);
        updateCard(card.id, { bodyHtml: currentBody });
        setBodyValue(currentBody);
      } else {
        console.log('🎯 内容失去焦点，内容未变化，不保存');
        setBodyValue(card.bodyHtml);
      }
      
      setIsEditingBody(false);
      useCanvasStore.getState().setActiveEditor(null);
      useCanvasStore.getState().setTextEditing(false);
    }, 250); // 缩短延迟，提高编辑稳定性
  };

  // 键盘事件处理
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleComplete();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setTitleValue(card.title);
    }
    // 允许所有其他按键，包括空格
  };

  const handleBodyKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      setIsEditingBody(false);
      setBodyValue(card.bodyHtml);
    }
    // 允许 Enter 换行，Ctrl+Enter 保存
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleBodyComplete();
    }
  };

  // 双击卡片进入编辑模式
  const handleEdit = () => {
    if (!isEditingTitle && !isEditingBody) {
      // 默认进入标题编辑模式
      handleTitleEdit();
    }
  };

  // 保存编辑并退出编辑模式
  const handleSaveEdit = () => {
    if (isEditingTitle) {
      handleTitleComplete();
    }
    if (isEditingBody) {
      handleBodyComplete();
    }
  };

  // 不再用单击容器触发编辑，避免与双击逻辑冲突

  // 聚焦到编辑区域
  React.useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      // 等待下一帧，避免与pointer事件竞争
      requestAnimationFrame(() => {
        titleRef.current && titleRef.current.focus();
        titleRef.current && titleRef.current.select();
      });
    }
  }, [isEditingTitle]);

  // TipTap 聚焦交由 FormattingToolbar 触发或用户点击，无需 textarea 选择

  return (
    <BaseCardComponent
      card={card}
      style={style}
      onSaveEdit={handleSaveEdit}
      className="text-content-card"
    >
      {/* 内置编辑按钮恢复显示 */}
      {isSelected && !isEditingTitle && !isEditingBody && (
        <div className="absolute top-2 left-2 z-50 flex gap-2">
          <button
            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors border border-blue-600 shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              handleTitleEdit();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            title="编辑标题"
          >
            编辑标题
          </button>
          <button
            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors border border-green-600 shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              handleBodyEdit();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            title="编辑内容"
          >
            编辑内容
          </button>
        </div>
      )}

      {/* 内置保存按钮 - 编辑标题时显示 */}
      {isEditingTitle && (
        <div className="absolute top-2 left-2 z-50 flex gap-2">
          <button
            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors border border-green-600 shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              handleTitleComplete();
            }}
            title="保存标题"
          >
            ✓ 保存标题
          </button>
          <button
            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md transition-colors border border-red-600 shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              setIsEditingTitle(false);
              setTitleValue(card.title);
            }}
            title="取消编辑"
          >
            ✗ 取消
          </button>
        </div>
      )}

      {/* 保存按钮 - 编辑内容时显示 */}
      {isEditingBody && (
        <div className="absolute top-2 left-2 z-50 flex gap-2">
          <button
            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors border border-green-600 shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              handleBodyComplete();
            }}
            title="保存内容"
          >
            ✓ 保存内容
          </button>
          <button
            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md transition-colors border border-red-600 shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              setIsEditingBody(false);
              setBodyValue(card.bodyHtml);
            }}
            title="取消编辑"
          >
            ✗ 取消
          </button>
        </div>
      )}

      <div className="w-full h-full flex flex-col p-4">
        {/* 标题区域 */}
        <div className="mb-3">
          {isEditingTitle ? (
            <textarea
              ref={titleRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="w-full font-bold text-lg outline-none border-b-2 border-blue-300 px-2 py-1 resize-none"
              style={{ minHeight: '28px' }}
              placeholder="输入标题..."
              data-title-area="true"
            />
          ) : (
            <h3
              className="font-bold text-lg cursor-pointer hover:bg-gray-50 transition-colors p-2 -m-2 rounded"
              onDoubleClick={(e) => { e.stopPropagation(); handleTitleEdit(); }}
              onPointerDown={tryTitleDoubleClick}
              data-title-area="true"
              title="点击或双击编辑标题"
            >
              {(card.title ?? '').trim() === '' ? (
                <span className="text-gray-400 italic">点击编辑标题...</span>
              ) : (
                card.title
              )}
            </h3>
          )}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-h-0">
          {isEditingBody ? (
            <div className="w-full h-full outline-none border-2 border-green-300 rounded p-2 overflow-y-auto" data-scroll-container="true" style={{ minHeight: '100px' }}>
              <div onBlur={handleBodyBlur}>
                <EditorContent editor={editor} />
              </div>
            </div>
          ) : (
            <div
              className="w-full h-full cursor-pointer hover:bg-gray-50 transition-colors p-2 -m-2 rounded overflow-y-auto"
              data-scroll-container="true"
              onDoubleClick={(e) => { e.stopPropagation(); handleBodyEdit(); }}
              onPointerDown={tryBodyDoubleClick}
              title="点击或双击编辑内容"
            >
              {(!card.bodyHtml || card.bodyHtml.trim() === '') ? (
                <span className="text-gray-400 italic">点击编辑内容...</span>
              ) : (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: card.bodyHtml }} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 编辑状态指示器 */}
      {(isEditingTitle || isEditingBody) && (
        <div className="absolute -top-8 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded pointer-events-none shadow-md">
          {isEditingTitle ? '编辑标题中...' : '编辑内容中...'}
          <span className="ml-1 opacity-75">
            {isEditingTitle ? '使用保存按钮或按Enter保存' : '使用保存按钮保存，支持换行'}
          </span>
        </div>
      )}
    </BaseCardComponent>
  );
}
