export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: FileNode[];
  path: string;
}

export interface IDEState {
  files: FileNode[];
  openFiles: string[]; // file paths
  activeFile: string | null;
}

export const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    php: 'php',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    xml: 'xml',
    md: 'markdown',
    markdown: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    vue: 'vue',
    svelte: 'svelte',
    dockerfile: 'dockerfile',
    env: 'plaintext',
    gitignore: 'plaintext',
    txt: 'plaintext',
  };
  return languageMap[ext] || 'plaintext';
};

export const getFileIcon = (filename: string, isFolder: boolean): string => {
  if (isFolder) return '📁';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    js: '🟨',
    jsx: '⚛️',
    ts: '🔷',
    tsx: '⚛️',
    py: '🐍',
    php: '🐘',
    html: '🌐',
    css: '🎨',
    json: '📋',
    md: '📝',
    sql: '🗃️',
    env: '🔒',
    gitignore: '🙈',
  };
  return iconMap[ext] || '📄';
};
