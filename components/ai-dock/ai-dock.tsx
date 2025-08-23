'use client';

import React, { useState } from 'react';
import { Send, Sparkles, Lightbulb, Palette, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/store/canvas.store';
import { useEffect, useRef } from 'react';
import { nanoid } from '@/utils/nanoid';
import { CardNode } from '@/types/canvas';

// 自定义动画样式
const sweepAnimation = `
  @keyframes sweep {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .animate-sweep {
    animation: sweep 2s ease-in-out infinite;
  }
`;

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
  const [isDeepResearchMode, setIsDeepResearchMode] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchAbortController, setResearchAbortController] = useState<AbortController | null>(null);
  const [normalAIController, setNormalAIController] = useState<AbortController | null>(null);
  const currentResearchCardId = useRef<string | undefined>(undefined);
  
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
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
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
        bodyHtml: isDeepResearchMode ? 'Doing research...' : '',
        tags: [],
        gridSize: 20,
        snapToGrid: true,
        // 为 Deep Research 添加特殊标识
        ...(isDeepResearchMode && { researchOngoing: true }),
      };

      // Add immediately to get its id (via addNode returns void, so we read it from store after pushHistory)
      addNode(newCard);

      // Find the id of the last added card (best-effort)
      const stateAfter = useCanvasStore.getState();
      const cardId = stateAfter.document.cards[stateAfter.document.cards.length - 1]?.id;

      if (isDeepResearchMode) {
        // Deep Research 模式：调用 GPT Researcher 接口
        await handleDeepResearch(cardId);
      } else {
        // 普通 AI 模式：调用原有的 chat 接口
        await handleNormalAI(cardId);
      }
    } catch (error) {
      console.error('Error in handleGenerate:', error);
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    setIsExpanded(false);
  };

  const toggleDeepResearchMode = () => {
    setIsDeepResearchMode(!isDeepResearchMode);
    // 切换模式时清空输入框
    setPrompt('');
  };

  const cancelResearch = async () => {
    try {
      console.log('Cancelling current operation...');
      
      // 取消普通AI请求
      if (normalAIController) {
        console.log('Cancelling normal AI request...');
        normalAIController.abort();
        setNormalAIController(null);
        // 注意：普通AI取消时不更新卡片内容，保留已流式输出的内容
      }
      
      // 取消 Deep Research 请求
      if (researchAbortController) {
        console.log('Cancelling Deep Research request...');
        researchAbortController.abort();
        setResearchAbortController(null);
      }
      
      // 如果是 Deep Research 模式，还需要调用后端取消端点
      if (isDeepResearchMode && isResearching) {
        try {
          const response = await fetch('/api/research/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const result = await response.json();
          
          if (result.success) {
            console.log('Deep Research cancelled successfully');
            // 更新卡片状态为已取消
            if (currentResearchCardId.current) {
              updateCard(currentResearchCardId.current, { 
                bodyHtml: 'Research cancelled by user',
                bodyMarkdown: 'Research cancelled by user',
                researchOngoing: false, // 移除研究进行中的标识
              } as any);
            }
          } else {
            console.log('Failed to cancel Deep Research:', result.message);
            // 即使后端取消失败，也要更新前端状态
            if (currentResearchCardId.current) {
              updateCard(currentResearchCardId.current, { 
                bodyHtml: 'Research cancellation failed',
                bodyMarkdown: 'Research cancellation failed',
                researchOngoing: false, // 移除研究进行中的标识
              } as any);
            }
          }
        } catch (error) {
          console.error('Error cancelling Deep Research:', error);
          // 即使出错，也要更新前端状态
          if (currentResearchCardId.current) {
            updateCard(currentResearchCardId.current, { 
              bodyHtml: 'Research cancellation error',
              bodyMarkdown: 'Research cancellation error',
              researchOngoing: false, // 移除研究进行中的标识
            } as any);
          }
        }
      }
      
    } catch (error) {
      console.error('Error in cancelResearch:', error);
    } finally {
      // 清理所有前端状态
      setIsResearching(false);
      setIsGenerating(false);
      setPrompt('');
    }
  };

  const handleDeepResearch = async (cardId: string | undefined) => {
    // 设置当前研究的卡片ID
    currentResearchCardId.current = cardId;
    
    // 创建 AbortController 用于取消请求
    const abortController = new AbortController();
    setResearchAbortController(abortController);
    setIsResearching(true);
    
    try {
      // 调用 Deep Research 接口
      const resp = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: prompt,
          report_type: 'research_report'
        }),
        signal: abortController.signal, // 添加取消信号
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.detail || 'Deep Research 请求失败');
      }

      const researchData = await resp.json();
      
      // 提取 report 第一行的 # title 作为卡片标题
      let cardTitle = prompt.slice(0, 20) || 'Research Report'; // 默认标题
      let reportContent = researchData.summary;
      
      if (reportContent) {
        const lines = reportContent.split('\n');
        const firstLine = lines[0]?.trim();
        
        // 检查第一行是否以 # 开头
        if (firstLine && firstLine.startsWith('#')) {
          // 提取 # 后面的内容作为标题
          cardTitle = firstLine.substring(1).trim();
          
          // 从 report 内容中移除第一行标题
          if (lines.length > 1) {
            reportContent = lines.slice(1).join('\n').trim();
          }
        }
      }
      
      // 更新卡片内容
      if (cardId) {
        updateCard(cardId, { 
          title: cardTitle,
          bodyHtml: reportContent,
          bodyMarkdown: reportContent,
          researchOngoing: false, // 移除研究进行中的标识
        } as any);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // 用户取消了研究
        if (cardId) {
          updateCard(cardId, { 
            bodyHtml: 'Research cancelled by user',
            bodyMarkdown: 'Research cancelled by user',
            researchOngoing: false, // 移除研究进行中的标识
          } as any);
        }
      } else if (e.message && e.message.includes('cancelled')) {
        // 后端确认取消
        if (cardId) {
          updateCard(cardId, { 
            bodyHtml: 'Research cancelled by user',
            bodyMarkdown: 'Research cancelled by user',
            researchOngoing: false, // 移除研究进行中的标识
          } as any);
        }
      } else if (e.message && e.message.includes('timeout')) {
        // 后端超时
        if (cardId) {
          updateCard(cardId, { 
            bodyHtml: 'Research timeout - please try a simpler question or try again later',
            bodyMarkdown: 'Research timeout - please try a simpler question or try again later',
            researchOngoing: false, // 移除研究进行中的标识
          } as any);
        }
      } else {
        // 其他错误
        if (cardId) {
          updateCard(cardId, { 
            bodyHtml: `Deep Research 失败: ${e.message || '未知错误'}`,
            bodyMarkdown: `Deep Research 失败: ${e.message || '未知错误'}`,
            researchOngoing: false, // 移除研究进行中的标识
          } as any);
        }
      }
    } finally {
      setIsResearching(false);
      setResearchAbortController(null);
      setPrompt('');
      setIsGenerating(false);
    }
  };

  const handleNormalAI = async (cardId: string | undefined) => {
    // 创建 AbortController 用于取消请求
    const abortController = new AbortController();
    setNormalAIController(abortController);
    
    // Stream from /api/chat
    const { baseUrl, apiKey, model, systemPrompt } = getModelSettings();
    if (!baseUrl || !model) {
      alert('请先在右上角选择供应商与模型');
      setIsGenerating(false);
      setNormalAIController(null);
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
        signal: abortController.signal, // 添加取消信号
      });
      
      // 检查是否被取消
      if (abortController.signal.aborted) {
        throw new Error('Request cancelled');
      }
      
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
        signal: abortController.signal, // 添加取消信号
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
        // 检查是否被取消
        if (abortController.signal.aborted) {
          throw new Error('Request cancelled');
        }
        
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
      if (e.name === 'AbortError' || e.message === 'Request cancelled') {
        // 用户取消了请求 - 不更新卡片内容，保留已流式输出的内容
        console.log('AI generation cancelled by user, keeping existing content');
      } else {
        // 其他错误
        if (cardId) {
          updateCard(cardId, { 
            bodyHtml: `AI generation failed: ${e?.message || '请求失败'}`,
            bodyMarkdown: `AI generation failed: ${e?.message || '请求失败'}`
          } as any);
        }
      }
    } finally {
      setPrompt('');
      setIsGenerating(false);
      setNormalAIController(null);
    }
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
    <>
      {/* 注入自定义动画样式 */}
      <style dangerouslySetInnerHTML={{ __html: sweepAnimation }} />
      
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
              {/* Deep Research 模式切换胶囊 - 移动到输入栏左上方 */}
              <div className="relative">
                <button
                  onClick={toggleDeepResearchMode}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm relative overflow-hidden ${
                    isDeepResearchMode 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {isDeepResearchMode ? 'Deep Research ON' : 'Deep Research'}
                  
                  {/* 研究进行中的光扫动画 */}
                  {isDeepResearchMode && isResearching && (
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-sweep"></div>
                    </div>
                  )}
                </button>
               </div>
               
               <div className="relative">
                 <textarea
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                   onKeyDown={handleKeyDown}
                   // onFocus is intentionally disabled to avoid popping examples
                   placeholder={isDeepResearchMode ? "Ask me to research anything..." : "Ask me anything..."}
                   className="ai-capsule-input px-6 py-4 rounded-full border-none text-gray-900 placeholder-gray-500 resize-none focus:outline-none focus:ring-0 transition-all"
                   rows={1}
                   style={{ width: '600px', minHeight: '60px', maxHeight: '60px' }}
                 />
                 
                 {/* 中止键 - 任何AI操作进行中时都显示在输入框内部右侧 */}
                 {(isGenerating || (isDeepResearchMode && isResearching)) && (
                   <button
                     onClick={cancelResearch}
                     className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                     title={isDeepResearchMode ? "Cancel research" : "Cancel AI generation"}
                   >
                     <div className="w-3 h-3 bg-white rounded-sm"></div>
                   </button>
                 )}
               </div>
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
    </>
  );
}
