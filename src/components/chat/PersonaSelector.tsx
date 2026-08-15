import { useState } from 'react';
import { Check, Plus, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePersonas } from '@/hooks/usePersonas';
import { cn } from '@/lib/utils';

export const PersonaSelector = () => {
  const { personas, activePersona, activeId, setActiveId, addPersona, deletePersona } = usePersonas();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🧠');
  const [prompt, setPrompt] = useState('');

  const handleCreate = () => {
    if (!name.trim() || !prompt.trim()) return;
    addPersona({ name: name.trim(), emoji: emoji.trim() || '🧠', prompt: prompt.trim() });
    setName('');
    setEmoji('🧠');
    setPrompt('');
    setOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Select persona"
            className="h-8 gap-1.5 rounded-xl px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <span aria-hidden>{activePersona.emoji}</span>
            <span className="hidden sm:inline max-w-[8rem] truncate">{activePersona.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-h-[60vh] overflow-y-auto">
          <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
            Persona
          </DropdownMenuLabel>
          {personas.map(persona => (
            <DropdownMenuItem
              key={persona.id}
              className="gap-2.5"
              onSelect={() => setActiveId(persona.id)}
            >
              <span aria-hidden>{persona.emoji}</span>
              <span className={cn('flex-1 truncate', activeId === persona.id && 'font-semibold')}>
                {persona.name}
              </span>
              {activeId === persona.id && <Check className="h-3.5 w-3.5 text-primary" />}
              {!persona.builtIn && (
                <button
                  type="button"
                  aria-label={`Delete ${persona.name}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    deletePersona(persona.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2.5" onSelect={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New persona
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4" /> Create a persona
            </DialogTitle>
            <DialogDescription>
              Personas add style instructions on top of your AI settings for every new message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20 space-y-2">
                <Label htmlFor="persona-emoji">Icon</Label>
                <Input id="persona-emoji" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="persona-name">Name</Label>
                <Input
                  id="persona-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Startup Advisor"
                  maxLength={40}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="persona-prompt">Instructions</Label>
              <Textarea
                id="persona-prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Act as a blunt startup advisor who challenges assumptions and asks for numbers."
                rows={5}
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || !prompt.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
