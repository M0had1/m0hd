import { useState, useEffect } from 'react';

export interface AISettings {
  tone: string;
  personality: string;
  responseLength: string;
  customInstructions: string;
  useEmojis: boolean;
  formalLanguage: boolean;
}

const defaultSettings: AISettings = {
  tone: 'friendly',
  personality: 'helpful',
  responseLength: 'balanced',
  customInstructions: '',
  useEmojis: false,
  formalLanguage: false,
};

export const useAISettings = () => {
  const [settings, setSettings] = useState<AISettings>(defaultSettings);

  useEffect(() => {
    const savedSettings = localStorage.getItem('ai-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse AI settings');
      }
    }
  }, []);

  const buildSystemPrompt = (): string => {
    const parts: string[] = [];

    // Base prompt
    parts.push("You are Mohamed's AI, an intelligent and helpful assistant.");

    // Tone
    switch (settings.tone) {
      case 'professional':
        parts.push('Maintain a professional and business-like tone.');
        break;
      case 'enthusiastic':
        parts.push('Be enthusiastic, energetic, and encouraging in your responses.');
        break;
      case 'calm':
        parts.push('Maintain a calm, soothing, and reassuring tone.');
        break;
      case 'humorous':
        parts.push('Feel free to be witty and add appropriate humor to your responses.');
        break;
      default:
        parts.push('Be friendly and approachable in your conversations.');
    }

    // Personality
    switch (settings.personality) {
      case 'mentor':
        parts.push('Act as a wise mentor, providing guidance and sharing insights from experience.');
        break;
      case 'creative':
        parts.push('Be creative and imaginative, offering unique perspectives and ideas.');
        break;
      case 'analytical':
        parts.push('Be analytical and detail-oriented, breaking down complex topics systematically.');
        break;
      case 'coach':
        parts.push('Act as a motivational coach, encouraging and supporting the user in achieving their goals.');
        break;
      default:
        parts.push('Be helpful and assist the user to the best of your abilities.');
    }

    // Response length
    switch (settings.responseLength) {
      case 'concise':
        parts.push('Keep your responses brief and to the point.');
        break;
      case 'detailed':
        parts.push('Provide thorough and detailed explanations.');
        break;
      default:
        parts.push('Balance your responses - be thorough but not overly verbose.');
    }

    // Emojis
    if (settings.useEmojis) {
      parts.push('Feel free to use emojis to make responses more engaging.');
    } else {
      parts.push('Avoid using emojis in your responses.');
    }

    // Formal language
    if (settings.formalLanguage) {
      parts.push('Use formal language and proper grammar at all times.');
    }

    // Custom instructions
    if (settings.customInstructions.trim()) {
      parts.push(`Additional instructions from the user: ${settings.customInstructions}`);
    }

    // Advanced capabilities
    parts.push('You have advanced capabilities including:');
    parts.push('- Code execution: You can run JavaScript and Python code when the user asks to execute or run code.');
    parts.push('- Document analysis: You can analyze uploaded files including CSV, JSON, code files, and more.');
    parts.push('- Memory: You remember context from the conversation to provide personalized responses.');
    parts.push('- Image analysis: You can describe and analyze images.');
    parts.push('- Web search: Real-time information is available when needed.');
    parts.push('Use markdown formatting for code blocks, lists, and emphasis.');

    return parts.join(' ');
  };

  return {
    settings,
    buildSystemPrompt,
  };
};
