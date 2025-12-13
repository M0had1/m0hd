import { supabase } from '@/integrations/supabase/client';

export interface UserMemory {
  id: string;
  key: string;
  value: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export async function getMemories(): Promise<UserMemory[]> {
  const { data, error } = await supabase
    .from('user_memories')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }

  return data || [];
}

export async function saveMemory(key: string, value: string, category = 'general'): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_memories')
    .upsert(
      { user_id: user.id, key, value, category },
      { onConflict: 'user_id,key' }
    );

  if (error) {
    console.error('Error saving memory:', error);
    return false;
  }

  return true;
}

export async function deleteMemory(key: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_memories')
    .delete()
    .eq('key', key);

  if (error) {
    console.error('Error deleting memory:', error);
    return false;
  }

  return true;
}

export async function getMemoriesForAI(): Promise<string> {
  const memories = await getMemories();
  
  if (memories.length === 0) {
    return '';
  }

  const grouped = memories.reduce((acc, mem) => {
    const cat = mem.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(`- ${mem.key}: ${mem.value}`);
    return acc;
  }, {} as Record<string, string[]>);

  let result = '\n\n## User Context & Preferences\n';
  for (const [category, items] of Object.entries(grouped)) {
    result += `\n### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
    result += items.join('\n');
  }

  return result;
}
