'use client';

import React, { useRef, useState } from 'react';
import { AIContentCard } from '@/types/canvas';
import { BaseCardComponent } from '@/components/cards/base-card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface AICardProps {
  card: AIContentCard;
  style: React.CSSProperties;
}

export function AICardComponent({ card, style }: AICardProps) {
  // 样式与 TextContentCard 一致：标题 + 内容区域（只读，渲染 markdown）
  return (
    <BaseCardComponent card={card} style={style} className="ai-card" dragFromHandleOnly>
      <div className="w-full h-full flex flex-col p-4">
        {/* 左上角拖拽手柄，其他区域可自由选择文本 */}
        <div
          data-drag-handle="true"
          className="absolute top-2 left-2 w-4 h-4 rounded-full bg-white/90 border border-gray-400 shadow-sm cursor-grab"
          title="拖拽移动卡片"
        />
        {/* 标题区域（与 TextContentCard 的非编辑态一致） */}
        <div className="mb-3">
          <h3
            className="font-bold text-lg p-2 -m-2 rounded"
            title={card.title || 'AI 内容'}
          >
            {card.title || 'AI 内容'}
          </h3>
        </div>

        {/* 内容区域（滚动、只读） */}
        <div className="flex-1 min-h-0">
          <div
            className="w-full h-full transition-colors p-2 -m-2 rounded overflow-y-auto"
            data-scroll-container="true"
            data-text-selectable="true"
            title="Markdown 内容"
          >
            <div className="whitespace-pre-wrap break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ inline, className, children, ...props }: any) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {card.bodyMarkdown || ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </BaseCardComponent>
  );
}


