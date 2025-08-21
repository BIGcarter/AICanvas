'use client';

import React, { useEffect, useMemo, useState } from 'react';

type FetchedModel = { id?: string; name?: string } | string;

type Provider = { id: string; name: string; url: string; region: 'cn' | 'global' };

const PROVIDERS: Provider[] = [
  // China mainland compatible endpoints
  { id: 'deepseek', name: 'DeepSeek (CN)', url: 'https://api.deepseek.com', region: 'cn' },
  { id: 'moonshot', name: 'Moonshot/Kimi (CN)', url: 'https://api.moonshot.cn', region: 'cn' },
  { id: 'siliconflow', name: 'SiliconFlow (CN)', url: 'https://api.siliconflow.cn', region: 'cn' },
  { id: 'dashscope', name: 'Qwen DashScope (CN, OpenAI兼容)', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', region: 'cn' },
  // Global
  { id: 'openai', name: 'OpenAI', url: 'https://api.openai.com', region: 'global' },
  { id: 'openrouter', name: 'OpenRouter', url: 'https://openrouter.ai/api', region: 'global' },
  { id: 'together', name: 'Together AI', url: 'https://api.together.xyz', region: 'global' },
  { id: 'groq', name: 'Groq (OpenAI compat)', url: 'https://api.groq.com/openai', region: 'global' },
  { id: 'mistral', name: 'Mistral', url: 'https://api.mistral.ai', region: 'global' },
  { id: 'perplexity', name: 'Perplexity', url: 'https://api.perplexity.ai', region: 'global' },
  { id: 'fireworks', name: 'Fireworks (OpenAI compat)', url: 'https://api.fireworks.ai/inference/v1', region: 'global' },
];

function normalizeModels(payload: any): string[] {
  // Try common shapes: {data:[{id}]}, {models:["..."]}, ["..."]
  let list: FetchedModel[] = [];
  if (Array.isArray(payload)) list = payload;
  else if (payload?.data && Array.isArray(payload.data)) list = payload.data;
  else if (payload?.models && Array.isArray(payload.models)) list = payload.models;
  else if (payload?.result && Array.isArray(payload.result)) list = payload.result;

  const names = list
    .map((m) => (typeof m === 'string' ? m : m.id || m.name || ''))
    .filter((s): s is string => !!s && typeof s === 'string')
    .map((s) => s.trim());

  // Deduplicate + sort
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

const DEFAULT_SYSTEM_PROMPT = '你是个非常有用能干的助手。你在回答完我的问题之后，请不要给出进一步的建议，同时也不要输出类似“无后续建议”的内容，如果我需要帮助我会进一步提醒你的。';

export function ModelSelector() {
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [expanded, setExpanded] = useState<boolean>(true);
  const [providerId, setProviderId] = useState<string>('custom');
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);

  // Persist to localStorage for convenience
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('model-selector') || '{}');
      if (saved.baseUrl) setBaseUrl(saved.baseUrl);
      if (saved.apiKey) setApiKey(saved.apiKey);
      if (Array.isArray(saved.models)) setModels(saved.models);
      if (saved.selectedModel) setSelectedModel(saved.selectedModel);
      if (saved.providerId) setProviderId(saved.providerId);
      if (typeof saved.systemPrompt === 'string') setSystemPrompt(saved.systemPrompt);
      else setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'model-selector',
        JSON.stringify({ baseUrl, apiKey, models, selectedModel, providerId, systemPrompt })
      );
    } catch {}
  }, [baseUrl, apiKey, models, selectedModel, providerId, systemPrompt]);

  const canLoad = useMemo(() => baseUrl.trim().length > 0, [baseUrl]);
  const canConfirm = useMemo(
    () => !!selectedModel && selectedModel.trim().length > 0,
    [selectedModel]
  );

  const handleProviderChange = (id: string) => {
    setProviderId(id);
    if (id === 'custom') return; 
    const p = PROVIDERS.find((x) => x.id === id);
    if (p) setBaseUrl(p.url);
  };

  const handleLoadModels = async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    setModels([]);
    try {
      // Call our server proxy to avoid CORS
      const resp = await fetch(`/api/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error?.message || resp.statusText || 'Load models failed');
      }
      const names = normalizeModels(data);
      setModels(names);
      if (names.length > 0) setSelectedModel(names[0]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    // For now: alert for debugging as requested
    alert(`选择模型为“${selectedModel}”。`);
  };

  const cnProviders = PROVIDERS.filter((p) => p.region === 'cn');
  const globalProviders = PROVIDERS.filter((p) => p.region === 'global');

  return (
    <div
      className="fixed top-16 right-3 z-[999999] w-[360px] bg-white/85 backdrop-blur-md border border-gray-200 shadow-lg rounded-lg text-sm overflow-hidden"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="h-9 px-3 flex items-center justify-between cursor-pointer select-none bg-white/90 border-b border-gray-200"
        onClick={() => setExpanded((v) => !v)}
        title={expanded ? '收起' : '展开'}
      >
        <span className="font-medium text-gray-700">模型设置（测试）</span>
        <span className={`transition-transform ${expanded ? '-rotate-180' : 'rotate-0'}`}>▾</span>
      </div>

      {!expanded ? null : (
        <div className="p-3 space-y-2">
          {/* System Prompt */}
          <div className="space-y-1">
            <div className="text-xs text-gray-600">系统 Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onPaste={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full h-16 px-2 py-1 rounded border border-gray-300 outline-none focus:ring-1 focus:ring-blue-500 bg-white resize-none"
              placeholder="例如：你是一名冷静严谨的产品分析师，回答要有结构化条理..."
            />
          </div>
          {/* Provider select */}
          <div className="flex items-center gap-2">
            <select
              value={providerId}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full h-8 px-2 rounded border border-gray-300 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              title="选择API供应商（可自动填充Base URL）"
            >
              <option value="custom">自定义（手动输入Base URL）</option>
              <optgroup label="中国内地">
                {cnProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.url}</option>
                ))}
              </optgroup>
              <optgroup label="Global">
                {globalProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.url}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Base URL */}
          <div className="flex items-center gap-2">
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              onPaste={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Base URL (e.g. https://api.openai.com)"
              className="flex-1 h-8 px-2 rounded border border-gray-300 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
            <button
              disabled={!canLoad || loading}
              onClick={handleLoadModels}
              className={`h-8 px-3 rounded border text-xs ${
                loading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title="加载模型列表"
            >
              {loading ? 'Loading…' : '加载模型'}
            </button>
          </div>

          {/* API Key */}
          <div className="flex items-center gap-2">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onPaste={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="API Key"
              className="flex-1 h-8 px-2 rounded border border-gray-300 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              type="password"
            />
          </div>

          {/* Model select */}
          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 h-8 px-2 rounded border border-gray-300 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="" disabled>
                {models.length === 0 ? '请先加载模型' : '选择模型'}
              </option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              disabled={!canConfirm}
              onClick={async () => {
                // quick verify before confirm
                try {
                  const resp = await fetch('/api/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ baseUrl, apiKey, model: selectedModel }),
                  });
                  const data = await resp.json();
                  if (data?.ok) alert('API连接正常');
                  else alert(`验证失败：${data?.error?.message || resp.statusText}`);
                } catch (e: any) {
                  alert(`验证异常：${e?.message || 'unknown'}`);
                }
              }}
              className={`h-8 px-3 rounded border text-xs ${
                canConfirm ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              title="验证API连接"
            >
              验证
            </button>
            <button
              disabled={!canConfirm}
              onClick={handleConfirm}
              className={`h-8 px-3 rounded border text-xs ${
                canConfirm ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              确认模型
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-600 mt-1">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}


