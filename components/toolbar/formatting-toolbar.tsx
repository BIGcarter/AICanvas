'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/store/canvas.store';

export function FormattingToolbar() {
  const { isTextEditing, activeEditor, setSuppressBlur } = useCanvasStore() as any;
  const editor: any = activeEditor;

  if (!isTextEditing || !editor) return <div className="flex-1" />;

  const applySize = (px: number) => {
    setSuppressBlur(300);
    // TipTap 推荐用 updateAttributes 对 mark 设置样式
    const exists = editor.isActive('textStyle');
    if (!exists) {
      editor.chain().focus().setMark('textStyle', { fontSize: `${px}px` }).run();
    } else {
      editor.chain().focus().updateAttributes('textStyle', { fontSize: `${px}px` }).run();
    }
  };

  return (
    <div
      className="flex-1 flex items-center justify-center gap-1"
      data-formatting-toolbar="true"
      onMouseDown={(e) => {
        // 仅对非原生表单控件阻止默认，避免 select/color 无法打开
        const target = e.target as HTMLElement;
        const tag = target.tagName.toLowerCase();
        if (tag === 'select' || tag === 'input' || tag === 'button' || target.closest('select,input,button')) {
          return;
        }
        e.preventDefault();
      }}
    >
      {/* Font size */}
      <select
        className="h-8 text-xs border rounded px-2 opacity-60 cursor-not-allowed"
        title="字号 (TBC)"
        defaultValue="14"
        disabled
      >
        {[12,14,16,18,20,24,28,32].map(s => (
          <option key={s} value={s}>{s}px</option>
        ))}
      </select>

      <Button title="加粗" variant="ghost" size="sm" onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation(); setSuppressBlur(300);}} onClick={() => { setSuppressBlur(300); editor.chain().focus().toggleBold().run(); }} className="h-8">B</Button>
      <Button title="斜体" variant="ghost" size="sm" onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation(); setSuppressBlur(300);}} onClick={() => { setSuppressBlur(300); editor.chain().focus().toggleItalic().run(); }} className="h-8">I</Button>
      <Button title="下划线" variant="ghost" size="sm" onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation(); setSuppressBlur(300);}} onClick={() => { setSuppressBlur(300); editor.chain().focus().toggleUnderline().run(); }} className="h-8">U</Button>
      <Button title="删除线" variant="ghost" size="sm" onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation(); setSuppressBlur(300);}} onClick={() => { setSuppressBlur(300); editor.chain().focus().toggleStrike().run(); }} className="h-8">S</Button>

      {/* Color */}
      <input type="color" className="h-8 w-8 p-0 border rounded"
        onMouseDown={(e) => { e.stopPropagation(); setSuppressBlur(300); }}
        onChange={(e) => { editor.chain().focus().setMark('textStyle', { color: e.target.value }).run(); setSuppressBlur(300); }}
        title="文字颜色"
      />
      {/* Highlight */}
      <Button variant="ghost" size="sm" disabled title="Highlight (TBC)" className="h-8 opacity-60 cursor-not-allowed">HL</Button>
    </div>
  );
}


