import { Check, ChevronDown, Sparkles, Zap, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useModelSelection, AI_MODELS } from '@/hooks/useModelSelection';
import { cn } from '@/lib/utils';

const getModelIcon = (modelId: string) => {
  if (modelId.includes('pro') || modelId.includes('gpt-5')) {
    return Brain;
  }
  if (modelId.includes('flash')) {
    return Zap;
  }
  return Sparkles;
};

const getModelColor = (modelId: string) => {
  if (modelId.includes('gpt')) {
    return 'bg-emerald-500';
  }
  if (modelId.includes('pro')) {
    return 'bg-purple-500';
  }
  return 'bg-blue-500';
};

export const ModelSelector = () => {
  const { selectedModel, setSelectedModel, currentModel } = useModelSelection();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 px-3 text-sm gap-2">
          <span className={cn('w-2 h-2 rounded-full animate-pulse', getModelColor(selectedModel))} />
          <span className="hidden sm:inline">{currentModel.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {AI_MODELS.map((model) => {
          const Icon = getModelIcon(model.id);
          const isSelected = selectedModel === model.id;
          
          return (
            <DropdownMenuItem
              key={model.id}
              onClick={() => model.available && setSelectedModel(model.id)}
              disabled={!model.available}
              className={cn(
                'flex items-center gap-3 py-2.5',
                isSelected && 'bg-accent'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                getModelColor(model.id),
                !model.available && 'opacity-50'
              )}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{model.name}</span>
                  {isSelected && <Check className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {model.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
