import { useState, useRef, useEffect } from 'react';
import { Sparkles, Code, FileText, Lightbulb, Zap, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WelcomeScreenProps {
  onSendMessage: (message: string) => void;
}

const suggestions = [
  {
    icon: Code,
    title: "Write code",
    prompt: "Help me write a React component for a responsive navigation menu",
    color: "text-emerald",
  },
  {
    icon: FileText,
    title: "Analyze text",
    prompt: "Summarize the key points from this article and provide insights",
    color: "text-gold",
  },
  {
    icon: Lightbulb,
    title: "Brainstorm ideas",
    prompt: "Give me creative ideas for a mobile app that helps with productivity",
    color: "text-primary",
  },
  {
    icon: Zap,
    title: "Quick answers",
    prompt: "Explain quantum computing in simple terms",
    color: "text-secondary",
  },
];

export const WelcomeScreen = ({ onSendMessage }: WelcomeScreenProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;
    onSendMessage(message);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in overflow-auto">
      {/* Logo */}
      <div className="mb-6 sm:mb-8 relative">
        <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-premium-lg animate-float">
          <span className="text-navy-dark font-bold text-3xl sm:text-4xl">M</span>
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-4 sm:h-5 w-4 sm:w-5 text-gold animate-pulse-slow" />
        </div>
      </div>

      {/* Welcome text */}
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 text-center">
        Welcome to Mohamed's AI
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-6 sm:mb-8 text-sm sm:text-base px-2">
        Your intelligent assistant for coding, analysis, creative tasks, and more.
      </p>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-6 sm:mb-8 px-2 sm:px-0">
        <div className="relative flex items-end gap-2 glass rounded-2xl p-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground",
              "focus:outline-none py-2 px-3 max-h-[120px]",
              "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            )}
          />
          <Button
            type="submit"
            variant="gold"
            size="icon-sm"
            disabled={!message.trim()}
            className={cn(
              "h-8 w-8 rounded-xl transition-all shrink-0",
              message.trim() ? "opacity-100" : "opacity-50"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl w-full px-2 sm:px-0">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <Button
              key={index}
              variant="glass"
              className="h-auto p-3 sm:p-4 flex flex-col items-start gap-2 text-left hover:shadow-premium-lg transition-all group"
              onClick={() => onSendMessage(suggestion.prompt)}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 sm:h-5 w-4 sm:w-5 ${suggestion.color} group-hover:scale-110 transition-transform`} />
                <span className="font-medium text-sm sm:text-base">{suggestion.title}</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {suggestion.prompt}
              </p>
            </Button>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground mt-8 sm:mt-12 text-center px-4">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd> to send, 
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono ml-1">Shift + Enter</kbd> for new line
      </p>
    </div>
  );
};
