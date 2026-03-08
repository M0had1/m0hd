import { useState, useEffect } from 'react';
import { Settings, User, Bot, Palette, LogOut, Save, Sparkles, Shield, Trash2, Download, Edit2, Type, Monitor, Moon, Sun } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AISettings {
  tone: string;
  personality: string;
  responseLength: string;
  customInstructions: string;
  useEmojis: boolean;
  formalLanguage: boolean;
}

interface AppearanceSettings {
  fontSize: number;
  messageDensity: string;
  chatBubbleStyle: string;
  codeFont: string;
  showTimestamps: boolean;
  animationsEnabled: boolean;
}

const defaultSettings: AISettings = {
  tone: 'friendly',
  personality: 'helpful',
  responseLength: 'balanced',
  customInstructions: '',
  useEmojis: false,
  formalLanguage: false,
};

const defaultAppearance: AppearanceSettings = {
  fontSize: 15,
  messageDensity: 'comfortable',
  chatBubbleStyle: 'modern',
  codeFont: 'jetbrains',
  showTimestamps: true,
  animationsEnabled: true,
};

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'account' | 'appearance' | 'data'>('ai');
  const [aiSettings, setAISettings] = useState<AISettings>(defaultSettings);
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearance);
  const [isSaving, setIsSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isClearingConversations, setIsClearingConversations] = useState(false);
  const [isClearingMemories, setIsClearingMemories] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Load settings from localStorage
  useEffect(() => {
    const savedAI = localStorage.getItem('ai-settings');
    if (savedAI) {
      try { setAISettings(JSON.parse(savedAI)); } catch {}
    }
    const savedAppearance = localStorage.getItem('appearance-settings');
    if (savedAppearance) {
      try { setAppearance(JSON.parse(savedAppearance)); } catch {}
    }
  }, []);

  useEffect(() => {
    setDisplayName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '');
  }, [user]);

  // Apply appearance settings live
  useEffect(() => {
    document.documentElement.style.setProperty('--chat-font-size', `${appearance.fontSize}px`);
    if (appearance.animationsEnabled) {
      document.documentElement.classList.remove('no-animations');
    } else {
      document.documentElement.classList.add('no-animations');
    }
  }, [appearance]);

  const handleSaveAISettings = () => {
    setIsSaving(true);
    localStorage.setItem('ai-settings', JSON.stringify(aiSettings));
    setTimeout(() => {
      setIsSaving(false);
      toast({ title: 'Settings saved', description: 'Your AI preferences have been updated.' });
    }, 500);
  };

  const handleSaveAppearance = () => {
    setIsSaving(true);
    localStorage.setItem('appearance-settings', JSON.stringify(appearance));
    setTimeout(() => {
      setIsSaving(false);
      toast({ title: 'Appearance saved', description: 'Your display preferences have been updated.' });
    }, 500);
  };

  const handleUpdateName = async () => {
    if (!displayName.trim()) return;
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() }
      });
      if (error) throw error;

      // Also update profiles table
      if (user?.id) {
        await supabase.from('profiles').update({ full_name: displayName.trim() }).eq('id', user.id);
      }

      setEditingName(false);
      toast({ title: 'Profile updated', description: 'Your display name has been changed.' });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleClearConversations = async () => {
    if (!user?.id) return;
    setIsClearingConversations(true);
    try {
      const { error } = await supabase.from('conversations').delete().eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Conversations cleared', description: 'All your conversations have been deleted.' });
      // Reload to reset state
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsClearingConversations(false);
    }
  };

  const handleClearMemories = async () => {
    if (!user?.id) return;
    setIsClearingMemories(true);
    try {
      const { error } = await supabase.from('user_memories').delete().eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Memories cleared', description: 'All AI memories about you have been erased.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsClearingMemories(false);
    }
  };

  const handleExportData = async () => {
    if (!user?.id) return;
    setIsExporting(true);
    try {
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`id, title, created_at, updated_at, messages (id, role, content, created_at)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: memories } = await supabase
        .from('user_memories')
        .select('key, value, category, created_at')
        .eq('user_id', user.id);

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { email: user.email, name: displayName },
        conversations: conversations || [],
        memories: memories || [],
        settings: { ai: aiSettings, appearance },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moha-ai-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Export complete', description: 'Your data has been downloaded.' });
    } catch (error: any) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  const tabs = [
    { id: 'ai' as const, label: 'AI Behavior', icon: Bot },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'data' as const, label: 'Data & Privacy', icon: Shield },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col p-0 w-[95vw] sm:w-full">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        {/* Mobile: horizontal scrollable tabs */}
        <div className="sm:hidden border-b border-border px-2 py-1.5 shrink-0 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Desktop sidebar */}
          <div className="hidden sm:block w-48 border-r border-border p-2 space-y-1 bg-muted/30 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* AI Behavior Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Customize AI Behavior
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Personalize how Mohamed's AI responds to you.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Conversation Tone</Label>
                  <Select value={aiSettings.tone} onValueChange={(v) => setAISettings({ ...aiSettings, tone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly & Casual</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic & Energetic</SelectItem>
                      <SelectItem value="calm">Calm & Soothing</SelectItem>
                      <SelectItem value="humorous">Witty & Humorous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>AI Personality</Label>
                  <Select value={aiSettings.personality} onValueChange={(v) => setAISettings({ ...aiSettings, personality: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helpful">Helpful Assistant</SelectItem>
                      <SelectItem value="mentor">Wise Mentor</SelectItem>
                      <SelectItem value="creative">Creative Companion</SelectItem>
                      <SelectItem value="analytical">Analytical Thinker</SelectItem>
                      <SelectItem value="coach">Motivational Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Response Length</Label>
                  <Select value={aiSettings.responseLength} onValueChange={(v) => setAISettings({ ...aiSettings, responseLength: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise & Brief</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="detailed">Detailed & Thorough</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Use Emojis</Label>
                      <p className="text-xs text-muted-foreground">Allow AI to use emojis in responses</p>
                    </div>
                    <Switch checked={aiSettings.useEmojis} onCheckedChange={(c) => setAISettings({ ...aiSettings, useEmojis: c })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Formal Language</Label>
                      <p className="text-xs text-muted-foreground">Use more formal language in responses</p>
                    </div>
                    <Switch checked={aiSettings.formalLanguage} onCheckedChange={(c) => setAISettings({ ...aiSettings, formalLanguage: c })} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Custom Instructions</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Add specific instructions for how the AI should respond to you.
                  </p>
                  <Textarea
                    placeholder="E.g., 'Always provide code examples in Python', 'Explain things like I'm a beginner'..."
                    value={aiSettings.customInstructions}
                    onChange={(e) => setAISettings({ ...aiSettings, customInstructions: e.target.value })}
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <Button onClick={handleSaveAISettings} disabled={isSaving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save AI Settings'}
                </Button>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                    <Palette className="h-4 w-4 text-primary" />
                    Appearance
                  </h3>
                </div>

                {/* Theme */}
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          theme === t.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <t.icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Font Size</Label>
                    <span className="text-sm text-muted-foreground">{appearance.fontSize}px</span>
                  </div>
                  <Slider
                    value={[appearance.fontSize]}
                    onValueChange={([v]) => setAppearance({ ...appearance, fontSize: v })}
                    min={12}
                    max={20}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>

                <Separator />

                {/* Message Density */}
                <div className="space-y-2">
                  <Label>Message Density</Label>
                  <Select value={appearance.messageDensity} onValueChange={(v) => setAppearance({ ...appearance, messageDensity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Chat Bubble Style */}
                <div className="space-y-2">
                  <Label>Chat Bubble Style</Label>
                  <Select value={appearance.chatBubbleStyle} onValueChange={(v) => setAppearance({ ...appearance, chatBubbleStyle: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern (Rounded)</SelectItem>
                      <SelectItem value="minimal">Minimal (Flat)</SelectItem>
                      <SelectItem value="classic">Classic (Bordered)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Code Font */}
                <div className="space-y-2">
                  <Label>Code Font</Label>
                  <Select value={appearance.codeFont} onValueChange={(v) => setAppearance({ ...appearance, codeFont: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jetbrains">JetBrains Mono</SelectItem>
                      <SelectItem value="fira">Fira Code</SelectItem>
                      <SelectItem value="source">Source Code Pro</SelectItem>
                      <SelectItem value="mono">System Monospace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Timestamps</Label>
                      <p className="text-xs text-muted-foreground">Display time on each message</p>
                    </div>
                    <Switch checked={appearance.showTimestamps} onCheckedChange={(c) => setAppearance({ ...appearance, showTimestamps: c })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Animations</Label>
                      <p className="text-xs text-muted-foreground">Enable smooth transitions and effects</p>
                    </div>
                    <Switch checked={appearance.animationsEnabled} onCheckedChange={(c) => setAppearance({ ...appearance, animationsEnabled: c })} />
                  </div>
                </div>

                <Button onClick={handleSaveAppearance} disabled={isSaving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Appearance'}
                </Button>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-4">Account Information</h3>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium">{user?.email || 'Not available'}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Display Name</Label>
                    {editingName ? (
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="h-8 text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                        />
                        <Button size="sm" onClick={handleUpdateName}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Not set'}
                        </p>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingName(true)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Member since</Label>
                    <p className="text-sm font-medium">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-semibold mb-4 text-destructive">Danger Zone</h3>
                  <Button variant="destructive" onClick={handleSignOut} className="w-full">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                    <Shield className="h-4 w-4 text-primary" />
                    Data & Privacy
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Manage your data, export information, or clear stored content.
                  </p>
                </div>

                {/* Export */}
                <div className="p-4 rounded-lg border border-border space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Your Data
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Download all your conversations, memories, and settings as a JSON file.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleExportData} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Download Export'}
                  </Button>
                </div>

                <Separator />

                {/* Clear Memories */}
                <div className="p-4 rounded-lg border border-border space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Memories
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    The AI remembers things you tell it across conversations. Clear all stored memories.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={isClearingMemories}>
                        {isClearingMemories ? 'Clearing...' : 'Clear All Memories'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear all AI memories?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently erase everything the AI has remembered about you. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearMemories} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Clear Memories
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Clear Conversations */}
                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete All Conversations
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete all your chat conversations and messages. This cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isClearingConversations}>
                        {isClearingConversations ? 'Deleting...' : 'Delete All Conversations'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete all conversations?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all your conversations and messages. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearConversations} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Reset Settings */}
                <div className="p-4 rounded-lg border border-border space-y-2">
                  <h4 className="text-sm font-semibold">Reset All Settings</h4>
                  <p className="text-xs text-muted-foreground">
                    Reset AI behavior and appearance settings to their defaults.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAISettings(defaultSettings);
                      setAppearance(defaultAppearance);
                      localStorage.removeItem('ai-settings');
                      localStorage.removeItem('appearance-settings');
                      toast({ title: 'Settings reset', description: 'All settings have been restored to defaults.' });
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
