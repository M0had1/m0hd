import { useState } from 'react';
import { MoreHorizontal, Share2, Trash2, Code2, Smartphone, PanelLeftClose, PanelLeft, FolderCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShareDialog } from './ShareDialog';
import { ExportMenu } from './ExportMenu';
import { ModelSelector } from './ModelSelector';
import { Conversation } from '@/types/chat';

interface ChatHeaderProps {
  title: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  conversationId?: string;
  conversation?: Conversation;
  onClearConversation?: () => void;
}

export const ChatHeader = ({ 
  title, onToggleSidebar, isSidebarOpen, conversationId, conversation, onClearConversation,
}: ChatHeaderProps) => {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border/50 bg-background/60 backdrop-blur-xl flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar} aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'} className="shrink-0 h-8 w-8 rounded-xl hover:bg-muted">
                {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}</TooltipContent>
          </Tooltip>
          <ModelSelector />
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/install')} aria-label="Install App" className="hidden sm:flex h-8 w-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
                <Smartphone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Install App</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/ide')} aria-label="Code IDE" className="hidden sm:flex h-8 w-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
                <FolderCode className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Code IDE</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/playground')} aria-label="Code Playground" className="hidden sm:flex h-8 w-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
                <Code2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Code Playground</TooltipContent>
          </Tooltip>

          <ExportMenu conversation={conversation} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More options" className="h-8 w-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => conversationId && setShareOpen(true)} disabled={!conversationId} className="gap-2.5">
                <Share2 className="h-4 w-4" /> Share conversation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/install')} className="sm:hidden gap-2.5">
                <Smartphone className="h-4 w-4" /> Install App
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/ide')} className="sm:hidden gap-2.5">
                <FolderCode className="h-4 w-4" /> Code IDE
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/playground')} className="sm:hidden gap-2.5">
                <Code2 className="h-4 w-4" /> Code Playground
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive gap-2.5" onClick={onClearConversation} disabled={!conversation?.messages?.length}>
                <Trash2 className="h-4 w-4" /> Clear conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {conversationId && (
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} conversationId={conversationId} conversationTitle={title || 'New Chat'} />
      )}
    </>
  );
};
