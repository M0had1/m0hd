import { useState, useRef, useEffect } from 'react';
import { Paperclip, Image, X, Square, Camera, Phone, ArrowUp, LoaderIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
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
    if (!isFocused) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isFocused]);

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
    <div className="relative bg-gradient-to-t from-background via-background to-background/0 pt-6 pb-4 px-3 sm:px-4">
      {/* Ambient mouse-follow glow when focused */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            className="fixed w-[40rem] h-[40rem] rounded-full pointer-events-none z-0 opacity-[0.06] bg-gradient-to-r from-primary via-primary/60 to-accent blur-[96px]"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 0.06,
              x: mousePosition.x - 320,
              y: mousePosition.y - 320,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 150, mass: 0.5 }}
          />
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt,.csv,.json,.xml,.md" />
      <input ref={imageInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*" />

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative z-10">
        {/* Attachments preview */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              className="flex flex-wrap gap-2 mb-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {attachments.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group flex items-center gap-2 px-3 py-2.5 backdrop-blur-xl bg-card/60 rounded-xl text-sm border border-border/50"
                >
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
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={cn(
            "relative flex items-end gap-1.5 rounded-2xl p-2 sm:p-2.5 transition-all duration-300",
            "backdrop-blur-2xl bg-card/70 border border-border/60 shadow-2xl",
            isFocused && "border-primary/40 bg-card/80"
          )}
        >
          {/* Animated focus ring */}
          <AnimatePresence>
            {isFocused && (
              <motion.span
                className="absolute inset-0 rounded-2xl pointer-events-none ring-2 ring-primary/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>

          {/* Attachment buttons */}
          <div className="flex items-center gap-0.5 pb-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => imageInputRef.current?.click()}
                  className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-colors"
                >
                  <Image className="h-4 w-4" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>Attach image</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setIsCameraOpen(true)}
                  className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </motion.button>
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
            className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none py-1.5 sm:py-2 px-1 max-h-[120px] text-sm sm:text-[0.9375rem] relative z-10"
            disabled={isLoading}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-1 pb-0.5 relative z-10">
            {isVoiceSupported && onStartVoiceCall && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={onStartVoiceCall}
                    className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent/50 rounded-xl transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>Start voice call</TooltipContent>
              </Tooltip>
            )}
            {isLoading && onStop ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onStop}
                className="h-9 w-9 rounded-xl bg-destructive text-destructive-foreground inline-flex items-center justify-center shadow-md"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                whileHover={hasContent ? { scale: 1.03 } : undefined}
                whileTap={hasContent ? { scale: 0.96 } : undefined}
                disabled={!hasContent || isLoading}
                className={cn(
                  "h-9 w-9 rounded-xl inline-flex items-center justify-center transition-all duration-200",
                  hasContent && !isLoading
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isLoading ? (
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </motion.button>
            )}
          </div>
        </motion.div>

        <p className="text-[0.7rem] text-muted-foreground/50 text-center mt-3">
          Mohamed's AI may produce inaccurate results. Verify important information.
        </p>
      </form>

      <CameraCapture open={isCameraOpen} onOpenChange={setIsCameraOpen} onCapture={handleCameraCapture} />
    </div>
  );
};
