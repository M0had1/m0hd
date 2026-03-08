import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Shield, Search, ChevronDown, ChevronRight, ArrowLeft,
  MessageSquare, User, Trash2, Clock, Eye, Users, BarChart3,
  Brain, RefreshCw, Ban, Undo2, Database, Activity, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, subDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  avatar_url: string | null;
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

interface AdminMemory {
  id: string;
  user_id: string;
  key: string;
  value: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Component ───────────────────────────────────────────────────
const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [memories, setMemories] = useState<AdminMemory[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // ─── Admin check ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  // ─── Load data ────────────────────────────────────
  const loadAllData = async () => {
    if (!isAdmin) return;
    setLoadingData(true);
    try {
      const [profilesRes, convsRes, memoriesRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, created_at, avatar_url').order('created_at', { ascending: false }),
        supabase.from('conversations').select('id, title, user_id, created_at, updated_at, deleted_at').order('updated_at', { ascending: false }),
        supabase.from('user_memories').select('*').order('updated_at', { ascending: false }),
      ]);

      const loadedUsers = profilesRes.data || [];
      setUsers(loadedUsers);
      setMemories(memoriesRes.data || []);

      if (convsRes.data) {
        const enriched = convsRes.data.map((conv: any) => {
          const u = loadedUsers.find((u: AdminUser) => u.id === conv.user_id);
          return { ...conv, user_email: u?.email, user_name: u?.full_name };
        });
        setConversations(enriched);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadAllData();
  }, [isAdmin]);

  // ─── Messages for selected conversation ───────────
  useEffect(() => {
    if (!selectedConversationId) { setMessages([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, role, content, created_at, deleted_at')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    load();
  }, [selectedConversationId]);

  // ─── Analytics / stats ────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const day7 = subDays(now, 7);
    const day30 = subDays(now, 30);

    const activeConvs = conversations.filter(c => !c.deleted_at);
    const deletedConvs = conversations.filter(c => c.deleted_at);
    const recentConvs = activeConvs.filter(c => isAfter(new Date(c.created_at), day7));
    const recentUsers = users.filter(u => u.created_at && isAfter(new Date(u.created_at), day30));

    // Messages per user
    const convsPerUser: Record<string, number> = {};
    for (const c of activeConvs) {
      convsPerUser[c.user_id] = (convsPerUser[c.user_id] || 0) + 1;
    }

    const topUsers = Object.entries(convsPerUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([uid, count]) => {
        const u = users.find(u => u.id === uid);
        return { id: uid, name: u?.full_name || u?.email || 'Unknown', count };
      });

    return {
      totalUsers: users.length,
      totalConversations: activeConvs.length,
      deletedConversations: deletedConvs.length,
      totalMemories: memories.length,
      recentConversations7d: recentConvs.length,
      newUsers30d: recentUsers.length,
      topUsers,
    };
  }, [users, conversations, memories]);

  // ─── Actions ──────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleHardDeleteConversation = async (convId: string) => {
    const { error: msgErr } = await supabase.from('messages').delete().eq('conversation_id', convId);
    if (msgErr) { toast.error('Failed to delete messages'); return; }
    const { error: convErr } = await supabase.from('conversations').delete().eq('id', convId);
    if (convErr) { toast.error('Failed to delete conversation'); return; }
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (selectedConversationId === convId) {
      setSelectedConversationId(null);
      setMessages([]);
    }
    toast.success('Conversation permanently deleted');
  };

  const handleRestoreConversation = async (convId: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ deleted_at: null })
      .eq('id', convId);
    if (error) { toast.error('Failed to restore'); return; }
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, deleted_at: null } : c));
    toast.success('Conversation restored');
  };

  const handleDeleteMemory = async (memId: string) => {
    const { error } = await supabase.from('user_memories').delete().eq('id', memId);
    if (error) { toast.error('Failed to delete memory'); return; }
    setMemories(prev => prev.filter(m => m.id !== memId));
    toast.success('Memory deleted');
  };

  // ─── Guard ────────────────────────────────────────
  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  // ─── Helpers ──────────────────────────────────────
  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
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
  const selectedUserMemories = selectedUserId
    ? memories.filter(m => m.user_id === selectedUserId)
    : [];

  // ─── Render ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar ────────────────────────────── */}
      <div className="w-80 border-r border-border flex flex-col bg-sidebar shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-sm flex-1">Admin Panel</h1>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
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
                    <Badge variant="secondary" className="text-[0.6rem] h-4 px-1.5">{userConvs.length}</Badge>
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
                            onClick={() => {
                              setSelectedConversationId(conv.id);
                              setActiveTab('conversation');
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-[0.7rem]",
                              selectedConversationId === conv.id ? "bg-primary/10" : "hover:bg-muted/30",
                              conv.deleted_at && "opacity-60"
                            )}
                          >
                            <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate flex-1">{conv.title}</span>
                            {conv.deleted_at && <Trash2 className="h-3 w-3 text-destructive shrink-0" />}
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
            {users.length} users · {conversations.length} conversations · {memories.length} memories
          </p>
        </div>
      </div>

      {/* ── Main content ───────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-border px-4">
            <TabsList className="h-10 bg-transparent">
              <TabsTrigger value="overview" className="text-xs gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="conversation" className="text-xs gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Conversation
              </TabsTrigger>
              <TabsTrigger value="memories" className="text-xs gap-1.5">
                <Brain className="h-3.5 w-3.5" /> Memories
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" /> Users
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Overview Tab ─── */}
          <TabsContent value="overview" className="flex-1 p-6 overflow-auto m-0">
            <h2 className="text-lg font-bold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`+${stats.newUsers30d} this month`} />
              <StatCard icon={MessageSquare} label="Active Conversations" value={stats.totalConversations} sub={`+${stats.recentConversations7d} this week`} />
              <StatCard icon={Trash2} label="Deleted Conversations" value={stats.deletedConversations} variant="destructive" />
              <StatCard icon={Brain} label="User Memories" value={stats.totalMemories} />
            </div>

            <h3 className="font-semibold text-sm mb-3">Top Users by Conversations</h3>
            <div className="space-y-2">
              {stats.topUsers.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 text-xs">
                  <span className="font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                  <span className="flex-1 truncate font-medium">{u.name}</span>
                  <Badge variant="secondary" className="text-[0.65rem]">{u.count} chats</Badge>
                </div>
              ))}
              {stats.topUsers.length === 0 && (
                <p className="text-xs text-muted-foreground">No data yet.</p>
              )}
            </div>
          </TabsContent>

          {/* ── Conversation Tab ─── */}
          <TabsContent value="conversation" className="flex-1 flex flex-col m-0 overflow-hidden">
            {selectedConversationId && selectedConv ? (
              <>
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Eye className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-sm truncate">{selectedConv.title}</h2>
                    <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground flex-wrap">
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
                  <div className="flex gap-1.5 shrink-0">
                    {selectedConv.deleted_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleRestoreConversation(selectedConv.id)}
                      >
                        <Undo2 className="h-3 w-3" /> Restore
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-7 text-xs gap-1">
                          <Ban className="h-3 w-3" /> Delete Forever
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently delete this conversation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the conversation and all its messages. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleHardDeleteConversation(selectedConv.id)}
                          >
                            Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                    {messages.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-8">No messages in this conversation.</p>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No conversation selected</p>
                  <p className="text-xs mt-1">Select a conversation from the sidebar</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Memories Tab ─── */}
          <TabsContent value="memories" className="flex-1 overflow-auto m-0 p-6">
            <h2 className="text-lg font-bold mb-4">User Memories</h2>
            {selectedUserId ? (
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Showing memories for: <span className="font-medium text-foreground">{users.find(u => u.id === selectedUserId)?.email || selectedUserId}</span>
                  <span className="ml-2">({selectedUserMemories.length} memories)</span>
                </p>
                {selectedUserMemories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No memories stored for this user.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedUserMemories.map(mem => (
                      <div key={mem.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 text-xs group">
                        <Database className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{mem.key}</span>
                            {mem.category && (
                              <Badge variant="outline" className="text-[0.6rem] h-4 px-1.5">{mem.category}</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground break-words">{mem.value}</p>
                          <p className="text-[0.6rem] text-muted-foreground mt-1">
                            Updated {formatDistanceToNow(new Date(mem.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the memory "{mem.key}" for this user.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDeleteMemory(mem.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Select a user from the sidebar</p>
                <p className="text-xs mt-1">to view and manage their stored memories</p>
              </div>
            )}
          </TabsContent>

          {/* ── Users Tab ─── */}
          <TabsContent value="users" className="flex-1 overflow-auto m-0 p-6">
            <h2 className="text-lg font-bold mb-4">All Users ({users.length})</h2>
            <div className="space-y-1">
              {users.map(u => {
                const userConvCount = conversations.filter(c => c.user_id === u.id && !c.deleted_at).length;
                const userMemCount = memories.filter(m => m.user_id === u.id).length;
                return (
                  <div
                    key={u.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg text-xs transition-colors cursor-pointer",
                      selectedUserId === u.id ? "bg-primary/10" : "hover:bg-muted/30"
                    )}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setExpandedUsers(prev => new Set(prev).add(u.id));
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.full_name || 'No name'}</p>
                      <p className="text-muted-foreground truncate text-[0.65rem]">{u.email}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[0.6rem] h-4 px-1.5 gap-0.5">
                        <MessageSquare className="h-2.5 w-2.5" />{userConvCount}
                      </Badge>
                      <Badge variant="outline" className="text-[0.6rem] h-4 px-1.5 gap-0.5">
                        <Brain className="h-2.5 w-2.5" />{userMemCount}
                      </Badge>
                    </div>
                    {u.created_at && (
                      <span className="text-[0.6rem] text-muted-foreground shrink-0">
                        Joined {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  variant,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  variant?: 'destructive';
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", variant === 'destructive' ? "text-destructive" : "text-primary")} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", variant === 'destructive' ? "text-destructive" : "text-foreground")}>{value}</p>
      {sub && <p className="text-[0.65rem] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default Admin;
