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
        <div className="flex-1 min-h-0 relative">
          {/* Research ongoing 图层 */}
          {(card as any).researchOngoing && (
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-white/60 backdrop-blur-md z-10 flex items-center justify-center rounded">
              {/* 添加一个微妙的边框效果 */}
              <div className="absolute inset-0 border-2 border-white/30 rounded pointer-events-none"></div>
              
              <div className="text-center relative z-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 shadow-lg"></div>
                <div className="text-lg font-medium text-gray-700 drop-shadow-sm font-semibold">Research ongoing...</div>
                <div className="text-sm text-gray-500 mt-1 drop-shadow-sm">Please wait while we gather information</div>
              </div>
            </div>
          )}
          
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


