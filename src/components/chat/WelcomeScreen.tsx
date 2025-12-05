import { Sparkles, Code, FileText, Lightbulb, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
      {/* Logo */}
      <div className="mb-8 relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-premium-lg animate-float">
          <span className="text-navy-dark font-bold text-4xl">M</span>
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-5 w-5 text-gold animate-pulse-slow" />
        </div>
      </div>

      {/* Welcome text */}
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Welcome to Mohamed's AI
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-12">
        Your intelligent assistant for coding, analysis, creative tasks, and more.
        Start a conversation or try one of the suggestions below.
      </p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <Button
              key={index}
              variant="glass"
              className="h-auto p-4 flex flex-col items-start gap-2 text-left hover:shadow-premium-lg transition-all group"
              onClick={() => onSendMessage(suggestion.prompt)}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${suggestion.color} group-hover:scale-110 transition-transform`} />
                <span className="font-medium">{suggestion.title}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {suggestion.prompt}
              </p>
            </Button>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground mt-12">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd> to send, 
        <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono ml-1">Shift + Enter</kbd> for new line
      </p>
    </div>
  );
};
