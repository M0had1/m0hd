import { useState, useEffect, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { File, Search, Settings, Moon, Sun, Code, MessageSquare, FolderOpen } from 'lucide-react';
import { FileNode } from '@/types/ide';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: FileNode[];
  onSelectFile: (path: string) => void;
  onToggleAI: () => void;
  onToggleSidebar: () => void;
  onClearProject: () => void;
}

export const CommandPalette = ({
  open,
  onOpenChange,
  files,
  onSelectFile,
  onToggleAI,
  onToggleSidebar,
  onClearProject,
}: CommandPaletteProps) => {
  const [search, setSearch] = useState('');

  // Flatten file tree to get all files
  const allFiles = useMemo(() => {
    const result: FileNode[] = [];
    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          result.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(files);
    return result;
  }, [files]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const handleSelectFile = (path: string) => {
    onSelectFile(path);
    onOpenChange(false);
  };

  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-lg overflow-hidden">
        <Command className="rounded-lg border-none">
          <CommandInput 
            placeholder="Type a command or search files..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            
            {allFiles.length > 0 && (
              <CommandGroup heading="Files">
                {allFiles
                  .filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || 
                               f.path.toLowerCase().includes(search.toLowerCase()))
                  .slice(0, 8)
                  .map((file) => (
                    <CommandItem
                      key={file.path}
                      value={file.path}
                      onSelect={() => handleSelectFile(file.path)}
                    >
                      <File className="mr-2 h-4 w-4" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {file.path}
                      </span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => handleAction(onToggleAI)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Toggle AI Assistant
              </CommandItem>
              <CommandItem onSelect={() => handleAction(onToggleSidebar)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Toggle File Explorer
              </CommandItem>
              {files.length > 0 && (
                <CommandItem onSelect={() => handleAction(onClearProject)}>
                  <Code className="mr-2 h-4 w-4" />
                  Close Project
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
