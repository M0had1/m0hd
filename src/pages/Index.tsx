import { useState, useRef, useEffect } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useChat } from '@/hooks/useChat';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const Index = () => {
  const isMobile = useIsMobile();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    setActiveConversationId,
    createNewConversation,
    deleteConversation,
    sendMessage,
  } = useChat();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Close sidebar on mobile when screen resizes
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleTheme = () => setIsDark(!isDark);
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
      isDark={isDark}
      onToggleTheme={toggleTheme}
    />
  );

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
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
        <ChatHeader
          title={activeConversation?.title || ''}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen && !isMobile}
        />

        {/* Messages or Welcome Screen */}
        {!activeConversation || activeConversation.messages.length === 0 ? (
          <WelcomeScreen onSendMessage={sendMessage} />
        ) : (
          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto px-2 sm:px-4">
              {activeConversation.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Input */}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Index;
