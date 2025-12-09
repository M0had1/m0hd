import { useState, useCallback, useEffect } from 'react';
import { Message, Conversation, Attachment } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Session } from '@supabase/supabase-js';
import { useAISettings } from '@/hooks/useAISettings';

const generateId = () => Math.random().toString(36).substring(2, 15);

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Read text file content
const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Check if file is an image
const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

// Check if file is a text-based file
const isTextFile = (file: File): boolean => {
  const textTypes = [
    'text/',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript',
  ];
  const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.c', '.cpp', '.h', '.sql', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.log'];
  
  return textTypes.some(type => file.type.startsWith(type)) ||
    textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};

// Check if prompt is requesting image generation
const isImageGenerationRequest = (content: string): boolean => {
  const lowerContent = content.toLowerCase();
  const imageKeywords = [
    'generate an image',
    'create an image',
    'make an image',
    'draw',
    'generate a picture',
    'create a picture',
    'make a picture',
    'generate image',
    'create image',
    'make image',
    'generate picture',
    'create picture',
    'make picture',
    'generate art',
    'create art',
    'make art',
    'illustrate',
    'paint',
    'sketch',
    'render an image',
    'render image',
    'design an image',
    'design image',
    'produce an image',
    'produce image',
  ];
  return imageKeywords.some(keyword => lowerContent.includes(keyword));
};

// Check if prompt is requesting image editing
const isImageEditRequest = (content: string, hasImage: boolean): boolean => {
  if (!hasImage) return false;
  const lowerContent = content.toLowerCase();
  const editKeywords = [
    'edit',
    'modify',
    'change',
    'transform',
    'alter',
    'update',
    'adjust',
    'fix',
    'improve',
    'enhance',
    'add to',
    'remove from',
    'make it',
    'turn it',
    'convert',
  ];
  return editKeywords.some(keyword => lowerContent.includes(keyword));
};

export const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { buildSystemPrompt } = useAISettings();

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

  // Load conversations from database
  useEffect(() => {
    const loadConversations = async () => {
      if (!session?.user?.id) {
        setConversations([]);
        setIsInitialized(true);
        return;
      }

      try {
        // Load conversations
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .order('updated_at', { ascending: false });

        if (convError) throw convError;

        // Load messages for each conversation
        const conversationsWithMessages: Conversation[] = await Promise.all(
          (convData || []).map(async (conv) => {
            const { data: msgData, error: msgError } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: true });

            if (msgError) throw msgError;

            const messages: Message[] = (msgData || []).map((msg) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at),
              attachments: msg.attachments as unknown as Attachment[] | undefined,
            }));

            return {
              id: conv.id,
              title: conv.title,
              messages,
              createdAt: new Date(conv.created_at),
              updatedAt: new Date(conv.updated_at),
            };
          })
        );

        setConversations(conversationsWithMessages);
      } catch (error) {
        console.error('Error loading conversations:', error);
        toast({
          title: 'Error',
          description: 'Failed to load conversations',
          variant: 'destructive',
        });
      } finally {
        setIsInitialized(true);
      }
    };

    loadConversations();
  }, [session?.user?.id]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const createNewConversation = useCallback(async () => {
    if (!session?.user?.id) {
      toast({
        title: 'Error',
        description: 'You must be signed in to create a conversation',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: session.user.id,
          title: 'New Chat',
        })
        .select()
        .single();

      if (error) throw error;

      const newConversation: Conversation = {
        id: data.id,
        title: data.title,
        messages: [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
      return newConversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
      return null;
    }
  }, [session?.user?.id]);

  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, title, updatedAt: new Date() }
            : conv
        )
      );
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  }, [activeConversationId]);

  const saveMessage = useCallback(async (conversationId: string, message: Message) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          attachments: (message.attachments || []) as unknown as any,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, []);

  const updateMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    let conversationId = activeConversationId;
    
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
    }

    // Process attachments
    const attachments: Attachment[] = [];
    const imageContents: { type: 'image_url'; image_url: { url: string } }[] = [];
    let textFileContents = '';
    let hasImage = false;
    let firstImageBase64 = '';

    if (files && files.length > 0) {
      for (const file of files) {
        const attachment: Attachment = {
          id: generateId(),
          name: file.name,
          type: file.type,
          size: file.size,
        };

        if (isImageFile(file)) {
          const base64 = await fileToBase64(file);
          attachment.url = base64;
          attachment.content = base64;
          attachments.push(attachment);
          hasImage = true;
          if (!firstImageBase64) firstImageBase64 = base64;
          
          // Add to image contents for API
          imageContents.push({
            type: 'image_url',
            image_url: { url: base64 }
          });
        } else if (isTextFile(file)) {
          const textContent = await readTextFile(file);
          attachment.content = textContent;
          attachments.push(attachment);
          
          // Append text file content to the message
          textFileContents += `\n\n--- Content of ${file.name} ---\n${textContent}\n--- End of ${file.name} ---\n`;
        } else {
          // For other files, try to read as text
          try {
            const textContent = await readTextFile(file);
            attachment.content = textContent;
            attachments.push(attachment);
            textFileContents += `\n\n--- Content of ${file.name} ---\n${textContent}\n--- End of ${file.name} ---\n`;
          } catch {
            // If can't read, just add the file info
            attachments.push(attachment);
            textFileContents += `\n\n[Attached file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)]`;
          }
        }
      }
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content + textFileContents,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Get current messages for API call
    const currentConversation = conversations.find(c => c.id === conversationId);
    const previousMessages = currentConversation?.messages || [];

    // Determine new title if this is the first message
    const isFirstMessage = previousMessages.length === 0;
    const newTitle = isFirstMessage ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : null;

    // Add user message to state
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              updatedAt: new Date(),
              title: newTitle || conv.title,
            }
          : conv
      )
    );

    // Save user message to database
    await saveMessage(conversationId, userMessage);

    // Update title in database if needed
    if (newTitle) {
      await updateConversationTitle(conversationId, newTitle);
    }

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
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('You must be signed in to send messages');
      }

      // Create abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);

      // Check if this is an image generation or editing request
      const isImageGen = isImageGenerationRequest(content);
      const isImageEdit = isImageEditRequest(content, hasImage);

      if (isImageGen || isImageEdit) {
        // Handle image generation/editing
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            prompt: content,
            imageUrl: isImageEdit ? firstImageBase64 : undefined,
            mode: isImageEdit ? 'edit' : 'generate',
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Create response with image
        const imageMarkdown = `![Generated Image](${data.imageUrl})`;
        const fullContent = data.text ? `${data.text}\n\n${imageMarkdown}` : imageMarkdown;

        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent, isStreaming: false }
                      : msg
                  ),
                }
              : conv
          )
        );

        // Save to database
        await saveMessage(conversationId, {
          ...assistantMessage,
          content: fullContent,
          isStreaming: false,
        });
      } else {
        // Regular chat - use streaming
        // Prepare messages for API - handle multimodal content
        const apiMessages = [
          ...previousMessages.map(m => {
            return { role: m.role, content: m.content };
          }),
        ];

        // Build current message content
        const fullTextContent = content + textFileContents;
        
        if (imageContents.length > 0) {
          const messageContent: ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[] = [
            { type: 'text', text: fullTextContent || 'Please analyze this image.' },
            ...imageContents
          ];
          apiMessages.push({ role: 'user' as const, content: messageContent as any });
        } else {
          apiMessages.push({ role: 'user' as const, content: fullTextContent });
        }

        // Build custom system prompt from settings
        const systemPrompt = buildSystemPrompt();

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ messages: apiMessages, systemPrompt }),
          signal: controller.signal,
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

        // Save assistant message to database
        await saveMessage(conversationId, {
          ...assistantMessage,
          content: fullContent,
          isStreaming: false,
        });
      }
    } catch (error) {
      // Check if it was an abort
      if (error instanceof Error && error.name === 'AbortError') {
        // Mark streaming as complete but keep current content
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
      } else {
        console.error('Chat error:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to send message',
          variant: 'destructive',
        });
        
        // Update message with error state
        const errorContent = 'Sorry, there was an error processing your request. Please try again.';
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: errorContent, isStreaming: false }
                      : msg
                  ),
                }
              : conv
          )
        );

        // Save error message to database
        await saveMessage(conversationId, {
          ...assistantMessage,
          content: errorContent,
          isStreaming: false,
        });
      }
    }

    setAbortController(null);
    setIsLoading(false);
  }, [activeConversationId, createNewConversation, conversations, session, buildSystemPrompt, saveMessage, updateConversationTitle]);

  const stopGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    isInitialized,
    setActiveConversationId,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    sendMessage,
    stopGeneration,
  };
};
