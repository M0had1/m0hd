import { useState } from 'react';
import logoImage from '@/assets/logo.jpg';
import { Plus, MessageSquare, Trash2, Moon, Sun, Settings, Pin, PinOff, Pencil, BarChart3, Columns2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Conversation } from '@/types/chat';
import { UserMenu } from '@/components/UserMenu';
import { ConversationSearch } from './ConversationSearch';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { usePinnedConversations } from '@/hooks/usePinnedConversations';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAllConversations?: () => void;
  onRenameConversation?: (id: string, title: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const groupConversationsByDate = (conversations: Conversation[]) => {
  const groups: { label: string; conversations: Conversation[] }[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const thisMonth: Conversation[] = [];
  const older: Conversation[] = [];

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt || conv.createdAt);
    if (isToday(date)) today.push(conv);
    else if (isYesterday(date)) yesterday.push(conv);
    else if (isThisWeek(date)) thisWeek.push(conv);
    else if (isThisMonth(date)) thisMonth.push(conv);
    else older.push(conv);
  });

  if (today.length) groups.push({ label: 'Today', conversations: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', conversations: yesterday });
  if (thisWeek.length) groups.push({ label: 'This Week', conversations: thisWeek });
  if (thisMonth.length) groups.push({ label: 'This Month', conversations: thisMonth });
  if (older.length) groups.push({ label: 'Older', conversations: older });
  return groups;
};

export const ChatSidebar = ({
  conversations, activeConversationId, onNewChat, onSelectConversation,
  onDeleteConversation, onClearAllConversations, onRenameConversation, isDark, onToggleTheme,
}: ChatSidebarProps) => {
  const navigate = useNavigate();
  const { isPinned, togglePin } = usePinnedConversations();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => {
        const query = searchQuery.toLowerCase();
        if (conv.title.toLowerCase().includes(query)) return true;
        return conv.messages.some(msg => msg.content.toLowerCase().includes(query));
      })
    : conversations;

  const pinnedConversations = filteredConversations.filter(c => isPinned(c.id));
  const unpinnedConversations = filteredConversations.filter(c => !isPinned(c.id));
  const groupedConversations = [
    ...(pinnedConversations.length ? [{ label: 'Pinned', conversations: pinnedConversations }] : []),
    ...groupConversationsByDate(unpinnedConversations),
  ];

  const commitRename = (id: string) => {
    const next = renameDraft.trim();
    setRenamingId(null);
    if (next) onRenameConversation?.(id, next.slice(0, 80));
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) onDeleteConversation(conversationToDelete);
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const handleClearAll = () => {
    if (onClearAllConversations) onClearAllConversations();
    setClearAllDialogOpen(false);
  };

  return (
    <>
      <div className="flex h-full w-full flex-col bg-sidebar">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-primary/15 shadow-sm">
              <img src={logoImage} alt="Mohamed's AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground text-sm tracking-tight">Mohamed's AI</h1>
              <p className="text-[0.65rem] text-muted-foreground font-medium tracking-wide uppercase">Assistant</p>
            </div>
          </div>
          
          <Button 
            className="w-full justify-center gap-2 h-10 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-sm"
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

        {/* Conversations */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-4 py-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
                {!searchQuery && <p className="text-xs text-muted-foreground/60 mt-1">Start a new chat above</p>}
              </div>
            ) : (
              groupedConversations.map((group) => (
                <div key={group.label} className="space-y-0.5">
                  <p className="text-[0.65rem] font-semibold text-muted-foreground/70 px-3 py-1.5 uppercase tracking-widest">
                    {group.label}
                  </p>
                  {group.conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150",
                        activeConversationId === conversation.id
                          ? "bg-primary/8 border border-primary/15"
                          : "hover:bg-sidebar-accent/60 border border-transparent"
                      )}
                      onClick={() => onSelectConversation(conversation.id)}
                    >
                      {renamingId === conversation.id ? (
                        <Input
                          value={renameDraft}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={() => commitRename(conversation.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(conversation.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="h-7 flex-1 text-[0.8125rem]"
                        />
                      ) : (
                      <span className={cn(
                        "flex-1 truncate text-[0.8125rem]",
                        activeConversationId === conversation.id
                          ? "text-sidebar-foreground font-medium"
                          : "text-sidebar-foreground/75"
                      )}>
                        {conversation.title}
                      </span>
                      )}
                      {isPinned(conversation.id) && renamingId !== conversation.id && (
                        <Pin className="h-3 w-3 shrink-0 text-primary" />
                      )}
                      {renamingId !== conversation.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={isPinned(conversation.id) ? 'Unpin conversation' : 'Pin conversation'}
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 rounded-lg transition-all"
                            onClick={(e) => { e.stopPropagation(); togglePin(conversation.id); }}
                          >
                            {isPinned(conversation.id) ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Rename conversation"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 rounded-lg transition-all"
                            onClick={(e) => { e.stopPropagation(); setRenameDraft(conversation.title); setRenamingId(conversation.id); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete conversation"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                        onClick={(e) => handleDeleteClick(e, conversation.id)}
                      >
                        <Trash2 className="h-3 w-3" />
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs" onClick={() => navigate('/compare')}>
              <Columns2 className="h-3.5 w-3.5" />
              Compare
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs" onClick={() => navigate('/insights')}>
              <BarChart3 className="h-3.5 w-3.5" />
              Insights
            </Button>
          </div>
          {conversations.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs" onClick={() => setClearAllDialogOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear All
            </Button>
          )}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 h-8 text-xs" onClick={onToggleTheme}>
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {isDark ? 'Light' : 'Dark'}
            </Button>
            <Button variant="ghost" size="icon-sm" className="h-8 w-8" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="pt-2 border-t border-sidebar-border">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this conversation and all its messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};
