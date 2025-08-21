'use client';

import React, { useState } from 'react';
import { Send, Sparkles, Lightbulb, Palette, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/store/canvas.store';
import { useEffect, useRef } from 'react';
import { nanoid } from '@/utils/nanoid';
import { CardNode } from '@/types/canvas';

const examplePrompts = [
  {
    icon: Lightbulb,
    text: "生成返校季海报创意",
    description: "为大学返校季活动生成创意方案"
  },
  {
    icon: Palette,
    text: "品牌色彩搭配方案",
    description: "为新品牌设计配色方案"
  },
  {
    icon: Users,
    text: "团队头脑风暴话题",
    description: "生成创意讨论话题"
  }
];

const mockCardData = [
  {
    title: "视觉主题：青春回归",
    bodyHtml: "使用明亮的橙色和蓝色配色，营造充满活力的校园氛围。主要元素包括书包、笔记本、咖啡杯等校园用品。",
    tags: ["视觉设计", "配色方案"]
  },
  {
    title: "文案方向：情感共鸣",
    bodyHtml: "「重新出发，从这个九月开始」- 强调新学期新开始的概念，结合回忆和期待的情感元素。",
    tags: ["文案策略", "情感营销"]
  },
  {
    title: "媒体投放策略",
    bodyHtml: "重点投放社交媒体平台，特别是抖音和小红书。制作短视频内容，展示学生生活场景。",
    tags: ["媒体策略", "社交媒体"]
  },
  {
    title: "活动执行方案",
    bodyHtml: "线上线下结合，校园内设置打卡点，线上发起#返校季话题挑战，鼓励学生分享返校故事。",
    tags: ["活动策划", "互动营销"]
  }
];

export function AIDock() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  const { addNode, updateCard, camera } = useCanvasStore();

  // Read model settings from localStorage
  const getModelSettings = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('model-selector') || '{}');
      return {
        baseUrl: saved.baseUrl || '',
        apiKey: saved.apiKey || '',
        model: saved.selectedModel || '',
        systemPrompt: saved.systemPrompt || '',
      };
    } catch {
      return { baseUrl: '', apiKey: '', model: '', systemPrompt: '' };
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);

    // Place a single streaming TextContentCard at center
    const cardWidth = 420;
    const cardHeight = 260;
    const viewportCenter = {
      x: (window.innerWidth / 2 - camera.x) / camera.zoom,
      y: (window.innerHeight / 2 - camera.y) / camera.zoom,
    };
    const x = viewportCenter.x - cardWidth / 2;
    const y = viewportCenter.y - cardHeight / 2;

    const newCard: Omit<CardNode, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'ai-card' as any,
      x,
      y,
      width: cardWidth,
      height: cardHeight,
      z: 100,
      title: prompt.slice(0, 20) || 'AI 生成',
      // For AI card use markdown field name; store layer uses union so we cast later on update
      bodyHtml: '',
      tags: [],
      gridSize: 20,
      snapToGrid: true,
    };

    // Add immediately to get its id (via addNode returns void, so we read it from store after pushHistory)
    addNode(newCard);

    // Find the id of the last added card (best-effort)
    const stateAfter = useCanvasStore.getState();
    const cardId = stateAfter.document.cards[stateAfter.document.cards.length - 1]?.id;

    // Stream from /api/chat
    const { baseUrl, apiKey, model, systemPrompt } = getModelSettings();
    if (!baseUrl || !model) {
      alert('请先在右上角选择供应商与模型');
      setIsGenerating(false);
      return;
    }

    try {
      // Step 1: summarize title
      const SUM_PROMPT = '你是个用户query总结助手，你的任务是将query总结成20个字以内的短语（如果是英语的话5个单词以内），我要用作为这段内容的标题，请你只输出总结，不输出其他内容。';
      const titleResp = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          model,
          messages: [
            { role: 'system', content: SUM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 64,
        }),
      });
      const titleData = await titleResp.json();
      let titleText = prompt.slice(0, 20);
      if (titleData?.ok && typeof titleData?.text === 'string') {
        titleText = (titleData.text as string).trim().replace(/^['"\s]+|['"\s]+$/g, '');
      }

      // Update newly created card title
      if (cardId) updateCard(cardId, { title: titleText } as any);

      // Step 2: stream main content with systemPrompt
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.text();
        throw new Error(err || '请求失败');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';

      const flushDelta = (delta: string) => {
        if (!cardId) return;
        accumulated += delta;
        // For AI card we map to bodyMarkdown when present
        updateCard(cardId, { bodyHtml: accumulated, bodyMarkdown: accumulated } as any);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Parse SSE chunks by lines
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const chunk of parts) {
          const lines = chunk.split('\n');
          for (const line of lines) {
            const m = line.match(/^data: *(.*)$/);
            if (!m) continue;
            const payload = m[1];
            if (payload === '[DONE]') {
              buffer = '';
              break;
            }
            try {
              const json = JSON.parse(payload);
              const content = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.text ?? '';
              if (content) flushDelta(content);
            } catch {
              // Some providers may send plain text
              if (payload) flushDelta(payload);
            }
          }
        }
      }
    } catch (e: any) {
      if (cardId) updateCard(cardId, { bodyHtml: (e?.message || '请求失败') });
    } finally {
      setPrompt('');
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    setIsExpanded(false);
  };

  // Disable auto-expanding example suggestions when focusing input
  const handleInputFocus = () => {
    // intentionally no-op to prevent suggestions
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => {
          setIsVisible(true);
          setIsExpanded(false);
        }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
        style={{ zIndex: 999999 }}
      >
        <ChevronUp className="h-5 w-5 text-white" />
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2"
      style={{ zIndex: 999999 }}
    >
      <div className="flex flex-col items-center">
        {/* Examples section (expandable) */}
        {isExpanded && (
          <div className="mb-6">
            <div className="flex gap-3 justify-center">
              {examplePrompts.map((example, index) => {
                const Icon = example.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example.text)}
                    className="ai-example-capsule flex items-center gap-2 px-4 py-2 text-gray-700 rounded-full transition-all duration-200 shadow-sm animate-bounce-in"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    <Icon className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">{example.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Main input section */}
        <div className="flex items-center gap-4">
          {/* Hide button - moved to left */}
          <button
            onClick={() => {
              setIsVisible(false);
              setIsExpanded(false);
            }}
            className="w-10 h-10 bg-gray-300 hover:bg-gray-400 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm flex-shrink-0"
          >
            <ChevronDown className="h-4 w-4 text-gray-700" />
          </button>
          
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              // onFocus is intentionally disabled to avoid popping examples
              placeholder="Ask me anything..."
              className="ai-capsule-input px-6 py-4 rounded-full border-none text-gray-900 placeholder-gray-500 resize-none focus:outline-none focus:ring-0 transition-all"
              rows={1}
              style={{ width: '600px', minHeight: '60px', maxHeight: '60px' }}
            />
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-14 h-14 bg-black hover:bg-gray-800 disabled:bg-gray-400 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg flex-shrink-0"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
