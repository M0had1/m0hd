import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, Conversation, Attachment } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Session } from '@supabase/supabase-js';
import { useAISettings } from '@/hooks/useAISettings';
import { useModelSelection } from '@/hooks/useModelSelection';
import { cacheConversations, loadCachedConversations, isOffline } from '@/lib/offlineCache';

const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_CONTEXT_MESSAGES = 80;
const MAX_CONTEXT_CHARS = 60_000;
const MAX_SINGLE_CONTEXT_MESSAGE_CHARS = 12_000;
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

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

// Check if prompt is requesting image editing — only when user explicitly wants to modify the image
const isImageEditRequest = (content: string, hasImage: boolean): boolean => {
  if (!hasImage) return false;
  const lowerContent = content.toLowerCase();

  // Only trigger edit when user explicitly asks to modify/change the image
  const editKeywords = [
    'edit this',
    'modify this',
    'change this',
    'make it',
    'make this',
    'remove the',
    'add a',
    'replace the',
    'transform',
    'convert this',
    'resize',
    'crop',
    'rotate',
    'flip',
    'filter',
    'enhance',
    'brighten',
    'darken',
    'blur',
    'sharpen',
    'colorize',
    'stylize',
    'upscale',
    'recolor',
    'change the background',
    'remove background',
  ];
  return editKeywords.some(kw => lowerContent.includes(kw));
};

// Web search is now handled server-side by the AI model via tool calling.
// The AI autonomously decides when to search the internet.

// Check if prompt needs code execution
const needsCodeExecution = (content: string): boolean => {
  const lowerContent = content.toLowerCase();
  const codeKeywords = [
    'run this code',
    'execute this',
    'run the code',
    'execute the code',
    'calculate',
    'compute',
    'what is the result of',
    'evaluate',
    'test this code',
    'try this code',
  ];
  return codeKeywords.some(keyword => lowerContent.includes(keyword));
};

// Extract code blocks from content
const extractCodeBlocks = (content: string): { code: string; language: string }[] => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: { code: string; language: string }[] = [];
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1]?.toLowerCase() || 'javascript',
      code: match[2].trim(),
    });
  }
  
  return blocks;
};

const trimForModelContext = (content: string): string => {
  if (content.length <= MAX_SINGLE_CONTEXT_MESSAGE_CHARS) return content;
  const keepHead = Math.floor(MAX_SINGLE_CONTEXT_MESSAGE_CHARS * 0.35);
  const keepTail = MAX_SINGLE_CONTEXT_MESSAGE_CHARS - keepHead;
  return `${content.slice(0, keepHead)}\n\n[Earlier message trimmed for stability]\n\n${content.slice(-keepTail)}`;
};

const buildStableContextMessages = (messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> => {
  const result: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let usedChars = 0;

  for (const message of messages.slice(-MAX_CONTEXT_MESSAGES).reverse()) {
    if (message.isError || !message.content?.trim()) continue;
    const content = trimForModelContext(message.content);
    if (usedChars + content.length > MAX_CONTEXT_CHARS && result.length > 0) break;
    result.unshift({ role: message.role, content });
    usedChars += content.length;
  }

  return result;
};

export const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const conversationsRef = useRef<Conversation[]>([]);
  const { buildSystemPrompt } = useAISettings();
  const { selectedModel } = useModelSelection();

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

  // Load conversations from database (or offline cache)
  useEffect(() => {
    const loadConversations = async () => {
      if (!session?.user?.id) {
        setConversations([]);
        setIsInitialized(true);
        return;
      }

      // If offline, load from IndexedDB cache
      if (isOffline()) {
        try {
          const cached = await loadCachedConversations();
          if (cached.length > 0) {
            setConversations(cached);
            toast({
              title: 'Offline mode',
              description: 'Showing cached conversations. Some features are unavailable offline.',
            });
          }
        } catch (err) {
          console.warn('Failed to load offline cache:', err);
        }
        setIsInitialized(true);
        return;
      }

      try {
        // Load conversations + messages in ONE request to avoid N+1 queries/timeouts
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            id,
            title,
            created_at,
            updated_at,
            messages (
              id,
              role,
              content,
              created_at,
              attachments
            )
          `)
          .order('updated_at', { ascending: false })
          .limit(50)
          .order('created_at', { ascending: true, referencedTable: 'messages' })
          .limit(500, { referencedTable: 'messages' });

        if (error) throw error;

        const conversationsWithMessages: Conversation[] = (data || []).map((conv: any) => {
          const messages: Message[] = (conv.messages || []).map((msg: any) => ({
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
        });

        setConversations(conversationsWithMessages);

        // Cache to IndexedDB for offline access
        cacheConversations(conversationsWithMessages).catch(() => {});
      } catch (error) {
        console.error('Error loading conversations:', error);

        // Fallback to offline cache on network failure
        try {
          const cached = await loadCachedConversations();
          if (cached.length > 0) {
            setConversations(cached);
            toast({
              title: 'Connection issue',
              description: 'Showing cached conversations.',
            });
          } else {
            toast({
              title: 'Error',
              description: 'Failed to load conversations',
              variant: 'destructive',
            });
          }
        } catch {
          toast({
            title: 'Error',
            description: 'Failed to load conversations',
            variant: 'destructive',
          });
        }
      } finally {
        setIsInitialized(true);
      }
    };

    loadConversations();
  }, [session?.user?.id]);

  useEffect(() => {
    conversationsRef.current = conversations;
    // Keep offline cache in sync with latest state
    if (conversations.length > 0) {
      cacheConversations(conversations).catch(() => {});
    }
  }, [conversations]);

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
      // Soft delete: set deleted_at instead of hard delete
      const { error } = await supabase
        .from('conversations')
        .update({ deleted_at: new Date().toISOString() } as any)
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

  const clearAllConversations = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      // Soft delete all conversations
      const { error } = await supabase
        .from('conversations')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setConversations([]);
      setActiveConversationId(null);
      toast({
        title: 'Success',
        description: 'All conversations have been deleted',
      });
    } catch (error) {
      console.error('Error clearing conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear conversations',
        variant: 'destructive',
      });
    }
  }, [session?.user?.id]);

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

  const sendMessage = useCallback(async (content: string, files?: File[], options?: { voiceMode?: boolean }): Promise<void> => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      toast({
        title: 'Error',
        description: 'You must be signed in to send messages',
        variant: 'destructive',
      });
      return;
    }

    let conversationId = activeConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
    }

    setIsLoading(true);

    let assistantMessageId: string | null = null;

    try {
      // Process attachments safely (never crash the chat on file parsing)
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

          try {
            if (isImageFile(file)) {
              if (file.size > MAX_IMAGE_SIZE_BYTES) {
                toast({
                  title: 'Image too large',
                  description: `${file.name} is too large. Please use images below 8MB.`,
                  variant: 'destructive',
                });
                continue;
              }

              const base64 = await fileToBase64(file);
              attachment.url = base64;
              attachment.content = base64;
              attachments.push(attachment);
              hasImage = true;

              if (!firstImageBase64) firstImageBase64 = base64;
              imageContents.push({ type: 'image_url', image_url: { url: base64 } });
            } else if (isTextFile(file)) {
              const textContent = await readTextFile(file);
              attachment.content = textContent;
              attachments.push(attachment);
              textFileContents += `\n\n--- Content of ${file.name} ---\n${textContent}\n--- End of ${file.name} ---\n`;
            } else {
              try {
                const textContent = await readTextFile(file);
                attachment.content = textContent;
                attachments.push(attachment);
                textFileContents += `\n\n--- Content of ${file.name} ---\n${textContent}\n--- End of ${file.name} ---\n`;
              } catch {
                attachments.push(attachment);
                textFileContents += `\n\n[Attached file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)]`;
              }
            }
          } catch (fileError) {
            console.error('Attachment processing error:', fileError);
            attachments.push(attachment);
            textFileContents += `\n\n[Attached file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)]`;
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

      const currentConversation = conversationsRef.current.find(c => c.id === conversationId);
      const previousMessages = currentConversation?.messages || [];
      const contextMessages = previousMessages.slice(-MAX_CONTEXT_MESSAGES);

      const isFirstMessage = previousMessages.length === 0;
      const newTitle = isFirstMessage ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : null;

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

      await saveMessage(conversationId, userMessage);

      if (newTitle) {
        await updateConversationTitle(conversationId, newTitle);
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      assistantMessageId = assistantMessage.id;

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

      const controller = new AbortController();
      setAbortController(controller);

      const isImageGen = isImageGenerationRequest(content);
      const isImageEdit = isImageEditRequest(content, hasImage);

      if (isImageGen || isImageEdit) {
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

        await saveMessage(conversationId, {
          ...assistantMessage,
          content: fullContent,
          isStreaming: false,
        });

        return;
      }

      const apiMessages: Array<{ role: 'user' | 'assistant'; content: any }> = contextMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      let fullTextContent = content + textFileContents;

      const codeBlocks = extractCodeBlocks(content);
      if (needsCodeExecution(content) && codeBlocks.length > 0) {
        try {
          const codeResults: string[] = [];
          for (const block of codeBlocks) {
            const codeResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-code`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ code: block.code, language: block.language }),
              signal: controller.signal,
            });

            if (codeResponse.ok) {
              const codeData = await codeResponse.json();
              codeResults.push(`\n**Code Execution Result (${block.language}):**\n\`\`\`\n${codeData.output || codeData.error || 'No output'}\n\`\`\`\n(Executed in ${codeData.executionTime}ms)`);
            }
          }

          if (codeResults.length > 0) {
            fullTextContent += '\n\n[Code execution results for your reference]:' + codeResults.join('\n');
          }
        } catch (codeError) {
          console.error('Code execution failed:', codeError);
        }
      }

      if (imageContents.length > 0) {
        const messageContent: ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[] = [
          { type: 'text', text: fullTextContent || 'Please analyze this image.' },
          ...imageContents,
        ];
        apiMessages.push({ role: 'user', content: messageContent });
      } else {
        apiMessages.push({ role: 'user', content: fullTextContent });
      }

      let systemPrompt = await buildSystemPrompt();
      if (options?.voiceMode) {
        systemPrompt = `You are having a casual, natural voice conversation with your friend. Keep your responses SHORT (1-3 sentences max), conversational, and warm — like talking on the phone. Don't use markdown, bullet points, code blocks, or any formatting. Don't say "Sure!" or "Of course!" too much. Just talk naturally like a real person would. Be friendly, witty, and engaging. If they ask something complex, give a brief answer and ask if they want more detail.`;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: apiMessages, systemPrompt, model: selectedModel }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Something went wrong. Please try again.';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }

        if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (response.status === 402) {
          errorMessage = 'Usage limit reached. Please check your account.';
        } else if (response.status === 503 || response.status >= 500) {
          errorMessage = 'AI service is temporarily unavailable. Please try again in a few seconds.';
        }

        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('No response body received from AI service.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let textBuffer = '';

      let rafId: number | null = null;
      let pendingContent = '';
      const flushUiUpdate = () => {
        rafId = null;
        const next = pendingContent;
        setConversations(prev => {
          const convIdx = prev.findIndex(c => c.id === conversationId);
          if (convIdx === -1) return prev;

          const conv = prev[convIdx];
          const nextMessages = conv.messages.map(msg =>
            msg.id === assistantMessageId ? { ...msg, content: next } : msg
          );

          const nextConv = { ...conv, messages: nextMessages };
          const copy = prev.slice();
          copy[convIdx] = nextConv;
          return copy;
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              fullContent += delta;
              pendingContent = fullContent;
              if (rafId === null) rafId = requestAnimationFrame(flushUiUpdate);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush for any remaining buffered lines
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) fullContent += delta;
          } catch {
            // ignore leftover partial fragment
          }
        }
      }

      if (!fullContent.trim()) {
        fullContent = 'I could not generate a response this time. Please retry your message.';
      }

      if (rafId !== null) cancelAnimationFrame(rafId);
      pendingContent = fullContent;
      flushUiUpdate();

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

      await saveMessage(conversationId, {
        ...assistantMessage,
        content: fullContent,
        isStreaming: false,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
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
        const errorMsg = error instanceof Error ? error.message : 'Failed to send message';

        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });

        if (assistantMessageId) {
          const errorContent = `⚠️ ${errorMsg}\n\nPlease try sending your message again.`;
          setConversations(prev =>
            prev.map(conv =>
              conv.id === conversationId
                ? {
                    ...conv,
                    messages: conv.messages.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: errorContent, isStreaming: false, isError: true }
                        : msg
                    ),
                  }
                : conv
            )
          );
        }
      }
    } finally {
      setAbortController(null);
      setIsLoading(false);
    }
  }, [activeConversationId, buildSystemPrompt, createNewConversation, saveMessage, selectedModel, session, updateConversationTitle]);

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
    clearAllConversations,
    sendMessage,
    stopGeneration,
  };
};
