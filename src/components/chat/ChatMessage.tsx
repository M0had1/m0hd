import { User, Bot, Copy, Check, RefreshCw, FileText, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
}

export const ChatMessage = ({ message, onRegenerate }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatContent = (content: string) => {
    // Basic markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Code blocks
        if (line.startsWith('```')) {
          return null; // Handle separately
        }
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={i} className="font-semibold text-base mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="font-semibold text-lg mt-4 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="font-bold text-xl mt-4 mb-2">{line.slice(2)}</h1>;
        }
        // Bold text
        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = line.split(boldRegex);
        if (parts.length > 1) {
          return (
            <p key={i} className="mb-2">
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </p>
          );
        }
        // Lists
        if (line.startsWith('- ') || line.match(/^\d+\. /)) {
          return <li key={i} className="ml-4 mb-1">{line.replace(/^-\s|^\d+\.\s/, '')}</li>;
        }
        // Empty lines
        if (!line.trim()) {
          return <br key={i} />;
        }
        return <p key={i} className="mb-2">{line}</p>;
      });
  };

  // Extract code blocks
  const renderContent = () => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    // Remove file content blocks from display (they were appended for the API)
    let displayContent = message.content;
    const fileContentRegex = /\n\n--- Content of .+? ---\n[\s\S]*?\n--- End of .+? ---\n?/g;
    displayContent = displayContent.replace(fileContentRegex, '');
    
    // Also remove [Attached file: ...] markers
    displayContent = displayContent.replace(/\n\n\[Attached file: .+?\]/g, '');

    while ((match = codeBlockRegex.exec(displayContent)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(
          <div key={lastIndex} className="prose-chat">
            {formatContent(displayContent.slice(lastIndex, match.index))}
          </div>
        );
      }

      // Add code block
      const language = match[1] || 'code';
      const code = match[2].trim();
      parts.push(
        <div key={match.index} className="my-3 rounded-lg bg-navy-darker overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-navy-dark/50 border-b border-border/20">
            <span className="text-xs text-muted-foreground font-mono">{language}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => navigator.clipboard.writeText(code)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="p-4 overflow-x-auto">
            <code className="text-sm font-mono text-emerald-light">{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < displayContent.length) {
      parts.push(
        <div key={lastIndex} className="prose-chat">
          {formatContent(displayContent.slice(lastIndex))}
        </div>
      );
    }

    return parts.length > 0 ? parts : <div className="prose-chat">{formatContent(displayContent)}</div>;
  };

  // Render attachments
  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mb-3">
        {message.attachments.map((attachment) => (
          <div key={attachment.id} className="relative">
            {attachment.type.startsWith('image/') && attachment.url ? (
              <div className="rounded-lg overflow-hidden border border-border/50 shadow-sm">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-w-[200px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    // Open image in new tab
                    window.open(attachment.url, '_blank');
                  }}
                />
                <div className="px-2 py-1 bg-muted/50 text-xs text-muted-foreground truncate max-w-[200px]">
                  {attachment.name}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border/50">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[150px]">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(attachment.size / 1024)} KB
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "group flex gap-4 px-4 py-6 animate-fade-in",
        isUser ? "bg-transparent" : "bg-muted/30"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-gradient-navy text-primary-foreground"
            : "bg-gradient-gold text-navy-dark"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? 'You' : "Mohamed's AI"}
          </span>
          {message.isStreaming && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="animate-typing">●</span>
              <span className="animate-typing" style={{ animationDelay: '0.2s' }}>●</span>
              <span className="animate-typing" style={{ animationDelay: '0.4s' }}>●</span>
            </span>
          )}
        </div>

        {/* Attachments */}
        {isUser && renderAttachments()}

        <div className="text-foreground">
          {renderContent()}
        </div>

        {/* Actions */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-3 w-3 text-emerald" /> : <Copy className="h-3 w-3" />}
            </Button>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7"
                onClick={onRegenerate}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
