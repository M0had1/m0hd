import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Moon, Sun, Settings } from 'lucide-react';
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
        // Search in title
        if (conv.title.toLowerCase().includes(query)) return true;
        // Search in message content
        return conv.messages.some(msg => 
          msg.content.toLowerCase().includes(query)
        );
      })
    : conversations;

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
            className="w-full justify-start gap-2 mb-3"
            onClick={onNewChat}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
          
          {/* Search */}
          <ConversationSearch value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-1">
            {filteredConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">
                {searchQuery ? 'No conversations found' : 'No conversations yet. Start a new chat!'}
              </p>
            ) : (
              filteredConversations.map((conversation) => (
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
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => handleDeleteClick(e, conversation.id)}
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
          {conversations.length > 0 && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setClearAllDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Clear All Chats
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={onToggleTheme}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          
          {/* User Menu */}
          <div className="pt-2 border-t border-sidebar-border">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
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
        <AlertDialogContent>
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
