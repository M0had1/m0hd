import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import { Conversation } from '@/types/chat';
import { useModelSelection } from '@/hooks/useModelSelection';
import { usePersonas } from '@/hooks/usePersonas';
import {
  BarChart3, Columns2, FolderCode, MessageSquare, Moon, Plus, Sun, Code2, Smartphone,
} from 'lucide-react';

interface ChatCommandPaletteProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export const ChatCommandPalette = ({
  conversations, onSelectConversation, onNewChat, onToggleTheme, isDark,
}: ChatCommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { models, selectedModel, setSelectedModel } = useModelSelection();
  const { personas, activeId, setActiveId } = usePersonas();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search conversations, switch model, jump anywhere…" />
      <CommandList className="max-h-[65vh]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(onNewChat)}>
            <Plus className="mr-2 h-4 w-4" /> New chat
          </CommandItem>
          <CommandItem onSelect={() => run(onToggleTheme)}>
            {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Switch to {isDark ? 'light' : 'dark'} theme
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/compare'))}>
            <Columns2 className="mr-2 h-4 w-4" /> Compare models side by side
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/insights'))}>
            <BarChart3 className="mr-2 h-4 w-4" /> Usage insights &amp; bulk export
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/ide'))}>
            <FolderCode className="mr-2 h-4 w-4" /> Open Code IDE
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/playground'))}>
            <Code2 className="mr-2 h-4 w-4" /> Open Code Playground
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate('/install'))}>
            <Smartphone className="mr-2 h-4 w-4" /> Install app
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Personas">
          {personas.map(persona => (
            <CommandItem key={persona.id} onSelect={() => run(() => setActiveId(persona.id))}>
              <span className="mr-2" aria-hidden>{persona.emoji}</span>
              {persona.name}
              {activeId === persona.id && <span className="ml-auto text-xs text-primary">active</span>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Models">
          {models.map(model => (
            <CommandItem key={model.id} onSelect={() => run(() => setSelectedModel(model.id))}>
              <span className="truncate">{model.name}</span>
              {selectedModel === model.id && <span className="ml-auto text-xs text-primary">active</span>}
            </CommandItem>
          ))}
        </CommandGroup>

        {conversations.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Conversations">
              {conversations.slice(0, 30).map(conversation => (
                <CommandItem
                  key={conversation.id}
                  value={`${conversation.title} ${conversation.id}`}
                  onSelect={() => run(() => onSelectConversation(conversation.id))}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span className="truncate">{conversation.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};
