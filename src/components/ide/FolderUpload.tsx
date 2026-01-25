import { useCallback } from 'react';
import { Upload, FolderUp } from 'lucide-react';
import { FileNode, getLanguageFromFilename } from '@/types/ide';
import { toast } from 'sonner';

interface FolderUploadProps {
  onFilesLoaded: (files: FileNode[]) => void;
}

export const FolderUpload = ({ onFilesLoaded }: FolderUploadProps) => {
  const processFiles = useCallback(async (items: DataTransferItemList | FileList) => {
    const fileNodes: FileNode[] = [];
    const fileMap = new Map<string, FileNode>();

    const readFileContent = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    };

    const processEntry = async (entry: FileSystemEntry, path: string = ''): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise((resolve) => {
          fileEntry.file(async (file) => {
            // Skip binary files and large files
            const isTextFile = /\.(js|jsx|ts|tsx|py|php|html|htm|css|scss|sass|less|json|xml|md|sql|sh|bash|yml|yaml|java|c|cpp|h|hpp|cs|go|rs|rb|swift|kt|vue|svelte|txt|env|gitignore|dockerfile|makefile|readme)$/i.test(file.name) || 
                              !file.name.includes('.') ||
                              file.type.startsWith('text/');
            
            if (isTextFile && file.size < 1024 * 1024) { // Less than 1MB
              try {
                const content = await readFileContent(file);
                const fullPath = path ? `${path}/${file.name}` : file.name;
                
                fileMap.set(fullPath, {
                  id: crypto.randomUUID(),
                  name: file.name,
                  type: 'file',
                  content,
                  language: getLanguageFromFilename(file.name),
                  path: fullPath,
                });
              } catch (error) {
                console.warn(`Could not read file: ${file.name}`);
              }
            }
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const dirReader = dirEntry.createReader();
        
        return new Promise((resolve) => {
          const readEntries = () => {
            dirReader.readEntries(async (entries) => {
              if (entries.length === 0) {
                resolve();
                return;
              }
              
              const fullPath = path ? `${path}/${entry.name}` : entry.name;
              
              for (const childEntry of entries) {
                await processEntry(childEntry, fullPath);
              }
              
              readEntries(); // Continue reading if there are more entries
            });
          };
          readEntries();
        });
      }
    };

    // Process DataTransferItemList (from drag and drop)
    if ('length' in items && items[0] && 'webkitGetAsEntry' in items[0]) {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as DataTransferItem;
        const entry = item.webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      
      for (const entry of entries) {
        await processEntry(entry);
      }
    }

    // Build tree structure from flat file map
    const buildTree = (files: Map<string, FileNode>): FileNode[] => {
      const root: FileNode[] = [];
      const folders = new Map<string, FileNode>();

      // Sort paths to ensure parent folders are processed first
      const sortedPaths = Array.from(files.keys()).sort();

      for (const path of sortedPaths) {
        const file = files.get(path)!;
        const parts = path.split('/');
        
        if (parts.length === 1) {
          // Root level file
          root.push(file);
        } else {
          // Nested file - ensure parent folders exist
          let currentPath = '';
          let parent: FileNode[] = root;

          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!folders.has(currentPath)) {
              const folder: FileNode = {
                id: crypto.randomUUID(),
                name: part,
                type: 'folder',
                children: [],
                path: currentPath,
              };
              folders.set(currentPath, folder);
              parent.push(folder);
            }

            parent = folders.get(currentPath)!.children!;
          }

          parent.push(file);
        }
      }

      // Sort folders and files (folders first, then alphabetically)
      const sortNodes = (nodes: FileNode[]): FileNode[] => {
        return nodes.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name);
        }).map(node => {
          if (node.children) {
            node.children = sortNodes(node.children);
          }
          return node;
        });
      };

      return sortNodes(root);
    };

    const tree = buildTree(fileMap);
    
    if (tree.length > 0) {
      onFilesLoaded(tree);
      toast.success(`Loaded ${fileMap.size} files`);
    } else {
      toast.error('No readable files found');
    }
  }, [onFilesLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.items) {
      processFiles(e.dataTransfer.items);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // For input, we need to handle differently
      // This is a simplified version
      toast.info('For best results, drag and drop a folder');
    }
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
    >
      <FolderUp className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Drop your project folder here</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Drag and drop a folder containing your code files. Supports PHP, JavaScript, Python, and many more languages.
      </p>
      <label className="mt-4 cursor-pointer">
        <input
          type="file"
          className="hidden"
          onChange={handleInputChange}
          // @ts-ignore - webkitdirectory is not in types but works in browsers
          webkitdirectory=""
          multiple
        />
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Upload className="h-4 w-4" />
          Or browse files
        </span>
      </label>
    </div>
  );
};
