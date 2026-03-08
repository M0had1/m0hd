import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [show, setShow] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      setShow(true);
    };
    const goOnline = () => {
      setIsOffline(false);
      // Keep banner visible briefly so user sees reconnection
      setTimeout(() => setShow(false), 2000);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors duration-300",
        isOffline
          ? "bg-destructive/15 text-destructive border-b border-destructive/20"
          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/20"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>You're offline — viewing cached conversations</span>
        </>
      ) : (
        <span>Back online ✓</span>
      )}
    </div>
  );
}
