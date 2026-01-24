import { Sparkles, Code, FileText, Lightbulb, Zap, Play, Brain, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WelcomeScreenProps {
  onSendMessage: (message: string) => void;
}

const suggestions = [
  {
    icon: Play,
    title: "Run code",
    description: "Execute JavaScript or Python in real-time",
    prompt: "Run this code and show me the result:\n```javascript\nconst numbers = [1, 2, 3, 4, 5];\nconst sum = numbers.reduce((a, b) => a + b, 0);\nconsole.log('Sum:', sum);\nconsole.log('Average:', sum / numbers.length);\n```",
    gradient: "from-emerald/20 to-emerald/5",
    iconColor: "text-emerald",
  },
  {
    icon: FileText,
    title: "Analyze files",
    description: "Upload and analyze documents",
    prompt: "I want to upload a CSV or JSON file for you to analyze. What can you tell me about my data?",
    gradient: "from-gold/20 to-gold/5",
    iconColor: "text-gold",
  },
  {
    icon: Brain,
    title: "Remember context",
    description: "Personalized conversations",
    prompt: "My name is [Your Name] and I'm working on a web development project. Please remember this for our conversation.",
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: Code,
    title: "Write code",
    description: "Generate clean, modern code",
    prompt: "Help me write a React component for a responsive navigation menu with TypeScript",
    gradient: "from-secondary/20 to-secondary/5",
    iconColor: "text-secondary",
  },
  {
    icon: Lightbulb,
    title: "Brainstorm",
    description: "Creative ideas and solutions",
    prompt: "Give me creative ideas for a mobile app that helps with productivity",
    gradient: "from-purple-500/20 to-purple-500/5",
    iconColor: "text-purple-500",
  },
  {
    icon: Zap,
    title: "Quick answers",
    description: "Fast, accurate responses",
    prompt: "Explain how async/await works in JavaScript with examples",
    gradient: "from-orange-500/20 to-orange-500/5",
    iconColor: "text-orange-500",
  },
];

export const WelcomeScreen = ({ onSendMessage }: WelcomeScreenProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in overflow-auto">
      {/* Logo */}
      <div className="mb-8 relative">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-gold flex items-center justify-center shadow-premium-lg animate-float">
          <span className="text-navy-dark font-bold text-4xl sm:text-5xl">M</span>
        </div>
        <div className="absolute -top-2 -right-2">
          <div className="relative">
            <Sparkles className="h-6 w-6 text-gold animate-pulse-slow" />
            <div className="absolute inset-0 blur-sm">
              <Sparkles className="h-6 w-6 text-gold" />
            </div>
          </div>
        </div>
      </div>

      {/* Welcome text */}
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 text-center">
        Welcome to Mohamed's AI
      </h1>
      <p className="text-muted-foreground text-center max-w-lg mb-10 text-base sm:text-lg px-4">
        Your intelligent assistant with code execution, document analysis, memory, and more.
      </p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl w-full px-2 sm:px-0">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={index}
              className={cn(
                "group h-auto p-4 sm:p-5 flex flex-col items-start gap-3 text-left rounded-2xl transition-all duration-300",
                "bg-card border border-border/50 hover:border-border",
                "hover:shadow-premium-lg hover:-translate-y-1",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              onClick={() => onSendMessage(suggestion.prompt)}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                `bg-gradient-to-br ${suggestion.gradient}`
              )}>
                <Icon className={cn("h-5 w-5", suggestion.iconColor)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[0.9375rem] text-foreground">{suggestion.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {suggestion.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-sm text-muted-foreground/60 mt-12 text-center px-4">
        Type your message below or click a suggestion to get started
      </p>
    </div>
  );
};