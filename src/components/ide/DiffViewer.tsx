import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type DiffLine = { type: 'same' | 'add' | 'remove'; text: string };

// Longest-common-subsequence line diff
export const diffLines = (before: string, after: string): DiffLine[] => {
  const a = before.split('\n');
  const b = after.split('\n');
  const m = a.length;
  const n = b.length;

  const table: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: 'same', text: a[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      result.push({ type: 'remove', text: a[i] });
      i++;
    } else {
      result.push({ type: 'add', text: b[j] });
      j++;
    }
  }
  while (i < m) result.push({ type: 'remove', text: a[i++] });
  while (j < n) result.push({ type: 'add', text: b[j++] });

  return result;
};

interface DiffViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string | null;
  before: string;
  after: string;
  onApply: () => void;
}

export const DiffViewer = ({ open, onOpenChange, fileName, before, after, onApply }: DiffViewerProps) => {
  const lines = useMemo(() => (open ? diffLines(before, after) : []), [open, before, after]);
  const added = lines.filter(l => l.type === 'add').length;
  const removed = lines.filter(l => l.type === 'remove').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review changes{fileName ? ` — ${fileName}` : ''}</DialogTitle>
          <DialogDescription>
            <span className="text-accent">+{added}</span>{' / '}
            <span className="text-destructive">-{removed}</span> lines. Apply only if this looks right.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[55vh] rounded-lg border border-border bg-muted/20">
          <pre className="p-0 text-xs leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {lines.map((line, index) => (
              <div
                key={index}
                className={cn(
                  'px-3 py-0.5 whitespace-pre-wrap break-words',
                  line.type === 'add' && 'bg-accent/15 text-accent-foreground',
                  line.type === 'remove' && 'bg-destructive/15 text-destructive'
                )}
              >
                <span className="select-none opacity-50">
                  {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}
                </span>
                {line.text || ' '}
              </div>
            ))}
          </pre>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-1.5 h-4 w-4" /> Discard
          </Button>
          <Button onClick={onApply}>
            <Check className="mr-1.5 h-4 w-4" /> Apply to file
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
