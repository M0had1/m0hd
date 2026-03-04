import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Search, ChevronDown, ChevronRight, ArrowLeft,
  MessageSquare, User, Trash2, Clock, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface AdminConversation {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_email?: string;
  user_name?: string;
}

interface AdminMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    if (user) checkAdmin();
  }, [user]);

  // Load all profiles (admin RLS allows this)
  useEffect(() => {
    const loadUsers = async () => {
      if (!isAdmin) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('created_at', { ascending: false });
      setUsers(data || []);
    };
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  // Load all conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!isAdmin) return;
      setLoadingData(true);
      const { data } = await supabase
        .from('conversations')
        .select('id, title, user_id, created_at, updated_at, deleted_at')
        .order('updated_at', { ascending: false });

      if (data) {
        // Enrich with user info
        const enriched = data.map((conv: any) => {
          const u = users.find(u => u.id === conv.user_id);
          return { ...conv, user_email: u?.email, user_name: u?.full_name };
        });
        setConversations(enriched);
      }
      setLoadingData(false);
    };
    if (isAdmin && users.length > 0) loadConversations();
  }, [isAdmin, users]);

  // Load messages for selected conversation
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversationId) { setMessages([]); return; }
      const { data } = await supabase
        .from('messages')
        .select('id, role, content, created_at, deleted_at')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    loadMessages();
  }, [selectedConversationId]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    setSelectedUserId(userId);
  };

  const filteredUsers = searchQuery.trim()
    ? users.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const getUserConversations = (userId: string) =>
    conversations.filter(c => c.user_id === userId);

  const selectedConv = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Users & Conversations */}
      <div className="w-80 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon-sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-sm">Admin Dashboard</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {filteredUsers.map((u) => {
              const userConvs = getUserConversations(u.id);
              const isExpanded = expandedUsers.has(u.id);
              const deletedCount = userConvs.filter(c => c.deleted_at).length;

              return (
                <div key={u.id}>
                  <button
                    onClick={() => toggleUser(u.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-xs",
                      selectedUserId === u.id ? "bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{u.full_name || 'No name'}</p>
                      <p className="truncate text-muted-foreground text-[0.65rem]">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[0.6rem] h-4 px-1.5">
                      {userConvs.length}
                    </Badge>
                    {deletedCount > 0 && (
                      <Badge variant="destructive" className="text-[0.6rem] h-4 px-1.5">
                        <Trash2 className="h-2.5 w-2.5 mr-0.5" />{deletedCount}
                      </Badge>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-5 pl-3 border-l border-border/50 space-y-0.5 py-1">
                      {userConvs.length === 0 ? (
                        <p className="text-[0.65rem] text-muted-foreground px-2 py-1">No conversations</p>
                      ) : (
                        userConvs.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => setSelectedConversationId(conv.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-[0.7rem]",
                              selectedConversationId === conv.id ? "bg-primary/10" : "hover:bg-muted/30",
                              conv.deleted_at && "opacity-60"
                            )}
                          >
                            <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate flex-1">{conv.title}</span>
                            {conv.deleted_at && (
                              <Trash2 className="h-3 w-3 text-destructive shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <p className="text-[0.65rem] text-muted-foreground text-center">
            {users.length} users · {conversations.length} conversations
          </p>
        </div>
      </div>

      {/* Main Content - Messages */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId && selectedConv ? (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Eye className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">{selectedConv.title}</h2>
                <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                  <span>{selectedConv.user_email}</span>
                  <span>·</span>
                  <span>{format(new Date(selectedConv.created_at), 'MMM d, yyyy h:mm a')}</span>
                  {selectedConv.deleted_at && (
                    <Badge variant="destructive" className="text-[0.6rem] h-4 px-1.5">
                      <Trash2 className="h-2.5 w-2.5 mr-0.5" />
                      Deleted {format(new Date(selectedConv.deleted_at), 'MMM d')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' && "flex-row-reverse",
                      msg.deleted_at && "opacity-50"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[0.6rem] font-bold",
                      msg.role === 'assistant' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {msg.role === 'user' ? 'U' : 'AI'}
                    </div>
                    <div className={cn(
                      "flex-1 text-xs rounded-xl p-3 max-w-[80%]",
                      msg.role === 'assistant' ? "bg-muted/50" : "bg-primary/10"
                    )}>
                      <pre className="whitespace-pre-wrap break-words font-sans">{msg.content}</pre>
                      <div className="flex items-center gap-2 mt-1.5 text-[0.6rem] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {format(new Date(msg.created_at), 'h:mm a')}
                        {msg.deleted_at && (
                          <Badge variant="destructive" className="text-[0.55rem] h-3.5 px-1">Deleted</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Admin Dashboard</p>
              <p className="text-xs mt-1">Select a user and conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
