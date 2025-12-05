import { useState, useCallback } from 'react';
import { Message, Conversation } from '@/types/chat';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

    // Simulate streaming response (will be replaced with actual API call)
    const sampleResponses = [
      "Hello! I'm Mohamed's AI, your intelligent assistant. I'm here to help you with any questions, creative tasks, coding challenges, or just have a thoughtful conversation. What would you like to explore today?",
      "That's a great question! Let me think about this carefully and provide you with a comprehensive answer...\n\nBased on my analysis, here are the key points to consider:\n\n1. **Understanding the Context**: It's important to first understand the full scope of what you're asking.\n\n2. **Breaking Down the Problem**: Complex questions often benefit from being broken into smaller, manageable parts.\n\n3. **Providing Solutions**: Once we understand the problem, we can work together to find the best approach.\n\nIs there a specific aspect you'd like me to elaborate on?",
      "I'd be happy to help you with that! Here's a detailed breakdown:\n\n```javascript\n// Example code snippet\nconst greet = (name) => {\n  return `Hello, ${name}! Welcome to Mohamed's AI.`;\n};\n\nconsole.log(greet('User'));\n```\n\nThis demonstrates how we can create elegant solutions together. Would you like me to explain any part in more detail?",
    ];

    const response = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
    
    // Simulate streaming
    let currentContent = '';
    for (let i = 0; i < response.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 15));
      currentContent += response[i];
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: currentContent }
                    : msg
                ),
              }
            : conv
        )
      );
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

    setIsLoading(false);
  }, [activeConversationId, createNewConversation]);

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
