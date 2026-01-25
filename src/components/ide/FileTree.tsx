import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { FileNode, getFileIcon } from '@/types/ide';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  files: FileNode[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}

const FileTreeItem = ({ node, depth, activeFile, onSelectFile }: FileTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isActive = node.path === activeFile;

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onSelectFile(node.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-muted/50 transition-colors text-left",
          isActive && "bg-primary/10 text-primary font-medium"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.type === 'folder' ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-amber-500 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <File className="h-4 w-4 text-muted-foreground shrink-0" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree = ({ files, activeFile, onSelectFile }: FileTreeProps) => {
  if (files.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        Drag & drop a folder here to get started
      </div>
    );
  }

  return (
    <div className="py-2">
      {files.map((node) => (
        <FileTreeItem
          key={node.id}
          node={node}
          depth={0}
          activeFile={activeFile}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
};
