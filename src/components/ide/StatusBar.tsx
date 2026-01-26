import { GitBranch, FileCode, Columns, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  activeFileName: string | null;
  activeLanguage: string;
  lineCount: number;
  cursorPosition?: { line: number; column: number };
  fileCount: number;
  openFileCount: number;
}

export const StatusBar = ({
  activeFileName,
  activeLanguage,
  lineCount,
  cursorPosition,
  fileCount,
  openFileCount,
}: StatusBarProps) => {
  return (
    <div className="h-6 bg-primary/10 border-t border-border flex items-center justify-between px-3 text-xs text-muted-foreground shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>Ready</span>
        </div>
        
        {fileCount > 0 && (
          <div className="flex items-center gap-1.5">
            <FileCode className="h-3 w-3" />
            <span>{fileCount} files</span>
          </div>
        )}

        {openFileCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Columns className="h-3 w-3" />
            <span>{openFileCount} open</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {cursorPosition && (
          <span>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}

        {activeFileName && (
          <>
            <span>{lineCount} lines</span>
            <span className="capitalize">{activeLanguage}</span>
          </>
        )}

        <span className="text-muted-foreground/60">UTF-8</span>
      </div>
    </div>
  );
};
