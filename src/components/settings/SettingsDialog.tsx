import { useState, useEffect } from 'react';
import { Settings, User, Bot, Palette, LogOut, Save, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

const defaultSettings: AISettings = {
  tone: 'friendly',
  personality: 'helpful',
  responseLength: 'balanced',
  customInstructions: '',
  useEmojis: false,
  formalLanguage: false,
};

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'account' | 'appearance'>('ai');
  const [aiSettings, setAISettings] = useState<AISettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('ai-settings');
    if (savedSettings) {
      try {
        setAISettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse AI settings');
      }
    }
  }, []);

  const handleSaveSettings = () => {
    setIsSaving(true);
    localStorage.setItem('ai-settings', JSON.stringify(aiSettings));
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: 'Settings saved',
        description: 'Your AI preferences have been updated.',
      });
    }, 500);
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  const tabs = [
    { id: 'ai' as const, label: 'AI Behavior', icon: Bot },
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-border p-2 space-y-1 bg-muted/30">
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
          <div className="flex-1 overflow-y-auto p-6">
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

                {/* Tone */}
                <div className="space-y-2">
                  <Label htmlFor="tone">Conversation Tone</Label>
                  <Select
                    value={aiSettings.tone}
                    onValueChange={(value) => setAISettings({ ...aiSettings, tone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly & Casual</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic & Energetic</SelectItem>
                      <SelectItem value="calm">Calm & Soothing</SelectItem>
                      <SelectItem value="humorous">Witty & Humorous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Personality */}
                <div className="space-y-2">
                  <Label htmlFor="personality">AI Personality</Label>
                  <Select
                    value={aiSettings.personality}
                    onValueChange={(value) => setAISettings({ ...aiSettings, personality: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select personality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helpful">Helpful Assistant</SelectItem>
                      <SelectItem value="mentor">Wise Mentor</SelectItem>
                      <SelectItem value="creative">Creative Companion</SelectItem>
                      <SelectItem value="analytical">Analytical Thinker</SelectItem>
                      <SelectItem value="coach">Motivational Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Response Length */}
                <div className="space-y-2">
                  <Label htmlFor="responseLength">Response Length</Label>
                  <Select
                    value={aiSettings.responseLength}
                    onValueChange={(value) => setAISettings({ ...aiSettings, responseLength: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise & Brief</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="detailed">Detailed & Thorough</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Use Emojis</Label>
                      <p className="text-xs text-muted-foreground">Allow AI to use emojis in responses</p>
                    </div>
                    <Switch
                      checked={aiSettings.useEmojis}
                      onCheckedChange={(checked) => setAISettings({ ...aiSettings, useEmojis: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Formal Language</Label>
                      <p className="text-xs text-muted-foreground">Use more formal language in responses</p>
                    </div>
                    <Switch
                      checked={aiSettings.formalLanguage}
                      onCheckedChange={(checked) => setAISettings({ ...aiSettings, formalLanguage: checked })}
                    />
                  </div>
                </div>

                <Separator />

                {/* Custom Instructions */}
                <div className="space-y-2">
                  <Label htmlFor="customInstructions">Custom Instructions</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Add specific instructions for how the AI should respond to you.
                  </p>
                  <Textarea
                    id="customInstructions"
                    placeholder="E.g., 'Always provide code examples in Python', 'Explain things like I'm a beginner', 'Focus on practical solutions'..."
                    value={aiSettings.customInstructions}
                    onChange={(e) => setAISettings({ ...aiSettings, customInstructions: e.target.value })}
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save AI Settings'}
                </Button>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-4">Account Information</h3>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium">{user?.email || 'Not available'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="text-sm font-medium">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Member since</Label>
                    <p className="text-sm font-medium">
                      {user?.created_at 
                        ? new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-semibold mb-4 text-destructive">Danger Zone</h3>
                  <Button
                    variant="destructive"
                    onClick={handleSignOut}
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-4">Appearance Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Theme can be toggled using the sun/moon icon in the chat header.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    More appearance customization options coming soon, including custom themes and font sizes.
                  </p>
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
