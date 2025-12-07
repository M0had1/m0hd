import { Plus, MessageSquare, Trash2, Moon, Sun, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Conversation } from '@/types/chat';
import { UserMenu } from '@/components/UserMenu';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const ChatSidebar = ({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  isDark,
  onToggleTheme,
}: ChatSidebarProps) => {
  return (
    <div className="flex h-full w-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-premium">
            <span className="text-navy-dark font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Mohamed's AI</h1>
            <p className="text-xs text-muted-foreground">Intelligent Assistant</p>
          </div>
        </div>
        <Button 
          variant="gold" 
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-1">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              No conversations yet. Start a new chat!
            </p>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all duration-200",
                  activeConversationId === conversation.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                <span className="flex-1 truncate text-sm">{conversation.title}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={onToggleTheme}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
        
        {/* User Menu */}
        <div className="pt-2 border-t border-sidebar-border">
          <UserMenu />
        </div>
      </div>
    </div>
  );
};
