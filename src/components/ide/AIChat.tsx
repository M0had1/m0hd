import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Sparkles, Code, FileSearch, Bug, Wand2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { FileNode, getLanguageFromFilename } from '@/types/ide';
import { DiffViewer } from '@/components/ide/DiffViewer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  projectData?: ProjectData | null;
}

interface ProjectFile {
  path: string;
  content: string;
}

interface ProjectData {
  project_name: string;
  project_type: string;
  language: string;
  description: string;
  files: ProjectFile[];
}

interface AIChatProps {
  activeFileContent: string | null;
  activeFileName: string | null;
  existingFiles: FileNode[];
  onApplyChanges: (newContent: string) => void;
  onLoadProject?: (files: FileNode[]) => void;
}

const quickActions = [
  { icon: FileSearch, label: 'Explain code', prompt: 'Explain what this code does in detail' },
  { icon: Bug, label: 'Find bugs', prompt: 'Find potential bugs or issues in this code' },
  { icon: Wand2, label: 'Refactor', prompt: 'Suggest improvements and refactor this code' },
  { icon: Code, label: 'Add comments', prompt: 'Add helpful comments to this code' },
];

const projectTemplates = [
  { label: 'React Website', prompt: 'Create a modern responsive landing page website using React and TypeScript with a hero section, features section, about section, and footer' },
  { label: 'React Native App', prompt: 'Create a React Native mobile app with Expo that has tab navigation, a home screen, settings screen, and profile screen with TypeScript' },
  { label: 'Vue.js App', prompt: 'Create a Vue.js 3 web application with TypeScript, Vue Router, and Pinia store with a dashboard layout' },
  { label: 'HTML/CSS Site', prompt: 'Create a beautiful responsive website using plain HTML, CSS, and JavaScript with a modern design' },
  { label: 'Python API', prompt: 'Create a Python FastAPI REST API with routes, models, and services for a task management system' },
  { label: 'Flutter App', prompt: 'Create a Flutter mobile app with Material Design, navigation, home screen, and settings screen' },
];

function tryExtractProjectData(text: string): ProjectData | null {
  try {
    // Find the JSON object with type: "project_generation" anywhere in the text
    const startIndex = text.indexOf('{"type":"project_generation"');
    if (startIndex === -1) {
      // Try with spaces around colon
      const altIndex = text.indexOf('{"type": "project_generation"');
      if (altIndex === -1) return null;
      return parseProjectJson(text, altIndex);
    }
    return parseProjectJson(text, startIndex);
  } catch { /* ignore */ }
  return null;
}

function parseProjectJson(text: string, startIndex: number): ProjectData | null {
  // Find matching closing brace by counting braces
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.substring(startIndex, i + 1));
          if (parsed.type === 'project_generation' && parsed.files) return parsed;
        } catch { /* continue searching */ }
      }
    }
  }
  return null;
}

function buildFileTree(projectFiles: ProjectFile[], projectName: string): FileNode[] {
  const root: FileNode[] = [];
  
  for (const file of projectFiles) {
    const fullPath = `${projectName}/${file.path}`;
    const parts = fullPath.split('/');
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;
      
      let existing = currentLevel.find(n => n.name === part);
      if (!existing) {
        existing = {
          id: crypto.randomUUID(),
          name: part,
          type: isFile ? 'file' : 'folder',
          path: currentPath,
          ...(isFile ? { content: file.content, language: getLanguageFromFilename(part) } : { children: [] }),
        };
        currentLevel.push(existing);
      }
      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    }
  }
  return root;
}

export const AIChat = ({ activeFileContent, activeFileName, existingFiles, onApplyChanges, onLoadProject }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper to serialize existing folder structure for context
  const getStructureDescription = (): string => {
    const paths: string[] = [];
    const collect = (nodes: FileNode[], prefix = '') => {
      for (const node of nodes) {
        const p = prefix ? `${prefix}/${node.name}` : node.name;
        paths.push(node.type === 'folder' ? `${p}/` : p);
        if (node.children) collect(node.children, p);
      }
    };
    collect(existingFiles);
    return paths.join('\n');
  };

  const sendMessage = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Build context with existing folder structure
      let contextPrompt = '';
      const structure = getStructureDescription();
      if (structure) {
        contextPrompt += `The user has the following project folder structure already loaded in the IDE:\n\`\`\`\n${structure}\n\`\`\`\nWhen generating files, place them into the existing folders where appropriate. Create new folders only if needed.\n\n`;
      }
      if (activeFileContent) {
        contextPrompt += `I'm working on a file called "${activeFileName}". Here's the code:\n\n\`\`\`\n${activeFileContent}\n\`\`\`\n\n`;
      }
      contextPrompt += prompt;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: contextPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errData = await response.json();
          throw new Error(errData.error || `Error ${response.status}`);
        }
        throw new Error(`Failed to get AI response (${response.status})`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        // Non-streaming response - try to read as JSON
        const text = await response.text();
        throw new Error(`Unexpected response format: ${text.substring(0, 200)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => 
                  prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
                );
              }
            } catch { /* ignore */ }
          }
        }
      }

      // Check for embedded project data in the response
      const projectData = tryExtractProjectData(assistantContent);
      if (projectData) {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, projectData } : m)
        );
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const applyCodeFromMessage = (content: string) => {
    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeMatch) setPendingDiff(codeMatch[1].trim());
  };

  const loadProject = (projectData: ProjectData) => {
    if (!onLoadProject) return;
    const generatedTree = buildFileTree(projectData.files, projectData.project_name);
    
    // Merge generated files into existing tree if there are existing files
    if (existingFiles.length > 0) {
      const merged = mergeFileTrees(existingFiles, generatedTree);
      onLoadProject(merged);
    } else {
      onLoadProject(generatedTree);
    }
  };

  // Deep-merge two file trees: generated files go into matching existing folders
  const mergeFileTrees = (existing: FileNode[], generated: FileNode[]): FileNode[] => {
    const result: FileNode[] = existing.map(n => ({ ...n, children: n.children ? [...n.children] : undefined }));
    
    for (const genNode of generated) {
      const match = result.find(n => n.name === genNode.name && n.type === genNode.type);
      if (match && match.type === 'folder' && genNode.children && match.children) {
        match.children = mergeFileTrees(match.children, genNode.children);
      } else if (!match) {
        result.push(genNode);
      }
      // If same-name file exists, replace it with generated version
      else if (match && match.type === 'file') {
        Object.assign(match, genNode);
      }
    }
    return result;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">AI Assistant</span>
      </div>

      {/* Quick Actions & Templates */}
      {messages.length === 0 && (
        <div className="p-3 border-b border-border space-y-3">
          {activeFileContent && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickActions.map((action) => (
                  <Button key={action.label} variant="outline" size="sm" className="text-xs h-7"
                    onClick={() => sendMessage(action.prompt)}>
                    <action.icon className="h-3 w-3 mr-1" />{action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Create a project:</p>
            <div className="flex flex-wrap gap-1.5">
              {projectTemplates.map((tpl) => (
                <Button key={tpl.label} variant="outline" size="sm" className="text-xs h-7"
                  onClick={() => sendMessage(tpl.prompt)}>
                  <FolderPlus className="h-3 w-3 mr-1" />{tpl.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Ask me anything about your code!</p>
            <p className="text-xs mt-1">I can create full projects, explain, debug, and refactor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex gap-2", message.role === 'user' && "flex-row-reverse")}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                  message.role === 'assistant' ? "bg-primary/10" : "bg-muted"
                )}>
                  {message.role === 'assistant' ? <Bot className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5" />}
                </div>
                <div className={cn("flex-1 text-sm rounded-lg p-2.5", message.role === 'assistant' ? "bg-muted/50" : "bg-primary/10")}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap break-words text-xs font-sans">
                      {message.content || (isLoading && message.role === 'assistant' ? '...' : '')}
                    </pre>
                  </div>
                  {/* Project generation button */}
                  {message.role === 'assistant' && message.projectData && (
                    <Button size="sm" className="mt-2 text-xs h-8 gap-1.5"
                      onClick={() => loadProject(message.projectData!)}>
                      <FolderPlus className="h-3.5 w-3.5" />
                      Load "{message.projectData.project_name}" ({message.projectData.files.length} files)
                    </Button>
                  )}
                  {/* Apply code button */}
                  {message.role === 'assistant' && !message.projectData && message.content.includes('```') && (
                    <Button size="sm" variant="outline" className="mt-2 text-xs h-7"
                      onClick={() => applyCodeFromMessage(message.content)}>
                      <Code className="h-3 w-3 mr-1" />Apply changes
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="relative">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Create a React Native app... or ask about your code..."
            className="pr-10 min-h-[60px] max-h-[120px] resize-none text-sm" disabled={isLoading} />
          <Button size="icon" className="absolute right-2 bottom-2 h-7 w-7"
            onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
