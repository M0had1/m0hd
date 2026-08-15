import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Download, FileJson, FileText, MessageSquare, Sparkles, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { exportAllAsCSV, exportAllAsJSON, exportAllAsMarkdown } from '@/lib/bulkExport';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

const Insights = () => {
  const navigate = useNavigate();
  const { conversations, isInitialized } = useChat();

  const stats = useMemo(() => {
    const allMessages = conversations.flatMap(c => c.messages);
    const userMessages = allMessages.filter(m => m.role === 'user');
    const assistantMessages = allMessages.filter(m => m.role === 'assistant');
    const totalChars = allMessages.reduce((sum, m) => sum + m.content.length, 0);

    const counts = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      counts.set(dayKey(d), 0);
    }
    for (const message of allMessages) {
      const key = dayKey(new Date(message.timestamp));
      if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
    }

    const chartData = Array.from(counts.entries()).map(([key, value]) => ({
      day: key.slice(5),
      messages: value,
    }));

    const busiest = [...conversations]
      .map(c => ({ id: c.id, title: c.title, count: c.messages.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      conversationCount: conversations.length,
      messageCount: allMessages.length,
      userCount: userMessages.length,
      assistantCount: assistantMessages.length,
      avgPerConversation: conversations.length
        ? Math.round(allMessages.length / conversations.length)
        : 0,
      wordsWritten: Math.round(totalChars / 5),
      chartData,
      busiest,
    };
  }, [conversations]);

  const cards = [
    { label: 'Conversations', value: stats.conversationCount, icon: MessageSquare },
    { label: 'Total messages', value: stats.messageCount, icon: BarChart3 },
    { label: 'Your prompts', value: stats.userCount, icon: Sparkles },
    { label: 'Avg. msgs / chat', value: stats.avgPerConversation, icon: Table2 },
  ];

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="h-14 border-b border-border/50 bg-background/60 backdrop-blur-xl flex items-center gap-3 px-4">
        <Button variant="ghost" size="icon-sm" aria-label="Back to chat" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold">Usage insights</h1>
      </header>

      <ScrollArea className="h-[calc(100dvh-3.5rem)]">
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map(card => (
              <Card key={card.label} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <card.icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{card.label}</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Messages over the last 14 days</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} fontSize={11} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Busiest conversations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {stats.busiest.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {isInitialized ? 'No conversations yet.' : 'Loading…'}
                  </p>
                )}
                {stats.busiest.map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigate('/')}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/60"
                  >
                    <span className="truncate pr-3">{item.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.count} msgs</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Download className="h-4 w-4" /> Bulk export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Download every conversation ({stats.conversationCount}) in one file.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" size="sm" disabled={!conversations.length} onClick={() => exportAllAsMarkdown(conversations)}>
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Markdown
                  </Button>
                  <Button variant="outline" size="sm" disabled={!conversations.length} onClick={() => exportAllAsJSON(conversations)}>
                    <FileJson className="mr-1.5 h-3.5 w-3.5" /> JSON
                  </Button>
                  <Button variant="outline" size="sm" disabled={!conversations.length} onClick={() => exportAllAsCSV(conversations)}>
                    <Table2 className="mr-1.5 h-3.5 w-3.5" /> CSV
                  </Button>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  Approx. {stats.wordsWritten.toLocaleString()} words exchanged across {stats.messageCount} messages.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Insights;
