import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Mail, Code, FileText, Lightbulb, Bug, Sparkles, BarChart, Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  icon: string;
  is_system: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  code: Code,
  'file-text': FileText,
  lightbulb: Lightbulb,
  bug: Bug,
  sparkles: Sparkles,
  'bar-chart': BarChart,
  languages: Languages,
};

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
}

export function PromptLibrary({ onSelectPrompt }: PromptLibraryProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .order('category', { ascending: true });

    if (!error && data) {
      setTemplates(data);
    }
  };

  const categories = [...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: PromptTemplate) => {
    onSelectPrompt(template.prompt);
    setOpen(false);
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || FileText;
    return Icon;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0" title="Prompt Library">
          <BookOpen className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Prompt Library
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          {/* Templates */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {filteredTemplates.map(template => {
                const Icon = getIcon(template.icon || 'file-text');
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="w-full text-left p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.title}</h4>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No prompts found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
