import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Check, Link2, Calendar, Loader2 } from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  conversationTitle: string;
}

export function ShareDialog({ open, onOpenChange, conversationId, conversationTitle }: ShareDialogProps) {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);

  const createShareLink = async () => {
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to share conversations');
        return;
      }

      const expiresAt = hasExpiry 
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('shared_conversations')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          expires_at: expiresAt,
        })
        .select('share_token')
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/shared/${data.share_token}`;
      setShareLink(link);
      toast.success('Share link created!');
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share Conversation
          </DialogTitle>
          <DialogDescription>
            Create a public link to share "{conversationTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareLink ? (
            <>
              {/* Expiry settings */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Link expiration</Label>
                  <p className="text-sm text-muted-foreground">
                    Set when the link should expire
                  </p>
                </div>
                <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
              </div>

              {hasExpiry && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Expires in</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              )}

              <Button onClick={createShareLink} disabled={isCreating} className="w-full">
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Create Share Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Input value={shareLink} readOnly className="flex-1" />
                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                  {copied ? (
                    <Check className="h-4 w-4 text-accent" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Anyone with this link can view this conversation
              </p>

              <Button variant="outline" onClick={handleClose} className="w-full">
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
