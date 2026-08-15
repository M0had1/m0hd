import { Conversation } from '@/types/chat';
import { exportAsMarkdown, exportAsJSON, downloadFile } from '@/lib/exportConversation';

const stamp = () => new Date().toISOString().slice(0, 10);

export const exportAllAsMarkdown = (conversations: Conversation[]) => {
  const body = conversations
    .map(conv => exportAsMarkdown(conv))
    .join('\n\n\n');
  const header = `# Chat archive\n\n${conversations.length} conversations exported on ${new Date().toLocaleString()}\n\n---\n\n`;
  downloadFile(header + body, `chat-archive-${stamp()}.md`, 'text/markdown');
};

export const exportAllAsJSON = (conversations: Conversation[]) => {
  const payload = {
    exportedAt: new Date().toISOString(),
    conversationCount: conversations.length,
    conversations: conversations.map(conv => JSON.parse(exportAsJSON(conv))),
  };
  downloadFile(JSON.stringify(payload, null, 2), `chat-archive-${stamp()}.json`, 'application/json');
};

export const exportAllAsCSV = (conversations: Conversation[]) => {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = ['conversation,role,timestamp,characters,content'];
  for (const conv of conversations) {
    for (const msg of conv.messages) {
      rows.push(
        [
          escape(conv.title),
          msg.role,
          new Date(msg.timestamp).toISOString(),
          String(msg.content.length),
          escape(msg.content),
        ].join(',')
      );
    }
  }
  downloadFile(rows.join('\n'), `chat-archive-${stamp()}.csv`, 'text/csv');
};
