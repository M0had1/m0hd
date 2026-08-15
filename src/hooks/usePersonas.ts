import { useCallback, useEffect, useState } from 'react';

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  prompt: string;
  builtIn?: boolean;
}

export const BUILT_IN_PERSONAS: Persona[] = [
  { id: 'default', name: 'Default', emoji: '✨', prompt: '', builtIn: true },
  {
    id: 'engineer',
    name: 'Senior Engineer',
    emoji: '🛠️',
    prompt:
      'Act as a pragmatic senior software engineer. Give production-grade answers, mention trade-offs, edge cases and testing. Prefer concrete code over theory.',
    builtIn: true,
  },
  {
    id: 'tutor',
    name: 'Patient Tutor',
    emoji: '🎓',
    prompt:
      'Act as a patient tutor. Explain step by step from first principles, use analogies, check understanding, and finish with a short recap and one practice question.',
    builtIn: true,
  },
  {
    id: 'analyst',
    name: 'Research Analyst',
    emoji: '📊',
    prompt:
      'Act as a rigorous research analyst. Structure answers with findings, evidence, and confidence levels. Cite sources when web results are available and flag uncertainty.',
    builtIn: true,
  },
  {
    id: 'writer',
    name: 'Creative Writer',
    emoji: '✍️',
    prompt:
      'Act as a vivid creative writer. Favour strong imagery, varied rhythm and a distinctive voice. Avoid clichés and generic filler.',
    builtIn: true,
  },
  {
    id: 'brief',
    name: 'Straight to the Point',
    emoji: '⚡',
    prompt:
      'Answer with maximum brevity. No preamble, no restating the question, no closing pleasantries. Bullet points where useful.',
    builtIn: true,
  },
];

const CUSTOM_KEY = 'custom-personas';
const ACTIVE_KEY = 'active-persona';

const readCustom = (): Persona[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as Persona[]) : [];
  } catch {
    return [];
  }
};

export const getActivePersonaPrompt = (): string => {
  try {
    const id = localStorage.getItem(ACTIVE_KEY) || 'default';
    const all = [...BUILT_IN_PERSONAS, ...readCustom()];
    return all.find(p => p.id === id)?.prompt || '';
  } catch {
    return '';
  }
};

export const usePersonas = () => {
  const [customPersonas, setCustomPersonas] = useState<Persona[]>(() =>
    typeof window === 'undefined' ? [] : readCustom()
  );
  const [activeId, setActiveId] = useState<string>(() =>
    typeof window === 'undefined' ? 'default' : localStorage.getItem(ACTIVE_KEY) || 'default'
  );

  useEffect(() => {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customPersonas));
  }, [customPersonas]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const personas = [...BUILT_IN_PERSONAS, ...customPersonas];
  const activePersona = personas.find(p => p.id === activeId) || BUILT_IN_PERSONAS[0];

  const addPersona = useCallback((persona: Omit<Persona, 'id' | 'builtIn'>) => {
    const id = `custom-${Date.now()}`;
    setCustomPersonas(prev => [...prev, { ...persona, id }]);
    setActiveId(id);
    return id;
  }, []);

  const deletePersona = useCallback((id: string) => {
    setCustomPersonas(prev => prev.filter(p => p.id !== id));
    setActiveId(prev => (prev === id ? 'default' : prev));
  }, []);

  return { personas, customPersonas, activePersona, activeId, setActiveId, addPersona, deletePersona };
};
