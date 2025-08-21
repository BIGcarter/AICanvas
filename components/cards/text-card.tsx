'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextCard } from '@/types/canvas';
import { BaseCardComponent } from '@/components/cards/base-card';
import { useCanvasStore } from '@/store/canvas.store';

interface TextCardProps {
  card: TextCard;
  style: React.CSSProperties;
}

export function TextCardComponent({ card, style }: TextCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(card.content);
  const [isCompleting, setIsCompleting] = useState(false); // 添加状态锁
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { updateCard, selectedIds } = useCanvasStore();
  const isSelected = selectedIds.includes(card.id);

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
    ],
    content: editValue || '',
    onUpdate: ({ editor }) => {
      setEditValue(editor.getHTML());
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
    setIsCompleting(false);
    setEditValue(card.content);
    // 进入富文本会话
    if (editor) {
      editor.commands.setContent(card.content || '', false);
    }
    useCanvasStore.getState().setActiveEditor(editor);
    useCanvasStore.getState().setTextEditing(true);
  };

  // React to external edit controls
  const { editingCardId, startEdit, clearEdit, cancelEditNonce } = useCanvasStore() as any;
  useEffect(() => {
    if (editingCardId === card.id && !isEditing) {
      handleEdit();
    }
    if (editingCardId !== card.id && isEditing) {
      // external finished
      handleComplete();
    }
  }, [editingCardId]);

  useEffect(() => {
    // external cancel request
    if (isEditing) {
      setIsEditing(false);
      setIsCompleting(false);
      setEditValue(card.content);
      useCanvasStore.getState().setActiveEditor(null);
      useCanvasStore.getState().setTextEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelEditNonce]);

  const handleComplete = () => {
    if (isCompleting) return; // 防止重复调用
    setIsCompleting(true);
    setIsEditing(false);
    const html = editor?.getHTML() || editValue || '';
    if (html !== card.content) {
      updateCard(card.id, { content: html });
    }
    useCanvasStore.getState().setActiveEditor(null);
    useCanvasStore.getState().setTextEditing(false);
  };

  const handleBlur = () => {
    // 只有在非完成状态时才处理blur
    const { suppressBlurUntil } = useCanvasStore.getState() as any;
    if (Date.now() < suppressBlurUntil) return;
    if (!isCompleting) {
      handleComplete();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    if (e.key === 'Escape') {
      setIsEditing(false);
      setIsCompleting(false);
      setEditValue(card.content);
    }
    // Note: For text cards, we allow Enter for line breaks
    // Use Ctrl+Enter or blur to complete editing
    if ((e.key === 'Enter' && e.ctrlKey) || (e.key === 'Enter' && !e.shiftKey && card.content.length === 0)) {
      e.preventDefault();
      handleComplete();
    }
  };

  // Focus editor handled by TipTap + toolbar；同步 editor 就绪时的内容与会话
  useEffect(() => {
    if (isEditing && editor) {
      editor.commands.setContent(editValue || '', false);
      useCanvasStore.getState().setActiveEditor(editor);
      useCanvasStore.getState().setTextEditing(true);
    }
  }, [isEditing, editor]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(40, textarea.scrollHeight)}px`;
    }
  }, [editValue, isEditing]);

  // Update local state when card content changes
  useEffect(() => {
    setEditValue(card.content);
  }, [card.content]);

  const textStyles = card.textStyles || {};

  return (
    <BaseCardComponent
      card={card}
      style={style}
      onEdit={handleEdit}
      className="text-card"
    >
      {/* 编辑控制按钮 - 两个独立的按钮对象 */}
      {/* 内置编辑/完成按钮恢复显示 */}
      <button
        className={`absolute top-2 left-2 z-30 px-2 py-1 text-xs rounded-md transition-colors border ${
          !isEditing && isSelected
            ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' 
            : 'hidden'
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleEdit();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        title="编辑文本"
      >
        编辑
      </button>
      
      <button
        className={`absolute top-2 left-2 z-30 px-2 py-1 text-xs rounded-md transition-colors border ${
          isEditing 
            ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' 
            : 'hidden'
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // 先设置状态锁，防止blur事件干扰
          setIsCompleting(true);
          setTimeout(() => {
            handleComplete();
          }, 0);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        title="完成编辑"
      >
        ✓ 完成
      </button>
      
      {isEditing ? (
        <div className="w-full h-full border-2 border-green-300 rounded p-2 overflow-y-auto bg-transparent" data-scroll-container="true" onBlur={handleBlur}>
          <EditorContent editor={editor} className="focus:outline-none text-slate-800" />
        </div>
      ) : (
        <div
          className="w-full h-full cursor-text overflow-hidden flex items-center justify-center text-center"
          style={{
            fontSize: textStyles.fontSize || 40,
            fontFamily: textStyles.fontFamily || 'inherit',
            fontWeight: textStyles.fontWeight || 'normal',
            textAlign: textStyles.textAlign || 'center',
            color: textStyles.color || '#1e293b',
            lineHeight: textStyles.lineHeight || 1.5,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
          onClick={handleEdit}
          onDoubleClick={handleEdit}
          title="Click to edit text"
        >
          {(card.content || '').trim() ? (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: card.content }} />
          ) : (
            <span className="text-gray-400 italic">Click to add text...</span>
          )}
        </div>
      )}
      
      {/* Editing indicator */}
      {isEditing && (
        <div className="absolute -top-8 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded pointer-events-none">
          Editing text...
        </div>
      )}
    </BaseCardComponent>
  );
}
