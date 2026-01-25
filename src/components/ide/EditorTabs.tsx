import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorTabsProps {
  openFiles: string[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
}

export const EditorTabs = ({ openFiles, activeFile, onSelectFile, onCloseFile }: EditorTabsProps) => {
  if (openFiles.length === 0) return null;

  const getFileName = (path: string) => path.split('/').pop() || path;

  return (
    <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto">
      {openFiles.map((path) => (
        <div
          key={path}
          className={cn(
            "group flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer transition-colors min-w-0",
            path === activeFile
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          onClick={() => onSelectFile(path)}
        >
          <span className="text-sm truncate max-w-[120px]">{getFileName(path)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseFile(path);
            }}
            className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
