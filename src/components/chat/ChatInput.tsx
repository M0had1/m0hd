import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Image, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSend, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Generate previews for image files
  useEffect(() => {
    const newPreviews: string[] = [];
    attachments.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newPreviews.push(url);
      } else {
        newPreviews.push('');
      }
    });
    setPreviews(newPreviews);

    return () => {
      newPreviews.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [attachments]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!message.trim() && attachments.length === 0) || isLoading) return;
    onSend(message, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments((prev) => [...prev, ...files].slice(0, 10)); // Max 10 files
    }
    e.target.value = ''; // Reset input
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-xl p-2 sm:p-4">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.txt,.csv,.json,.xml,.md"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*"
      />

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-1 sm:px-0">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="relative group flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm"
              >
                {file.type.startsWith('image/') && previews[index] ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={previews[index]}
                      alt={file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div className="flex flex-col">
                      <span className="truncate max-w-[120px] text-xs font-medium">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="truncate max-w-[120px] text-xs font-medium">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 glass rounded-2xl p-2">
          {/* Attachment buttons */}
          <div className="flex items-center gap-1 pb-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => imageInputRef.current?.click()}
              title="Attach image"
            >
              <Image className="h-4 w-4" />
            </Button>
          </div>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Mohamed's AI..."
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground",
              "focus:outline-none py-2 px-1 max-h-[200px]",
              "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            )}
            disabled={isLoading}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-1 pb-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="icon-sm"
              disabled={(!message.trim() && attachments.length === 0) || isLoading}
              className={cn(
                "h-8 w-8 rounded-xl transition-all",
                (message.trim() || attachments.length > 0) && !isLoading ? "opacity-100" : "opacity-50"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2 sm:mt-3 px-2">
          Mohamed's AI may make mistakes. Consider verifying important information.
        </p>
      </form>
    </div>
  );
};
