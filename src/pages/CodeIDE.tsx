import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Code2, PanelLeftClose, PanelLeft, MessageSquare, X, Search, Command, Wand2, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { FileTree } from '@/components/ide/FileTree';
import { EditorTabs } from '@/components/ide/EditorTabs';
import { CodeEditor } from '@/components/ide/CodeEditor';
import { AIChat } from '@/components/ide/AIChat';
import { FolderUpload } from '@/components/ide/FolderUpload';
import { CommandPalette } from '@/components/ide/CommandPalette';
import { FileSearch } from '@/components/ide/FileSearch';
import { StatusBar } from '@/components/ide/StatusBar';
import { FileNode, getLanguageFromFilename } from '@/types/ide';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIDEKeyboard } from '@/hooks/useIDEKeyboard';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCode, isFormattingSupported } from '@/lib/codeFormatter';
import { exportProjectAsZip } from '@/lib/exportProject';

export default function CodeIDE() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAIChat, setShowAIChat] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  // Calculate file count
  const fileCount = useMemo(() => {
    let count = 0;
    const countFiles = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') count++;
        if (node.children) countFiles(node.children);
      }
    };
    countFiles(files);
    return count;
  }, [files]);

  const clearProject = useCallback(() => {
    setFiles([]);
    setOpenFiles([]);
    setActiveFile(null);
    setFileContents(new Map());
  }, []);

  const findFileNode = useCallback((nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findFileNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Format current file
  const handleFormatCode = useCallback(async () => {
    if (!activeFile) return;
    
    const content = fileContents.get(activeFile) || '';
    const fileNode = findFileNode(files, activeFile);
    const language = fileNode ? getLanguageFromFilename(fileNode.name) : 'plaintext';
    
    if (!isFormattingSupported(language)) {
      toast({
        title: 'Format not supported',
        description: `Formatting is not available for ${language} files`,
        variant: 'destructive',
      });
      return;
    }

    setIsFormatting(true);
    try {
      const { formatted, error } = await formatCode(content, language);
      
      if (error) {
        toast({
          title: 'Format error',
          description: error,
          variant: 'destructive',
        });
      } else {
        setFileContents(prev => {
          const next = new Map(prev);
          next.set(activeFile, formatted);
          return next;
        });
        toast({
          title: 'Formatted',
          description: 'Code formatted successfully',
        });
      }
    } finally {
      setIsFormatting(false);
    }
  }, [activeFile, fileContents, files, findFileNode]);

  // Keyboard shortcuts
  useIDEKeyboard({
    onSave: () => {
      if (activeFile) {
        toast({ title: 'Saved', description: `${activeFile} saved successfully` });
      }
    },
    onQuickOpen: () => setShowCommandPalette(true),
    onCommandPalette: () => setShowCommandPalette(true),
    onToggleSidebar: () => setShowSidebar(prev => !prev),
    onToggleAI: () => setShowAIChat(prev => !prev),
    onSearch: () => setShowSearch(true),
    onCloseTab: () => {
      if (activeFile) {
        handleCloseFile(activeFile);
      }
    },
  });

  const handleFilesLoaded = useCallback((loadedFiles: FileNode[]) => {
    setFiles(loadedFiles);
    
    // Build content map
    const contentMap = new Map<string, string>();
    const collectContents = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file' && node.content) {
          contentMap.set(node.path, node.content);
        }
        if (node.children) collectContents(node.children);
      }
    };
    collectContents(loadedFiles);
    setFileContents(contentMap);
  }, []);

  const handleSelectFile = useCallback((path: string) => {
    const node = findFileNode(files, path);
    if (node && node.type === 'file') {
      if (!openFiles.includes(path)) {
        setOpenFiles(prev => [...prev, path]);
      }
      setActiveFile(path);
    }
  }, [files, openFiles, findFileNode]);

  const handleCloseFile = useCallback((path: string) => {
    setOpenFiles(prev => prev.filter(p => p !== path));
    if (activeFile === path) {
      const remaining = openFiles.filter(p => p !== path);
      setActiveFile(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  }, [activeFile, openFiles]);

  const handleContentChange = useCallback((value: string) => {
    if (activeFile) {
      setFileContents(prev => {
        const next = new Map(prev);
        next.set(activeFile, value);
        return next;
      });
    }
  }, [activeFile]);

  const handleApplyAIChanges = useCallback((newContent: string) => {
    if (activeFile) {
      setFileContents(prev => {
        const next = new Map(prev);
        next.set(activeFile, newContent);
        return next;
      });
    }
  }, [activeFile]);

  const activeFileNode = activeFile ? findFileNode(files, activeFile) : null;
  const activeContent = activeFile ? fileContents.get(activeFile) || '' : '';
  const activeLanguage = activeFileNode ? getLanguageFromFilename(activeFileNode.name) : 'plaintext';
  const lineCount = activeContent.split('\n').length;

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        files={files}
        onSelectFile={handleSelectFile}
        onToggleAI={() => setShowAIChat(prev => !prev)}
        onToggleSidebar={() => setShowSidebar(prev => !prev)}
        onClearProject={clearProject}
      />

      {/* Header */}
      <header className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Chat</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="h-8 w-8"
              >
                {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Sidebar (Ctrl+B)</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 ml-2">
            <Code2 className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-semibold">Code IDE</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSearch(!showSearch)}
                    className="h-8"
                  >
                    <Search className="h-4 w-4 mr-1.5" />
                    Search
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search in Files (Ctrl+Shift+F)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommandPalette(true)}
                    className="h-8"
                  >
                    <Command className="h-4 w-4 mr-1.5" />
                    Commands
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Command Palette (Ctrl+Shift+P)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFormatCode}
                    disabled={!activeFile || isFormatting || !isFormattingSupported(activeLanguage)}
                    className="h-8"
                  >
                    {isFormatting ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-1.5" />
                    )}
                    Format
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFormattingSupported(activeLanguage) 
                    ? 'Format Code (Prettier)' 
                    : `Formatting not supported for ${activeLanguage}`}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportProjectAsZip(files, fileContents)}
                    className="h-8"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Export ZIP
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download project as ZIP</TooltipContent>
              </Tooltip>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showAIChat ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAIChat(!showAIChat)}
                className="h-8"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                AI Assistant
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle AI (Ctrl+J)</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {files.length === 0 ? (
          <div className="h-full p-8 flex items-center justify-center">
            <div className="max-w-xl w-full">
              <FolderUpload onFilesLoaded={handleFilesLoaded} />
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* File Explorer / Search Panel */}
            {showSidebar && (
              <>
                <ResizablePanel defaultSize={18} minSize={15} maxSize={30}>
                  <div className="h-full border-r border-border flex flex-col">
                    {showSearch ? (
                      <FileSearch
                        files={files}
                        fileContents={fileContents}
                        onSelectFile={handleSelectFile}
                        onClose={() => setShowSearch(false)}
                      />
                    ) : (
                      <>
                        <div className="p-2 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                            Explorer
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={clearProject}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <ScrollArea className="flex-1">
                          <FileTree
                            files={files}
                            activeFile={activeFile}
                            onSelectFile={handleSelectFile}
                          />
                        </ScrollArea>
                      </>
                    )}
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Editor Area */}
            <ResizablePanel defaultSize={showAIChat ? 52 : 82}>
              <div className="h-full flex flex-col">
                <EditorTabs
                  openFiles={openFiles}
                  activeFile={activeFile}
                  onSelectFile={setActiveFile}
                  onCloseFile={handleCloseFile}
                />
                <div className="flex-1">
                  {activeFile ? (
                    <CodeEditor
                      value={activeContent}
                      language={activeLanguage}
                      onChange={handleContentChange}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Code2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Select a file to start editing</p>
                        <p className="text-xs mt-2 opacity-60">
                          Press Ctrl+P to quick open files
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            {/* AI Chat */}
            {showAIChat && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                  <div className="h-full border-l border-border">
                    <AIChat
                      activeFileContent={activeContent || null}
                      activeFileName={activeFileNode?.name || null}
                      existingFiles={files}
                      onApplyChanges={handleApplyAIChanges}
                      onLoadProject={handleFilesLoaded}
                    />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        activeFileName={activeFileNode?.name || null}
        activeLanguage={activeLanguage}
        lineCount={lineCount}
        fileCount={fileCount}
        openFileCount={openFiles.length}
      />
    </div>
  );
}
