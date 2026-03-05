import { useState, useEffect } from 'react';
import { Zap, Globe, Code2, ImageIcon } from 'lucide-react';
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
    const t1 = setTimeout(() => setStage(1), 80);
    const t2 = setTimeout(() => setStage(2), 400);
    const t3 = setTimeout(() => setStage(3), 700);
    const t4 = setTimeout(() => setStage(4), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-auto">
      {/* Logo */}
      <div
        className={cn(
          "mb-10 relative transition-all duration-700 ease-out",
          stage >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75"
        )}
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem] shadow-premium-lg overflow-hidden ring-2 ring-primary/10 ring-offset-2 ring-offset-background">
          <img src={logoImage} alt="Mohamed's AI" className="w-full h-full object-cover" />
        </div>
        {/* Orbiting dot */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            stage >= 1 ? "opacity-100" : "opacity-0"
          )}
          style={{ animation: 'orbit 8s linear infinite' }}
        >
          <div className="w-2 h-2 rounded-full bg-primary shadow-glow" />
        </div>
      </div>

      {/* Heading */}
      <h1
        className={cn(
          "text-3xl sm:text-[2.75rem] font-extrabold text-foreground mb-3 text-center tracking-tight transition-all duration-700 ease-out leading-tight",
          stage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )}
      >
        {greeting}
      </h1>
      <p
        className={cn(
          "text-muted-foreground text-center max-w-md mb-12 text-base sm:text-lg transition-all duration-700 ease-out",
          stage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )}
      >
        What can I help you with today?
      </p>

    </div>
  );
};
