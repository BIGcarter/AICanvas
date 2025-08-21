'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { VideoCard } from '@/types/canvas';
import { BaseCardComponent } from '@/components/cards/base-card';
import { useCanvasStore } from '@/store/canvas.store';

interface VideoCardProps {
  card: VideoCard;
  style: React.CSSProperties;
}

function extractIframeSrc(input: string): string | null {
  console.log('extractIframeSrc called with:', input);
  if (!input) return null;
  
  // 尝试匹配 iframe src
  const iframeMatch = input.match(/<iframe[^>]*src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    console.log('Found iframe src:', iframeMatch[1]);
    return iframeMatch[1];
  }
  
  // 尝试匹配其他可能的URL模式
  const urlMatch = input.match(/(https?:\/\/[^\s<>"']+)/i);
  if (urlMatch && urlMatch[1]) {
    console.log('Found URL:', urlMatch[1]);
    return urlMatch[1];
  }
  
  // 尝试作为普通URL处理
  try {
    const url = new URL(input, window.location.origin);
    console.log('Parsed as URL:', url.href);
    return url.href;
  } catch (e) {
    console.log('Failed to parse as URL:', e);
    return null;
  }
}

function detectProvider(url: string): VideoCard['provider'] {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('bilibili')) return 'bilibili';
    if (host.includes('youtube') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('vimeo')) return 'vimeo';
    return 'custom';
  } catch {
    return 'custom';
  }
}

export function VideoCardComponent({ card, style }: VideoCardProps) {
  const { updateCard, selectedIds } = useCanvasStore();
  const [input, setInput] = useState('');
  const [videoState, setVideoState] = useState<{
    currentTime: number;
    isPlaying: boolean;
    volume: number;
  } | null>(null);
  const isEmpty = !card.src;
  const isSelected = selectedIds.includes(card.id);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const aspect = useMemo(() => card.aspectRatio || 16 / 9, [card.aspectRatio]);

  // 监听iframe加载完成，尝试恢复视频状态
  useEffect(() => {
    if (iframeRef.current && card.src && videoState) {
      const iframe = iframeRef.current;
      
      // 等待iframe加载完成
      const handleLoad = () => {
        try {
          // 尝试通过postMessage与视频播放器通信
          if (iframe.contentWindow) {
            // 对于Bilibili等支持postMessage的平台
            iframe.contentWindow.postMessage({
              type: 'restoreVideoState',
              data: videoState
            }, '*');
            
            // 延迟设置，确保播放器已完全加载
            setTimeout(() => {
              if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                  type: 'restoreVideoState',
                  data: videoState
                }, '*');
              }
            }, 1000);
          }
        } catch (error) {
          console.log('无法恢复视频状态:', error);
        }
      };
      
      iframe.addEventListener('load', handleLoad);
      return () => iframe.removeEventListener('load', handleLoad);
    }
  }, [card.src, videoState]);

  // 定期保存视频状态（每5秒）
  useEffect(() => {
    if (!card.src || isEmpty) return;
    
    const interval = setInterval(() => {
      try {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          // 尝试获取当前视频状态
          iframeRef.current.contentWindow.postMessage({
            type: 'getVideoState'
          }, '*');
        }
      } catch (error) {
        // 忽略错误，继续尝试
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [card.src, isEmpty]);

  // 监听来自iframe的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'videoStateUpdate') {
        setVideoState(event.data.data);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const submit = () => {
    console.log('Submit clicked, input:', input);
    const src = extractIframeSrc(input.trim());
    console.log('Extracted src:', src);
    if (!src) {
      console.log('No src extracted, returning');
      return;
    }
    const provider = detectProvider(src);
    console.log('Provider detected:', provider);
    console.log('Updating card with:', { src, provider, lockAspectRatio: true, aspectRatio: aspect });
    updateCard(card.id, {
      src,
      provider,
      lockAspectRatio: true,
      aspectRatio: aspect,
    } as any);
    console.log('Card updated');
  };

  return (
    <BaseCardComponent 
      card={card} 
      style={style} 
      className="video-card"
      dragFromHandleOnly={true}
    >
      <div className="w-full h-full bg-black/2 relative">
        {/* 拖拽手柄 - 左上角圆圈 */}
        <div
          className="absolute top-2 left-2 w-4 h-4 rounded-full bg-white/90 border border-gray-400 shadow-sm cursor-grab z-30"
          data-drag-handle="true"
          title="拖拽移动视频卡片"
        />
        
        {/* 重设URL按钮 - 拖拽圆圈右边 */}
        {isSelected && (
          <button
            className="absolute top-2 left-8 z-30 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-gray-700 text-xs rounded-md transition-colors border border-amber-200"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Reset URL clicked');
              // 清除视频源，回到输入状态
              updateCard(card.id, {
                src: '',
                provider: undefined,
              } as any);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            title="重设视频URL"
          >
            重设
          </button>
        )}
        
        {/* 删除卡片按钮 - 右上角 */}
        {isSelected && (
          <button
            className="absolute top-2 right-2 z-30 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-gray-700 text-xs rounded-md transition-colors border border-amber-200"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Delete video card clicked');
              // 删除整个视频卡片
              const { deleteCard } = useCanvasStore.getState();
              deleteCard(card.id);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            title="删除视频卡片"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        {isEmpty ? (
          <div className="absolute inset-0 p-3 flex flex-col gap-2 items-center justify-center text-sm text-gray-600">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => {
                e.stopPropagation();
                // 粘贴事件会自动触发onChange，无需额外处理
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                // 阻止父组件拦截键盘事件
              }}
              placeholder="粘贴平台提供的 iframe 代码或视频链接..."
              className="w-[90%] h-24 resize-none rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 bg-white"
            />
            <button
              className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked!');
                submit();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              title="确认嵌入"
            >
              ✓ 嵌入
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            
            <iframe
              key={`video-${card.id}`} // 使用稳定的key防止重新创建
              src={card.src}
              className="w-full h-full"
              style={{
                transform: 'translateZ(0)', // 创建新的层叠上下文，防止重新渲染
                willChange: 'auto', // 优化渲染性能
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              frameBorder={0}
              referrerPolicy="origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              ref={iframeRef}
              // 添加额外的属性来保持状态
              loading="lazy"
            />
          </div>
        )}
      </div>
    </BaseCardComponent>
  );
}


