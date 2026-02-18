import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import logoImage from '@/assets/logo.jpg';
import { cn } from '@/lib/utils';

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
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Staggered reveal stages
    const t1 = setTimeout(() => setStage(1), 100);   // logo
    const t2 = setTimeout(() => setStage(2), 600);   // heading
    const t3 = setTimeout(() => setStage(3), 1000);  // subtitle
    const t4 = setTimeout(() => setStage(4), 1400);  // footer
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-auto">
      {/* Logo with dramatic entrance */}
      <div
        className={cn(
          "mb-8 relative transition-all duration-700 ease-out",
          stage >= 1
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-50 translate-y-8"
        )}
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shadow-premium-lg overflow-hidden animate-float">
          <img src={logoImage} alt="Mohamed's AI" className="w-full h-full object-cover" />
        </div>
        {/* Glow ring behind logo */}
        <div
          className={cn(
            "absolute inset-0 -m-3 rounded-[2rem] transition-opacity duration-1000 delay-300",
            stage >= 1 ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: 'radial-gradient(circle, hsl(var(--gold) / 0.25) 0%, transparent 70%)',
          }}
        />
        <div
          className={cn(
            "absolute -top-2 -right-2 transition-all duration-500 delay-500",
            stage >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-0"
          )}
        >
          <div className="relative">
            <Sparkles className="h-6 w-6 text-gold animate-pulse-slow" />
            <div className="absolute inset-0 blur-sm">
              <Sparkles className="h-6 w-6 text-gold" />
            </div>
          </div>
        </div>
      </div>

      {/* Welcome text with typewriter-style reveal */}
      <h1
        className={cn(
          "text-3xl sm:text-4xl font-bold text-foreground mb-3 text-center transition-all duration-700 ease-out",
          stage >= 2
            ? "opacity-100 translate-y-0 blur-0"
            : "opacity-0 translate-y-6 blur-sm"
        )}
      >
        {greeting}! Welcome to Mohamed's AI
      </h1>
      <p
        className={cn(
          "text-muted-foreground text-center max-w-lg mb-10 text-base sm:text-lg px-4 transition-all duration-700 ease-out",
          stage >= 3
            ? "opacity-100 translate-y-0 blur-0"
            : "opacity-0 translate-y-6 blur-sm"
        )}
      >
        Your intelligent assistant with code execution, document analysis, memory, and more.
      </p>

      {/* Footer note */}
      <p
        className={cn(
          "text-sm text-muted-foreground/60 mt-12 text-center px-4 transition-all duration-700 ease-out",
          stage >= 4
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        )}
      >
        Type your message below to get started
      </p>
    </div>
  );
};
