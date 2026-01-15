import { Download, FileText, FileCode, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Conversation } from '@/types/chat';
import { exportConversation } from '@/lib/exportConversation';
import { toast } from '@/hooks/use-toast';

interface ExportMenuProps {
  conversation?: Conversation;
}

export const ExportMenu = ({ conversation }: ExportMenuProps) => {
  const handleExport = (format: 'markdown' | 'text' | 'json') => {
    if (!conversation) {
      toast({
        title: 'No conversation',
        description: 'Start a conversation first to export it.',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportConversation(conversation, format);
      toast({
        title: 'Exported!',
        description: `Conversation exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export the conversation.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled={!conversation?.messages?.length}>
              <Download className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Export conversation</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleExport('markdown')}>
          <FileCode className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('text')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
