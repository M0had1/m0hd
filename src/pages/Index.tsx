import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { VoiceCallOverlay } from '@/components/chat/VoiceCallOverlay';
import { OfflineBanner } from '@/components/chat/OfflineBanner';
import { ChatCommandPalette } from '@/components/chat/ChatCommandPalette';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useChat } from '@/hooks/useChat';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVoiceConversation } from '@/hooks/useVoiceConversation';
import { cn } from '@/lib/utils';

const Index = () => {
  const isMobile = useIsMobile();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingVoiceMessageRef = useRef<string | null>(null);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    setActiveConversationId,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    clearAllConversations,
    sendMessage,
    stopGeneration,
    regenerateResponse,
    editAndResend,
  } = useChat();

  // Handle voice transcript - send message when user speaks
  const handleVoiceTranscript = useCallback((transcript: string) => {
    if (transcript.trim()) {
      pendingVoiceMessageRef.current = transcript;
      sendMessage(transcript, undefined, { voiceMode: true });
    }
  }, [sendMessage]);

  // Handle voice errors
  const handleVoiceError = useCallback((error: string) => {
    console.error('Voice error:', error);
  }, []);

  const {
    isListening,
    isSpeaking,
    isVoiceMode,
    isInitializing,
    isSupported: isVoiceSupported,
    speak,
    toggleVoiceMode,
    endVoiceMode,
  } = useVoiceConversation({
    onTranscript: handleVoiceTranscript,
    onError: handleVoiceError,
  });

  // Speak AI responses when in voice mode
  useEffect(() => {
    if (isVoiceMode && activeConversation?.messages.length) {
      const lastMessage = activeConversation.messages[activeConversation.messages.length - 1];
      
      if (lastMessage.role === 'assistant' && !lastMessage.isStreaming && lastMessage.content) {
        if (pendingVoiceMessageRef.current) {
          pendingVoiceMessageRef.current = null;
          speak(lastMessage.content);
        }
      }
    }
  }, [isVoiceMode, activeConversation?.messages, speak]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Close sidebar on mobile when screen resizes
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const isDark = mounted ? resolvedTheme === 'dark' : false;
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNewChat = () => {
    createNewConversation();
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const sidebarContent = (
    <ChatSidebar
      conversations={conversations}
      activeConversationId={activeConversationId}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      onDeleteConversation={deleteConversation}
      onClearAllConversations={clearAllConversations}
      onRenameConversation={updateConversationTitle}
      isDark={isDark}
      onToggleTheme={toggleTheme}
    />
  );

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      <ChatCommandPalette
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onToggleTheme={toggleTheme}
        isDark={isDark}
      />

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className={cn(
            "transition-all duration-300 ease-in-out shrink-0",
            isSidebarOpen ? "w-64" : "w-0"
          )}
        >
          {isSidebarOpen && sidebarContent}
        </div>
      )}

      {/* Mobile Sidebar (Sheet) */}
      {isMobile && (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <OfflineBanner />
        <ChatHeader
          title={activeConversation?.title || ''}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen && !isMobile}
          conversationId={activeConversationId || undefined}
          conversation={activeConversation}
          onClearConversation={() => activeConversationId && deleteConversation(activeConversationId)}
        />

        {/* Messages or Welcome Screen */}
        {!activeConversation || activeConversation.messages.length === 0 ? (
          <WelcomeScreen onSendMessage={sendMessage} />
        ) : (
          <ScrollArea className="flex-1">
            <div className="max-w-5xl xl:max-w-6xl mx-auto px-2 sm:px-4">
              {activeConversation.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRegenerate={
                    message.role === 'assistant' && !isLoading
                      ? () => regenerateResponse(message.id)
                      : undefined
                  }
                  onEdit={
                    message.role === 'user' && !isLoading
                      ? (newContent) => editAndResend(message.id, newContent)
                      : undefined
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Input */}
        <ChatInput 
          onSend={sendMessage} 
          onStop={stopGeneration} 
          isLoading={isLoading}
          onStartVoiceCall={toggleVoiceMode}
          isVoiceSupported={isVoiceSupported}
        />
      </div>

      {/* Voice Call Overlay */}
      <VoiceCallOverlay
        isActive={isVoiceMode}
        isListening={isListening}
        isSpeaking={isSpeaking}
        isInitializing={isInitializing}
        onEnd={endVoiceMode}
      />
    </div>
  );
};

export default Index;
