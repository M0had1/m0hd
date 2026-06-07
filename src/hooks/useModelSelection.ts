import { useState, useEffect } from 'react';

export type AIModel = {
  id: string;
  name: string;
  description: string;
  available: boolean;
};

export const AI_MODELS: AIModel[] = [
  // Google Gemini
  { id: 'google/gemini-3-flash-preview',        name: 'Gemini 3 Flash',          description: 'Fastest preview model, great default', available: true },
  { id: 'google/gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite',   description: 'Cheapest 3.1, high-volume chat',       available: true },
  { id: 'google/gemini-3.5-flash',              name: 'Gemini 3.5 Flash',        description: 'Fast coding & agentic workflows',      available: true },
  { id: 'google/gemini-3.1-pro-preview',        name: 'Gemini 3.1 Pro',          description: 'Next-gen reasoning, high quality',     available: true },
  { id: 'google/gemini-2.5-pro',                name: 'Gemini 2.5 Pro',          description: 'Strong multimodal & long context',     available: true },
  { id: 'google/gemini-2.5-flash',              name: 'Gemini 2.5 Flash',        description: 'Balanced speed and quality',           available: true },
  { id: 'google/gemini-2.5-flash-lite',         name: 'Gemini 2.5 Flash Lite',   description: 'Cheapest, fastest 2.5 model',          available: true },

  // OpenAI GPT
  { id: 'openai/gpt-5-nano',                    name: 'GPT-5 Nano',              description: 'Fast and cheap for simple tasks',      available: true },
  { id: 'openai/gpt-5-mini',                    name: 'GPT-5 Mini',              description: 'Lower cost, strong general use',       available: true },
  { id: 'openai/gpt-5',                         name: 'GPT-5',                   description: 'Powerful all-rounder',                 available: true },
  { id: 'openai/gpt-5.2',                       name: 'GPT-5.2',                 description: 'Enhanced reasoning',                   available: true },
  { id: 'openai/gpt-5.4-nano',                  name: 'GPT-5.4 Nano',            description: 'Fastest 5.4 variant',                  available: true },
  { id: 'openai/gpt-5.4-mini',                  name: 'GPT-5.4 Mini',            description: 'Balanced 5.4 variant',                 available: true },
  { id: 'openai/gpt-5.4',                       name: 'GPT-5.4',                 description: 'Advanced reasoning & code',            available: true },
  { id: 'openai/gpt-5.4-pro',                   name: 'GPT-5.4 Pro',             description: 'Premium 5.4 for hardest tasks',        available: true },
  { id: 'openai/gpt-5.5',                       name: 'GPT-5.5',                 description: 'State-of-the-art reasoning',           available: true },
  { id: 'openai/gpt-5.5-pro',                   name: 'GPT-5.5 Pro',             description: 'Premium 5.5, extended reasoning',      available: true },

  // NVIDIA NIM (Llama)
  { id: 'meta/llama-3.3-70b-instruct',          name: 'Llama 3.3 70B',           description: 'NVIDIA-hosted open-source Llama',      available: true },
];

const STORAGE_KEY = 'selected-ai-model';
const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_MODEL;
    }
    return DEFAULT_MODEL;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  const getModelInfo = (modelId: string): AIModel | undefined => {
    return AI_MODELS.find(m => m.id === modelId);
  };

  const currentModel = getModelInfo(selectedModel) || AI_MODELS[0];

  return {
    selectedModel,
    setSelectedModel,
    currentModel,
    models: AI_MODELS,
    getModelInfo,
  };
};
