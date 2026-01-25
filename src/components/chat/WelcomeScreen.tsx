import { Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  onSendMessage: (message: string) => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const WelcomeScreen = ({ onSendMessage }: WelcomeScreenProps) => {
  const greeting = getGreeting();

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
        {greeting}! Welcome to Mohamed's AI
      </h1>
      <p className="text-muted-foreground text-center max-w-lg mb-10 text-base sm:text-lg px-4">
        Your intelligent assistant with code execution, document analysis, memory, and more.
      </p>

      {/* Footer note */}
      <p className="text-sm text-muted-foreground/60 mt-12 text-center px-4">
        Type your message below to get started
      </p>
    </div>
  );
};