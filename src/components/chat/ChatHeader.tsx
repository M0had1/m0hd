import { useState } from 'react';
import { Menu, MoreHorizontal, Share2, Trash2, Code2, Smartphone, Sparkles, PanelLeftClose, PanelLeft, FolderCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShareDialog } from './ShareDialog';
import { ModelSelector } from './ModelSelector';
import { ExportMenu } from './ExportMenu';
import { Conversation } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  title: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  conversationId?: string;
  conversation?: Conversation;
  onClearConversation?: () => void;
}

export const ChatHeader = ({ 
  title, 
  onToggleSidebar, 
  isSidebarOpen, 
  conversationId,
  conversation,
  onClearConversation,
}: ChatHeaderProps) => {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-border bg-background/70 backdrop-blur-xl flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={onToggleSidebar} 
                className="shrink-0 h-9 w-9 hover:bg-muted"
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-5 w-5" />
                ) : (
                  <PanelLeft className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="hidden sm:flex w-8 h-8 rounded-lg bg-gradient-gold items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4 text-navy-dark" />
            </div>
            <div className="min-w-0">
              <h1 className="font-medium text-foreground truncate max-w-[140px] sm:max-w-[280px] text-[0.9375rem]">
                {title || "New Chat"}
              </h1>
              {title && (
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Mohamed's AI
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Install App */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => navigate('/install')}
                className="hidden sm:flex h-9 w-9 hover:bg-muted"
              >
                <Smartphone className="h-[1.125rem] w-[1.125rem]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Install App</TooltipContent>
          </Tooltip>

          {/* Code IDE */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => navigate('/ide')}
                className="hidden sm:flex h-9 w-9 hover:bg-muted"
              >
                <FolderCode className="h-[1.125rem] w-[1.125rem]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Code IDE</TooltipContent>
          </Tooltip>

          {/* Code Playground */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => navigate('/playground')}
                className="hidden sm:flex h-9 w-9 hover:bg-muted"
              >
                <Code2 className="h-[1.125rem] w-[1.125rem]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Code Playground</TooltipContent>
          </Tooltip>

          {/* Model selector - hidden */}

          {/* Export Menu */}
          <ExportMenu conversation={conversation} />

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-9 w-9 hover:bg-muted">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem 
                onClick={() => conversationId && setShareOpen(true)} 
                disabled={!conversationId}
                className="gap-2.5"
              >
                <Share2 className="h-4 w-4" />
                Share conversation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/install')} className="sm:hidden gap-2.5">
                <Smartphone className="h-4 w-4" />
                Install App
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/ide')} className="sm:hidden gap-2.5">
                <FolderCode className="h-4 w-4" />
                Code IDE
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/playground')} className="sm:hidden gap-2.5">
                <Code2 className="h-4 w-4" />
                Code Playground
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive gap-2.5"
                onClick={onClearConversation}
                disabled={!conversation?.messages?.length}
              >
                <Trash2 className="h-4 w-4" />
                Clear conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {conversationId && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          conversationId={conversationId}
          conversationTitle={title || 'New Chat'}
        />
      )}
    </>
  );
};