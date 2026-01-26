import { useEffect, useCallback } from 'react';

interface UseIDEKeyboardProps {
  onSave?: () => void;
  onQuickOpen?: () => void;
  onCommandPalette?: () => void;
  onToggleSidebar?: () => void;
  onToggleAI?: () => void;
  onSearch?: () => void;
  onCloseTab?: () => void;
}

export const useIDEKeyboard = ({
  onSave,
  onQuickOpen,
  onCommandPalette,
  onToggleSidebar,
  onToggleAI,
  onSearch,
  onCloseTab,
}: UseIDEKeyboardProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd + S - Save
    if (modKey && e.key === 's') {
      e.preventDefault();
      onSave?.();
      return;
    }

    // Ctrl/Cmd + P - Quick file open
    if (modKey && e.key === 'p' && !e.shiftKey) {
      e.preventDefault();
      onQuickOpen?.();
      return;
    }

    // Ctrl/Cmd + Shift + P - Command palette
    if (modKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      onCommandPalette?.();
      return;
    }

    // Ctrl/Cmd + B - Toggle sidebar
    if (modKey && e.key === 'b') {
      e.preventDefault();
      onToggleSidebar?.();
      return;
    }

    // Ctrl/Cmd + J - Toggle AI
    if (modKey && e.key === 'j') {
      e.preventDefault();
      onToggleAI?.();
      return;
    }

    // Ctrl/Cmd + Shift + F - Search in files
    if (modKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      onSearch?.();
      return;
    }

    // Ctrl/Cmd + W - Close tab
    if (modKey && e.key === 'w') {
      e.preventDefault();
      onCloseTab?.();
      return;
    }
  }, [onSave, onQuickOpen, onCommandPalette, onToggleSidebar, onToggleAI, onSearch, onCloseTab]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
