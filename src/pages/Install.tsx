import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Smartphone, Monitor, Check, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">M</span>
            </div>
          </div>
          <CardTitle asChild>
            <h1 className="text-2xl">Install Mohamed's AI</h1>
          </CardTitle>
          <CardDescription>
            Get the full app experience with offline support and quick access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Already Installed!</h3>
              <p className="text-muted-foreground">
                Mohamed's AI is installed on your device. You can find it on your home screen or app drawer.
              </p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Open App
              </Button>
            </div>
          ) : (
            <>
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Works Offline</p>
                    <p className="text-sm text-muted-foreground">Access your chats anytime</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Full Screen Experience</p>
                    <p className="text-sm text-muted-foreground">No browser UI for a cleaner look</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Quick Access</p>
                    <p className="text-sm text-muted-foreground">Launch from home screen</p>
                  </div>
                </div>
              </div>

              {/* Install Instructions */}
              {isIOS ? (
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Install on iOS</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li>1. Tap the <strong>Share</strong> button in Safari</li>
                    <li>2. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>3. Tap <strong>"Add"</strong> in the top right</li>
                  </ol>
                </div>
              ) : deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="h-5 w-5 mr-2" />
                  Install App
                </Button>
              ) : (
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Install on Android/Desktop</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li>1. Open the browser menu (⋮)</li>
                    <li>2. Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
                    <li>3. Follow the prompts to install</li>
                  </ol>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
