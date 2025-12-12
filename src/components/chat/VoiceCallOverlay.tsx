import { PhoneOff, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  if (!isActive) return null;

  const getStatusText = () => {
    if (isInitializing) return "Starting...";
    if (isSpeaking) return "AI is speaking...";
    if (isListening) return "Listening...";
    return "Waiting for AI...";
  };

  const getSubText = () => {
    if (isInitializing) return "Requesting microphone access";
    if (isSpeaking) return "Wait for me to finish";
    if (isListening) return "Speak now, I'm listening";
    return "Processing your request";
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
      {/* Animated circles */}
      <div className="relative mb-8">
        <div className={cn(
          "w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center transition-all duration-300",
          isSpeaking && "animate-pulse scale-110",
          isListening && "ring-4 ring-primary ring-opacity-50 animate-pulse"
        )}>
          <div className={cn(
            "w-24 h-24 rounded-full bg-primary/40 flex items-center justify-center transition-all duration-300",
            isSpeaking && "scale-105"
          )}>
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              {isInitializing ? (
                <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
              ) : isSpeaking ? (
                <Volume2 className="w-8 h-8 text-primary-foreground animate-pulse" />
              ) : isListening ? (
                <Mic className="w-8 h-8 text-primary-foreground animate-pulse" />
              ) : (
                <MicOff className="w-8 h-8 text-primary-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* Sound wave animation when speaking or listening */}
        {(isSpeaking || isListening) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 rounded-full border-2 border-primary/30 animate-ping" />
          </div>
        )}
      </div>

      {/* Status text */}
      <p className="text-lg font-medium text-foreground mb-2">
        {getStatusText()}
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        {getSubText()}
      </p>

      {/* End call button */}
      <Button
        onClick={onEnd}
        size="lg"
        className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90"
      >
        <PhoneOff className="w-6 h-6" />
      </Button>
      <p className="text-sm text-muted-foreground mt-3">End Voice Chat</p>
    </div>
  );
};
