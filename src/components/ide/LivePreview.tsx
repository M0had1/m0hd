import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileNode } from '@/types/ide';

interface LivePreviewProps {
  files: FileNode[];
  fileContents: Map<string, string>;
  activeFile: string | null;
}

// Flatten tree -> path map
const flatten = (nodes: FileNode[]): FileNode[] => {
  const out: FileNode[] = [];
  const walk = (ns: FileNode[]) => {
    for (const n of ns) {
      if (n.type === 'file') out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out;
};

// Resolve relative path against a base path
const resolvePath = (base: string, rel: string): string => {
  if (/^(https?:)?\/\//i.test(rel) || rel.startsWith('data:') || rel.startsWith('blob:')) {
    return rel;
  }
  const baseParts = base.split('/').slice(0, -1);
  const relParts = rel.replace(/^\.?\//, '').split('/');
  for (const p of relParts) {
    if (p === '..') baseParts.pop();
    else if (p !== '.' && p !== '') baseParts.push(p);
  }
  return baseParts.join('/');
};

const mimeFor = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'text/html', htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript', mjs: 'application/javascript',
    json: 'application/json',
    svg: 'image/svg+xml',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  };
  return map[ext] || 'text/plain';
};

// Strip PHP blocks so a .php file at least previews its static HTML shell.
// Handles unclosed <?php ... (no ?> before EOF), which is common in pure-PHP files.
const stripPhp = (src: string) => {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('<?', i);
    if (open === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, open);
    const close = src.indexOf('?>', open + 2);
    if (close === -1) {
      // Unclosed PHP block — drop the rest of the file
      out += '<!-- php block removed for preview -->';
      break;
    }
    out += '<!-- php block removed for preview -->';
    i = close + 2;
  }
  return out;
};

export const LivePreview = ({ files, fileContents, activeFile }: LivePreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const allFiles = useMemo(() => flatten(files), [files]);

  // Pick an entry file: active if html/php, else index.html, else first html/php
  const entryPath = useMemo(() => {
    const htmlish = (p: string) => /\.(html?|php)$/i.test(p);
    if (activeFile && htmlish(activeFile)) return activeFile;
    const index = allFiles.find(f => /(^|\/)index\.html?$/i.test(f.path));
    if (index) return index.path;
    const anyHtml = allFiles.find(f => htmlish(f.path));
    return anyHtml?.path || null;
  }, [activeFile, allFiles]);

  const isPhp = entryPath ? /\.php$/i.test(entryPath) : false;

  // Build srcDoc with rewritten resource URLs (blob URLs from sibling files)
  const { srcDoc, blobUrls } = useMemo(() => {
    const urls: string[] = [];
    if (!entryPath) return { srcDoc: '', blobUrls: urls };

    const raw = fileContents.get(entryPath) ?? '';
    let html = isPhp ? stripPhp(raw) : raw;

    // Rewrite href/src attributes that reference local files
    html = html.replace(
      /\b(href|src)\s*=\s*(['"])([^'"]+)\2/gi,
      (match, attr, quote, url) => {
        if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('blob:')) {
          return match;
        }
        const resolved = resolvePath(entryPath, url);
        const content = fileContents.get(resolved);
        if (content === undefined) return match;
        const blob = new Blob([content], { type: mimeFor(resolved) });
        const blobUrl = URL.createObjectURL(blob);
        urls.push(blobUrl);
        return `${attr}=${quote}${blobUrl}${quote}`;
      }
    );

    // Inject a base so relative links resolve at least visually
    if (!/<base\s/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, m => `${m}\n<base href="about:blank">`);
    }

    return { srcDoc: html, blobUrls: urls };
  }, [entryPath, fileContents, isPhp, reloadKey]);

  // Clean up blob URLs when preview changes
  useEffect(() => {
    return () => {
      blobUrls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [blobUrls]);

  const openInNewTab = () => {
    const blob = new Blob([srcDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="h-9 border-b border-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Live Preview
          </span>
          {entryPath && (
            <span className="text-xs text-muted-foreground truncate">· {entryPath}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setReloadKey(k => k + 1)}
            disabled={!entryPath}
            title="Reload"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={openInNewTab}
            disabled={!entryPath}
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isPhp && (
        <div className="px-3 py-2 border-b border-border bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            PHP runs on a server, not in the browser. This preview shows the static HTML shell — PHP blocks are stripped.
          </span>
        </div>
      )}

      <div className="flex-1 bg-white">
        {entryPath ? (
          <iframe
            key={reloadKey}
            ref={iframeRef}
            title="Live preview"
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground bg-background">
            Open or add an .html file to see a live preview.
          </div>
        )}
      </div>
    </div>
  );
};
