import { Conversation, Message } from '@/types/chat';

const formatDate = (date: Date) => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMessageContent = (content: string): string => {
  // Clean up markdown for plain text export
  return content
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, '').trim();
      return `[Code Block]\n${code}\n[End Code Block]`;
    })
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1');
};

export const exportAsMarkdown = (conversation: Conversation): string => {
  const lines: string[] = [];
  
  lines.push(`# ${conversation.title}`);
  lines.push('');
  lines.push(`*Exported on ${formatDate(new Date())}*`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const message of conversation.messages) {
    const role = message.role === 'user' ? '**You**' : '**Assistant**';
    const time = formatDate(message.timestamp);
    
    lines.push(`### ${role} — ${time}`);
    lines.push('');
    lines.push(message.content);
    lines.push('');
    
    if (message.attachments?.length) {
      lines.push('*Attachments:*');
      for (const att of message.attachments) {
        lines.push(`- ${att.name} (${att.type})`);
      }
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
};

export const exportAsText = (conversation: Conversation): string => {
  const lines: string[] = [];
  
  lines.push(`${conversation.title}`);
  lines.push(`Exported on ${formatDate(new Date())}`);
  lines.push('');
  lines.push('='.repeat(50));
  lines.push('');

  for (const message of conversation.messages) {
    const role = message.role === 'user' ? 'You' : 'Assistant';
    const time = formatDate(message.timestamp);
    
    lines.push(`[${role}] - ${time}`);
    lines.push('');
    lines.push(formatMessageContent(message.content));
    lines.push('');
    
    if (message.attachments?.length) {
      lines.push('Attachments:');
      for (const att of message.attachments) {
        lines.push(`  - ${att.name} (${att.type})`);
      }
      lines.push('');
    }
    
    lines.push('-'.repeat(50));
    lines.push('');
  }

  return lines.join('\n');
};

export const exportAsJSON = (conversation: Conversation): string => {
  const exportData = {
    title: conversation.title,
    exportedAt: new Date().toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      attachments: msg.attachments?.map(att => ({
        name: att.name,
        type: att.type,
        size: att.size,
      })),
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportConversation = (
  conversation: Conversation,
  format: 'markdown' | 'text' | 'json'
) => {
  const sanitizedTitle = conversation.title
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 50);
  const timestamp = new Date().toISOString().split('T')[0];
  
  switch (format) {
    case 'markdown':
      const md = exportAsMarkdown(conversation);
      downloadFile(md, `${sanitizedTitle}_${timestamp}.md`, 'text/markdown');
      break;
    case 'text':
      const txt = exportAsText(conversation);
      downloadFile(txt, `${sanitizedTitle}_${timestamp}.txt`, 'text/plain');
      break;
    case 'json':
      const json = exportAsJSON(conversation);
      downloadFile(json, `${sanitizedTitle}_${timestamp}.json`, 'application/json');
      break;
  }
};
