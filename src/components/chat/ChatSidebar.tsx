import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Moon, Sun, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Conversation } from '@/types/chat';
import { UserMenu } from '@/components/UserMenu';
import { ConversationSearch } from './ConversationSearch';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAllConversations?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

// Group conversations by date
const groupConversationsByDate = (conversations: Conversation[]) => {
  const groups: { label: string; conversations: Conversation[] }[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const thisMonth: Conversation[] = [];
  const older: Conversation[] = [];

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt || conv.createdAt);
    if (isToday(date)) {
      today.push(conv);
    } else if (isYesterday(date)) {
      yesterday.push(conv);
    } else if (isThisWeek(date)) {
      thisWeek.push(conv);
    } else if (isThisMonth(date)) {
      thisMonth.push(conv);
    } else {
      older.push(conv);
    }
  });

  if (today.length) groups.push({ label: 'Today', conversations: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', conversations: yesterday });
  if (thisWeek.length) groups.push({ label: 'This Week', conversations: thisWeek });
  if (thisMonth.length) groups.push({ label: 'This Month', conversations: thisMonth });
  if (older.length) groups.push({ label: 'Older', conversations: older });

  return groups;
};

export const ChatSidebar = ({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onClearAllConversations,
  isDark,
  onToggleTheme,
}: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filter conversations based on search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => {
        const query = searchQuery.toLowerCase();
        if (conv.title.toLowerCase().includes(query)) return true;
        return conv.messages.some(msg => 
          msg.content.toLowerCase().includes(query)
        );
      })
    : conversations;

  const groupedConversations = groupConversationsByDate(filteredConversations);

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const handleClearAll = () => {
    if (onClearAllConversations) {
      onClearAllConversations();
    }
    setClearAllDialogOpen(false);
  };

  return (
    <>
      <div className="flex h-full w-full flex-col bg-sidebar">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3 mb-5">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-premium hover-glow transition-all">
                <span className="text-navy-dark font-bold text-xl">M</span>
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-3.5 w-3.5 text-gold animate-pulse-slow" />
              </div>
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground text-[0.9375rem]">Mohamed's AI</h1>
              <p className="text-xs text-muted-foreground">Intelligent Assistant</p>
            </div>
          </div>
          
          <Button 
            variant="gold" 
            className="w-full justify-center gap-2 h-11 text-[0.9375rem] font-medium shadow-premium hover:shadow-premium-lg transition-all"
            onClick={onNewChat}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <ConversationSearch value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-4 py-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-muted-foreground/70 mt-1">Start a new chat above</p>
                )}
              </div>
            ) : (
              groupedConversations.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground px-3 py-1.5 uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200",
                        activeConversationId === conversation.id
                          ? "bg-sidebar-accent shadow-sm"
                          : "hover:bg-sidebar-accent/60"
                      )}
                      onClick={() => onSelectConversation(conversation.id)}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        activeConversationId === conversation.id 
                          ? "bg-primary/10" 
                          : "bg-muted"
                      )}>
                        <MessageSquare className={cn(
                          "h-4 w-4",
                          activeConversationId === conversation.id 
                            ? "text-primary" 
                            : "text-muted-foreground"
                        )} />
                      </div>
                      <span className={cn(
                        "flex-1 truncate text-sm",
                        activeConversationId === conversation.id 
                          ? "text-sidebar-foreground font-medium" 
                          : "text-sidebar-foreground/80"
                      )}>
                        {conversation.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={(e) => handleDeleteClick(e, conversation.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {conversations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 h-9"
              onClick={() => setClearAllDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Clear All Chats
            </Button>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2.5 h-9"
              onClick={onToggleTheme}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? 'Light' : 'Dark'}
            </Button>
            <Button 
              variant="ghost" 
              size="icon-sm"
              className="h-9 w-9"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          {/* User Menu */}
          <div className="pt-2 border-t border-sidebar-border">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} and their messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};