import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Columns2, Loader2, Send, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useModelSelection } from '@/hooks/useModelSelection';
import { streamChat } from '@/lib/streamChat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Lane {
  modelId: string;
  content: string;
  status: 'idle' | 'streaming' | 'done' | 'error';
  error?: string;
  ms?: number;
}

const MAX_LANES = 3;

const Compare = () => {
  const navigate = useNavigate();
  const { models, selectedModel } = useModelSelection();
  const [prompt, setPrompt] = useState('');
  const [lanes, setLanes] = useState<Lane[]>([
    { modelId: selectedModel, content: '', status: 'idle' },
    { modelId: models.find(m => m.id !== selectedModel)?.id || models[1].id, content: '', status: 'idle' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const modelName = (id: string) => models.find(m => m.id === id)?.name || id;

  const setLane = (index: number, patch: Partial<Lane>) => {
    setLanes(prev => prev.map((lane, i) => (i === index ? { ...lane, ...patch } : lane)));
  };

  const run = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      toast.error('You must be signed in to compare models.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setLanes(prev => prev.map(lane => ({ ...lane, content: '', status: 'streaming', error: undefined, ms: undefined })));

    const currentLanes = lanes;
    await Promise.all(
      currentLanes.map(async (lane, index) => {
        const startedAt = performance.now();
        try {
          await streamChat({
            prompt,
            model: lane.modelId,
            accessToken,
            signal: controller.signal,
            onDelta: full => setLane(index, { content: full }),
          });
          setLane(index, { status: 'done', ms: Math.round(performance.now() - startedAt) });
        } catch (error) {
          if (controller.signal.aborted) {
            setLane(index, { status: 'idle' });
            return;
          }
          setLane(index, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Request failed',
          });
        }
      })
    );

    setIsRunning(false);
    abortRef.current = null;
  }, [isRunning, lanes, prompt]);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-background/60 px-4 backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" aria-label="Back to chat" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Columns2 className="h-4 w-4 text-primary" />
        <h1 className="text-sm font-semibold">Model comparison</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          {lanes.length} of {MAX_LANES} models
        </span>
        {lanes.length < MAX_LANES && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() =>
              setLanes(prev => [
                ...prev,
                {
                  modelId: models.find(m => !prev.some(l => l.modelId === m.id))?.id || models[0].id,
                  content: '',
                  status: 'idle',
                },
              ])
            }
          >
            Add model
          </Button>
        )}
      </header>

      <div className="grid flex-1 gap-3 overflow-hidden p-3 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
        {lanes.map((lane, index) => (
          <Card key={index} className="glass-card flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border/40 py-2.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 max-w-[12rem] justify-start truncate px-2 text-xs font-semibold">
                    {modelName(lane.modelId)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-[60vh] w-64 overflow-y-auto">
                  {models.map(model => (
                    <DropdownMenuItem key={model.id} onSelect={() => setLane(index, { modelId: model.id })}>
                      <span className="flex-1 truncate">{model.name}</span>
                      {lane.modelId === model.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <CardTitle className="sr-only">{modelName(lane.modelId)} response</CardTitle>

              {lane.status === 'streaming' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              {lane.status === 'done' && lane.ms != null && (
                <span className="text-[0.65rem] text-muted-foreground tabular-nums">{(lane.ms / 1000).toFixed(1)}s</span>
              )}
              {lanes.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove model"
                  className="ml-auto h-6 w-6"
                  onClick={() => setLanes(prev => prev.filter((_, i) => i !== index))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-0">
              <ScrollArea className="h-full">
                <div className="whitespace-pre-wrap p-4 text-sm leading-relaxed">
                  {lane.status === 'error' ? (
                    <span className="text-destructive">{lane.error}</span>
                  ) : lane.content ? (
                    lane.content
                  ) : (
                    <span className="text-muted-foreground">
                      {lane.status === 'streaming' ? 'Waiting for tokens…' : 'Run a prompt to see this model’s answer.'}
                    </span>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="shrink-0 border-t border-border/50 bg-background/70 p-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-end gap-2">
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                run();
              }
            }}
            placeholder="Ask every selected model the same question…"
            rows={2}
            className={cn('resize-none rounded-xl')}
          />
          {isRunning ? (
            <Button variant="destructive" size="icon" aria-label="Stop" onClick={stop}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" aria-label="Run comparison" disabled={!prompt.trim()} onClick={run}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Compare;
