import { useState, useEffect } from 'react';

export type AIModel = {
  id: string;
  name: string;
  description: string;
  available: boolean;
};

export const AI_MODELS: AIModel[] = [
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Fastest and most efficient',
    available: true,
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Balanced speed and quality',
    available: true,
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Best for complex reasoning',
    available: true,
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Strong performance, lower cost',
    available: true,
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    description: 'Most powerful, best accuracy',
    available: true,
  },
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
