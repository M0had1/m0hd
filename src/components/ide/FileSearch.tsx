import { useState, useMemo } from 'react';
import { Search, X, File, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileNode } from '@/types/ide';
import { cn } from '@/lib/utils';

interface SearchResult {
  file: FileNode;
  matches: { line: number; content: string; matchStart: number; matchEnd: number }[];
}

interface FileSearchProps {
  files: FileNode[];
  fileContents: Map<string, string>;
  onSelectFile: (path: string) => void;
  onClose: () => void;
}

export const FileSearch = ({ files, fileContents, onSelectFile, onClose }: FileSearchProps) => {
  const [query, setQuery] = useState('');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];

    const searchResults: SearchResult[] = [];
    const searchQuery = query.toLowerCase();

    const searchInFiles = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          const content = fileContents.get(node.path) || node.content || '';
          const lines = content.split('\n');
          const matches: SearchResult['matches'] = [];

          lines.forEach((line, index) => {
            const lowerLine = line.toLowerCase();
            let pos = 0;
            while ((pos = lowerLine.indexOf(searchQuery, pos)) !== -1) {
              matches.push({
                line: index + 1,
                content: line.trim(),
                matchStart: pos,
                matchEnd: pos + query.length,
              });
              pos += query.length;
            }
          });

          if (matches.length > 0) {
            searchResults.push({ file: node, matches: matches.slice(0, 5) });
          }
        }
        if (node.children) {
          searchInFiles(node.children);
        }
      }
    };

    searchInFiles(files);
    return searchResults.slice(0, 20);
  }, [query, files, fileContents]);

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectMatch = (path: string) => {
    onSelectFile(path);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in files..."
          className="h-7 text-sm"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {query.length < 2 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Type at least 2 characters to search
          </div>
        ) : results.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No results found for "{query}"
          </div>
        ) : (
          <div className="py-2">
            {results.map((result) => (
              <div key={result.file.path}>
                <button
                  onClick={() => toggleFile(result.file.path)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors text-left"
                >
                  {expandedFiles.has(result.file.path) ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate font-medium">{result.file.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {result.matches.length} match{result.matches.length > 1 ? 'es' : ''}
                  </span>
                </button>

                {expandedFiles.has(result.file.path) && (
                  <div className="ml-6 border-l border-border">
                    {result.matches.map((match, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectMatch(result.file.path)}
                        className="w-full flex items-start gap-2 px-3 py-1 text-xs hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className="text-muted-foreground shrink-0 w-8 text-right">
                          {match.line}
                        </span>
                        <span className="truncate font-mono">
                          {match.content.slice(0, 100)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-2 border-t border-border text-xs text-muted-foreground">
        {results.length} file{results.length !== 1 ? 's' : ''} with matches
      </div>
    </div>
  );
};
