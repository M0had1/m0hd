import { Menu, MoreHorizontal, Share2, Download, Code2 } from 'lucide-react';
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

interface ChatHeaderProps {
  title: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const ChatHeader = ({ title, onToggleSidebar, isSidebarOpen }: ChatHeaderProps) => {
  const navigate = useNavigate();

  return (
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

      <div className="flex items-center gap-2">
        {/* Code Playground */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={() => navigate('/playground')}
            >
              <Code2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Code Playground</TooltipContent>
        </Tooltip>

        {/* Model selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                Gemini Flash
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald" />
                Gemini 2.5 Flash
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                GPT-5 (Coming soon)
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                Gemini Pro (Coming soon)
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Share2 className="h-4 w-4 mr-2" />
              Share conversation
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Clear conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};