import { User, Bot, Copy, Check, RefreshCw, FileText, AlertCircle, Sparkles, Download } from 'lucide-react';
import { useState } from 'react';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  const downloadImage = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || `image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Image downloaded');
    } catch {
      toast.error('Failed to download image');
    }
  };

  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('```')) {
          return null;
        }
        // Render markdown images: ![alt](url)
        const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        if (imgRegex.test(line)) {
          imgRegex.lastIndex = 0;
          const parts: React.ReactNode[] = [];
          let lastIdx = 0;
          let imgMatch;
          while ((imgMatch = imgRegex.exec(line)) !== null) {
            if (imgMatch.index > lastIdx) {
              parts.push(<span key={`t${i}-${lastIdx}`}>{line.slice(lastIdx, imgMatch.index)}</span>);
            }
            parts.push(
              <div key={`img${i}-${imgMatch.index}`} className="relative group/img inline-block my-2">
                <img
                  src={imgMatch[2]}
                  alt={imgMatch[1] || 'Generated Image'}
                  className="max-w-full rounded-xl shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(imgMatch![2], '_blank')}
                />
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md bg-background/80 backdrop-blur-sm"
                  onClick={(e) => { e.stopPropagation(); downloadImage(imgMatch![2], `generated-${Date.now()}.png`); }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            );
            lastIdx = imgMatch.index + imgMatch[0].length;
          }
          if (lastIdx < line.length) {
            parts.push(<span key={`te${i}`}>{line.slice(lastIdx)}</span>);
          }
          return <div key={i}>{parts}</div>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="font-semibold text-base mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="font-semibold text-lg mt-4 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="font-bold text-xl mt-4 mb-2">{line.slice(2)}</h1>;
        }
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
        if (line.startsWith('- ') || line.match(/^\d+\. /)) {
          return <li key={i} className="ml-4 mb-1">{line.replace(/^-\s|^\d+\.\s/, '')}</li>;
        }
        if (!line.trim()) {
          return <br key={i} />;
        }
        return <p key={i} className="mb-2">{line}</p>;
      });
  };

  const renderContent = () => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    let displayContent = message.content;
    const fileContentRegex = /\n\n--- Content of .+? ---\n[\s\S]*?\n--- End of .+? ---\n?/g;
    displayContent = displayContent.replace(fileContentRegex, '');
    displayContent = displayContent.replace(/\n\n\[Attached file: .+?\]/g, '');

    while ((match = codeBlockRegex.exec(displayContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <div key={lastIndex} className="prose-chat">
            {formatContent(displayContent.slice(lastIndex, match.index))}
          </div>
        );
      }

      const language = match[1] || 'code';
      const code = match[2].trim();
      parts.push(
        <div key={match.index} className="my-4 rounded-xl overflow-hidden border border-border/50 shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/80 border-b border-border/30">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{language}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => navigator.clipboard.writeText(code)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="p-4 overflow-x-auto bg-navy-darker/95">
            <code className="text-sm font-mono text-emerald-light" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {code}
            </code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < displayContent.length) {
      parts.push(
        <div key={lastIndex} className="prose-chat">
          {formatContent(displayContent.slice(lastIndex))}
        </div>
      );
    }

    return parts.length > 0 ? parts : <div className="prose-chat">{formatContent(displayContent)}</div>;
  };

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mb-3">
        {message.attachments.map((attachment) => (
          <div key={attachment.id} className="relative">
            {attachment.type.startsWith('image/') && attachment.url ? (
              <div className="rounded-xl overflow-hidden border border-border/50 shadow-premium hover-lift">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-w-[200px] max-h-[200px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => window.open(attachment.url, '_blank')}
                />
                <div className="px-3 py-1.5 bg-muted/50 text-xs text-muted-foreground truncate max-w-[200px]">
                  {attachment.name}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-muted rounded-xl border border-border/50 hover-lift">
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
        "group flex gap-4 px-4 py-5 sm:py-6 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row",
        message.isError && "bg-destructive/5 rounded-2xl mx-2 my-1"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105",
          isUser
            ? "bg-gradient-navy text-primary-foreground"
            : message.isError
            ? "bg-destructive/10 text-destructive"
            : "bg-gradient-gold text-navy-dark"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : message.isError ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0 space-y-2", isUser && "text-right")}>
        <div className={cn("flex items-center gap-2", isUser && "justify-end")}>
          <span className="font-medium text-sm text-foreground">
            {isUser ? 'You' : "Mohamed's AI"}
          </span>
          {message.isStreaming && (
            <span className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
              </span>
              <span className="text-muted-foreground/60 font-medium">thinking</span>
            </span>
          )}
        </div>

        {/* Attachments */}
        {isUser && (
          <div className="flex justify-end">
            {renderAttachments()}
          </div>
        )}

        <div className={cn(
          "text-foreground rounded-2xl",
          !isUser && "bg-muted/40 px-4 py-3 mr-8",
          isUser && "inline-block text-left"
        )}>
          {renderContent()}
        </div>

        {/* Actions */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 rounded-lg hover:bg-muted"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 rounded-lg hover:bg-muted"
                onClick={onRegenerate}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};