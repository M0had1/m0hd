import { PhoneOff, Mic, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import logoImage from '@/assets/logo.jpg';

interface VoiceCallOverlayProps {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isInitializing?: boolean;
  onEnd: () => void;
}

export const VoiceCallOverlay = ({ 
  isActive, 
  isListening, 
  isSpeaking,
  isInitializing = false,
  onEnd 
}: VoiceCallOverlayProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) { setElapsed(0); return; }
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const getStatusText = () => {
    if (isInitializing) return "Connecting...";
    if (isSpeaking) return "Speaking";
    if (isListening) return "Listening";
    return "Thinking...";
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-background to-background/95 flex flex-col items-center justify-between py-16">
      {/* Top section - status */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground font-medium tracking-wider uppercase">
          {getStatusText()}
        </p>
        <p className="text-sm text-muted-foreground/60 font-mono">{timeStr}</p>
      </div>

      {/* Center section - avatar with animated rings */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          {/* Outer animated ring */}
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-500",
            isSpeaking && "animate-ping opacity-20 bg-primary scale-150",
            isListening && "animate-pulse opacity-30 bg-emerald-400 scale-125"
          )} style={{ margin: '-20px' }} />
          
          {/* Pulsing glow */}
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-300",
            (isSpeaking || isListening) && "shadow-[0_0_60px_rgba(var(--primary-rgb,59,130,246),0.3)]"
          )} style={{ margin: '-10px' }} />

          {/* Avatar */}
          <div className={cn(
            "w-32 h-32 rounded-full overflow-hidden border-4 transition-all duration-300",
            isSpeaking ? "border-primary shadow-[0_0_30px_rgba(59,130,246,0.5)]" :
            isListening ? "border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)]" :
            "border-muted-foreground/20"
          )}>
            <img src={logoImage} alt="Mohamed's AI" className="w-full h-full object-cover" />
          </div>

          {/* Status indicator dot */}
          <div className={cn(
            "absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center transition-colors",
            isInitializing ? "bg-amber-400" :
            isSpeaking ? "bg-primary" :
            isListening ? "bg-emerald-400" :
            "bg-amber-400"
          )}>
            {isInitializing ? (
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            ) : isSpeaking ? (
              <Volume2 className="w-3 h-3 text-white" />
            ) : (
              <Mic className="w-3 h-3 text-white" />
            )}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Mohamed's AI</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isInitializing ? "Setting up microphone..." :
             isSpeaking ? "Wait for me to finish, then speak" :
             isListening ? "Go ahead, I'm listening..." :
             "Processing your message..."}
          </p>
        </div>

        {/* Audio visualizer bars */}
        {(isSpeaking || isListening) && (
          <div className="flex items-center gap-1 h-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-full transition-all",
                  isSpeaking ? "bg-primary" : "bg-emerald-400"
                )}
                style={{
                  height: `${Math.random() * 24 + 8}px`,
                  animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom section - end call */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={onEnd}
          size="lg"
          className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/30"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
        <p className="text-sm text-muted-foreground/60">Tap to end</p>
      </div>
    </div>
  );
};
