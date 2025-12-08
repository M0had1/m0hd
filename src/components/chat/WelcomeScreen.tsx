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
        Type your message below to start a conversation
      </p>
    </div>
  );
};
