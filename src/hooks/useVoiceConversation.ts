import { useState, useCallback, useRef, useEffect } from 'react';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface UseVoiceConversationProps {
  onTranscript: (text: string) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onError?: (error: string) => void;
}

export const useVoiceConversation = ({ onTranscript, onSpeakingChange, onError }: UseVoiceConversationProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isVoiceModeRef = useRef(false);
  
  // Store callbacks in refs to avoid recreating recognition
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onTranscript, onError]);

  // Keep ref in sync with state
  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  // Initialize speech recognition - only once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        // Use non-continuous mode so it stops after user finishes a phrase
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
          setIsInitializing(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          // Get the last final result
          const lastResultIndex = event.results.length - 1;
          const transcript = event.results[lastResultIndex][0].transcript;
          console.log('Voice transcript:', transcript);
          // Stop listening immediately — AI will respond, then we restart
          try { recognitionRef.current?.stop(); } catch (_) {}
          setIsListening(false);
          onTranscriptRef.current(transcript);
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
          // Do NOT auto-restart here. We restart only after AI finishes speaking.
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setIsInitializing(false);
          
          if (event.error === 'not-allowed') {
            onErrorRef.current?.('Microphone permission denied. Please allow microphone access.');
          } else if (event.error === 'no-speech') {
            // No speech detected, restart listening if still in voice mode
            if (isVoiceModeRef.current) {
              setTimeout(() => {
                try {
                  recognitionRef.current?.start();
                } catch (e) {
                  console.error('Error restarting after no-speech:', e);
                }
              }, 300);
            }
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      onErrorRef.current?.('Microphone permission denied. Please allow microphone access to use voice chat.');
      return false;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      onErrorRef.current?.('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) return;

    setIsInitializing(true);

    try {
      // Stop any ongoing speech
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      
      // CRITICAL: Call recognition.start() directly in the user gesture handler
      // Do NOT await getUserMedia first — it breaks the gesture chain in Safari
      recognitionRef.current.start();
      console.log('Started speech recognition');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsInitializing(false);
      onErrorRef.current?.('Failed to start voice recognition. Please try again.');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
      setIsListening(false);
      setIsInitializing(false);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Clean up the text - remove markdown and code blocks
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'code block')
        .replace(/`[^`]+`/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, 'image')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        console.log('Speech synthesis started');
        setIsSpeaking(true);
        onSpeakingChange?.(true);
      };

      utterance.onend = () => {
        console.log('Speech synthesis ended');
        setIsSpeaking(false);
        onSpeakingChange?.(false);
        
        // NOW restart listening — only after AI finishes speaking
        if (isVoiceModeRef.current && recognitionRef.current) {
          setTimeout(() => {
            try {
              console.log('Restarting listening after AI finished speaking');
              recognitionRef.current?.start();
            } catch (e) {
              console.error('Error restarting listening:', e);
            }
          }, 500);
        }
      };

      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsSpeaking(false);
        onSpeakingChange?.(false);
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [onSpeakingChange]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    onSpeakingChange?.(false);
  }, [onSpeakingChange]);

  const toggleVoiceMode = useCallback(() => {
    if (isVoiceMode) {
      stopListening();
      stopSpeaking();
      setIsVoiceMode(false);
    } else {
      setIsVoiceMode(true);
      startListening();
    }
  }, [isVoiceMode, startListening, stopListening, stopSpeaking]);

  const endVoiceMode = useCallback(() => {
    stopListening();
    stopSpeaking();
    setIsVoiceMode(false);
  }, [stopListening, stopSpeaking]);

  const isSupported = typeof window !== 'undefined' && 
    !!(window.SpeechRecognition || window.webkitSpeechRecognition) && 
    !!window.speechSynthesis;

  return {
    isListening,
    isSpeaking,
    isVoiceMode,
    isInitializing,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoiceMode,
    endVoiceMode,
  };
};
