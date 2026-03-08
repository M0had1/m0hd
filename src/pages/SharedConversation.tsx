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
    if (!token || token.length > 64 || !/^[a-f0-9]+$/.test(token)) {
      setError('Invalid share link.');
      setLoading(false);
      return;
    }

    try {
      // Use the secure RPC function that validates the token server-side
      const { data: rows, error: rpcError } = await supabase
        .rpc('get_shared_conversation', { _token: token });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        setError('Failed to load the shared conversation.');
        setLoading(false);
        return;
      }

      if (!rows || rows.length === 0) {
        setError('This shared conversation was not found, has expired, or has been removed.');
        setLoading(false);
        return;
      }

      const firstRow = rows[0];
      const conversation = {
        id: firstRow.conversation_id,
        title: firstRow.conversation_title,
        created_at: firstRow.conversation_created_at,
      };

      const messages: Message[] = rows
        .filter((r: any) => r.message_id != null)
        .map((r: any) => ({
          id: r.message_id,
          role: r.message_role as 'user' | 'assistant',
          content: r.message_content,
          timestamp: new Date(r.message_created_at),
          attachments: r.message_attachments as unknown as Message['attachments'],
        }));

      setData({ conversation, messages });
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
