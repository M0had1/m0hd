import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import type { Message } from '@/types/chat';

interface SharedData {
  conversation: {
    id: string;
    title: string;
    created_at: string;
  };
  messages: Message[];
}

export default function SharedConversation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedConversation();
  }, [token]);

  const fetchSharedConversation = async () => {
    if (!token || token.length > 64) {
      setError('Invalid share link.');
      setLoading(false);
      return;
    }

    try {
      // Get shared conversation details (anon policy allows this)
      const { data: shareData, error: shareError } = await supabase
        .from('shared_conversations')
        .select('conversation_id, expires_at')
        .eq('share_token', token)
        .single();

      if (shareError || !shareData) {
        setError('This shared conversation was not found or has been removed.');
        setLoading(false);
        return;
      }

      // Check expiry
      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        setError('This shared link has expired.');
        setLoading(false);
        return;
      }

      // Fetch conversation (anon policy allows shared conversations)
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, title, created_at')
        .eq('id', shareData.conversation_id)
        .single();

      if (convError || !conversation) {
        setError('Failed to load the shared conversation.');
        setLoading(false);
        return;
      }

      // Fetch messages (anon policy allows messages in shared conversations)
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', shareData.conversation_id)
        .order('created_at', { ascending: true });

      if (msgError) {
        setError('Failed to load messages.');
        setLoading(false);
        return;
      }

      setData({
        conversation,
        messages: (messages || []).map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at),
          attachments: m.attachments as unknown as Message['attachments'],
        })),
      });
    } catch (err) {
      console.error('Error fetching shared conversation:', err);
      setError('Failed to load the shared conversation.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Unable to Load</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">{data?.conversation.title || 'Shared Conversation'}</h1>
            <p className="text-xs text-muted-foreground">Shared conversation</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-4">
          {data?.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>
      </main>
    </div>
  );
}
