import { useState, useEffect, useRef } from 'react';

export const useTypingEffect = (text: string, isStreaming: boolean, speed: number = 8) => {
  const [displayedText, setDisplayedText] = useState(text);
  const [isTyping, setIsTyping] = useState(false);
  const prevTextRef = useRef(text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    // If text shortened or completely changed (new message), reset
    if (text.length < prevTextRef.current.length || !text.startsWith(prevTextRef.current.slice(0, 10))) {
      setDisplayedText(text);
      currentIndexRef.current = text.length;
      prevTextRef.current = text;
      return;
    }

    const prevLen = prevTextRef.current.length;
    const newLen = text.length;
    prevTextRef.current = text;

    if (newLen <= prevLen) {
      setDisplayedText(text);
      currentIndexRef.current = newLen;
      return;
    }

    // New characters to type
    if (currentIndexRef.current >= newLen) {
      setDisplayedText(text);
      return;
    }

    setIsTyping(true);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Type multiple characters per tick for speed
    const charsPerTick = Math.max(1, Math.ceil((newLen - currentIndexRef.current) / 20));
    
    intervalRef.current = setInterval(() => {
      currentIndexRef.current = Math.min(currentIndexRef.current + charsPerTick, text.length);
      setDisplayedText(text.slice(0, currentIndexRef.current));
      
      if (currentIndexRef.current >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsTyping(false);
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, speed]);

  // When streaming ends, immediately show full text
  useEffect(() => {
    if (!isStreaming) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplayedText(text);
      currentIndexRef.current = text.length;
      setIsTyping(false);
    }
  }, [isStreaming, text]);

  return { displayedText, isTyping };
};
