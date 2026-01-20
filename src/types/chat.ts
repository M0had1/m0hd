export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string; // For image previews
  content?: string; // For text content or base64 image data
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
}
