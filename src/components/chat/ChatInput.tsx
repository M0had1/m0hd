import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image, X, Square, Camera, Phone, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CameraCapture } from './CameraCapture';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  onStop?: () => void;
  isLoading: boolean;
  onStartVoiceCall?: () => void;
  isVoiceSupported?: boolean;
}

export const ChatInput = ({ onSend, onStop, isLoading, onStartVoiceCall, isVoiceSupported }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    const newPreviews: string[] = [];
    attachments.forEach((file) => {
      if (file.type.startsWith('image/')) {
        newPreviews.push(URL.createObjectURL(file));
      } else {
        newPreviews.push('');
      }
    });
    setPreviews(newPreviews);
    return () => { newPreviews.forEach((url) => { if (url) URL.revokeObjectURL(url); }); };
  }, [attachments]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!message.trim() && attachments.length === 0) || isLoading) return;
    onSend(message, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) setAttachments((prev) => [...prev, ...files].slice(0, 10));
    e.target.value = '';
  };

  const removeAttachment = (index: number) => setAttachments((prev) => prev.filter((_, i) => i !== index));
  const handleCameraCapture = (file: File) => setAttachments((prev) => [...prev, file].slice(0, 10));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasContent = message.trim() || attachments.length > 0;

  return (
    <div className="bg-gradient-to-t from-background via-background to-background/0 pt-6 pb-4 px-3 sm:px-4">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt,.csv,.json,.xml,.md" />
      <input ref={imageInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*" />

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 animate-fade-in">
            {attachments.map((file, index) => (
              <div key={index} className="relative group flex items-center gap-2 px-3 py-2.5 bg-card rounded-xl text-sm border border-border/50">
                {file.type.startsWith('image/') && previews[index] ? (
                  <div className="flex items-center gap-2.5">
                    <img src={previews[index]} alt={file.name} className="w-10 h-10 object-cover rounded-lg" />
                    <div className="flex flex-col">
                      <span className="truncate max-w-[120px] text-xs font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="truncate max-w-[120px] text-xs font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={cn(
          "relative flex items-end gap-1.5 rounded-2xl p-2 sm:p-2.5 transition-all duration-300",
          "bg-card border border-border/60",
          isFocused && "border-primary/40 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] bg-card"
        )}>
          {/* Attachment buttons */}
          <div className="flex items-center gap-0.5 pb-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl" onClick={() => imageInputRef.current?.click()}>
                  <Image className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach image</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl" onClick={() => setIsCameraOpen(true)}>
                  <Camera className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Take photo</TooltipContent>
            </Tooltip>
          </div>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none py-1.5 sm:py-2 px-1 max-h-[120px] text-sm sm:text-[0.9375rem]"
            disabled={isLoading}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-1 pb-0.5">
            {isVoiceSupported && onStartVoiceCall && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-xl" onClick={onStartVoiceCall}>
                    <Phone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Start voice call</TooltipContent>
              </Tooltip>
            )}
            {isLoading && onStop ? (
              <Button type="button" variant="destructive" size="icon-sm" onClick={onStop} className="h-9 w-9 rounded-xl">
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon-sm"
                disabled={!hasContent || isLoading}
                className={cn(
                  "h-9 w-9 rounded-xl transition-all duration-200",
                  hasContent && !isLoading
                    ? "bg-primary text-primary-foreground shadow-sm hover:shadow-md"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-[0.7rem] text-muted-foreground/50 text-center mt-3">
          Mohamed's AI may produce inaccurate results. Verify important information.
        </p>
      </form>

      <CameraCapture open={isCameraOpen} onOpenChange={setIsCameraOpen} onCapture={handleCameraCapture} />
    </div>
  );
};
