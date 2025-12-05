import { Menu, MoreHorizontal, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  title: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const ChatHeader = ({ title, onToggleSidebar, isSidebarOpen }: ChatHeaderProps) => {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
            {title || "New Chat"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Model selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                DeepSeek
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald" />
                DeepSeek Chat
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                GPT-4 (Coming soon)
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                Claude 3 (Coming soon)
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
