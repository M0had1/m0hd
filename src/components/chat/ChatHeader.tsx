import { useState } from 'react';
import { Menu, MoreHorizontal, Share2, Trash2, Code2, Smartphone } from 'lucide-react';
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
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar} className="shrink-0">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[300px]">
              {title || "New Chat"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Install App */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => navigate('/install')}
                className="hidden sm:flex"
              >
                <Smartphone className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Install App</TooltipContent>
          </Tooltip>

          {/* Code Playground */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => navigate('/playground')}
                className="hidden sm:flex"
              >
                <Code2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Code Playground</TooltipContent>
          </Tooltip>

          {/* Model selector */}
          <ModelSelector />

          {/* Export Menu */}
          <ExportMenu conversation={conversation} />

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => conversationId && setShareOpen(true)} disabled={!conversationId}>
                <Share2 className="h-4 w-4 mr-2" />
                Share conversation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/install')} className="sm:hidden">
                <Smartphone className="h-4 w-4 mr-2" />
                Install App
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/playground')} className="sm:hidden">
                <Code2 className="h-4 w-4 mr-2" />
                Code Playground
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={onClearConversation}
                disabled={!conversation?.messages?.length}
              >
                <Trash2 className="h-4 w-4 mr-2" />
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
