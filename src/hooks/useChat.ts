import { useState, useCallback, useEffect } from 'react';
import { Message, Conversation } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Session } from '@supabase/supabase-js';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // Get and track session for authenticated API calls
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const createNewConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    return newConversation.id;
  }, []);

  const updateConversationTitle = useCallback((conversationId: string, title: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, title, updatedAt: new Date() }
          : conv
      )
    );
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  const sendMessage = useCallback(async (content: string) => {
    let conversationId = activeConversationId;
    
    if (!conversationId) {
      conversationId = createNewConversation();
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Get current messages for API call
    const currentConversation = conversations.find(c => c.id === conversationId);
    const previousMessages = currentConversation?.messages || [];

    // Add user message
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              updatedAt: new Date(),
              title: conv.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : conv.title,
            }
          : conv
      )
    );

    setIsLoading(true);

    // Create assistant message placeholder
    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, assistantMessage],
              updatedAt: new Date(),
            }
          : conv
      )
    );

    try {
      // Prepare messages for API
      const apiMessages = [
        ...previousMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content }
      ];

      // Call the edge function with streaming using authenticated session
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('You must be signed in to send messages');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  
                  setConversations(prev =>
                    prev.map(conv =>
                      conv.id === conversationId
                        ? {
                            ...conv,
                            messages: conv.messages.map(msg =>
                              msg.id === assistantMessageId
                                ? { ...msg, content: fullContent }
                                : msg
                            ),
                          }
                        : conv
                    )
                  );
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Mark streaming as complete
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, isStreaming: false }
                    : msg
                ),
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      
      // Update message with error state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: 'Sorry, there was an error processing your request. Please try again.', isStreaming: false }
                    : msg
                ),
              }
            : conv
        )
      );
    }

    setIsLoading(false);
  }, [activeConversationId, createNewConversation, conversations, session]);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    setActiveConversationId,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    sendMessage,
  };
};
