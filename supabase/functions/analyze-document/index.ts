import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  success: boolean;
  analysis: string;
  metadata?: {
    fileType: string;
    fileName: string;
    fileSize: number;
    extractedText?: string;
    structuredData?: any;
  };
  error?: string;
}

// Parse CSV content
function parseCSV(content: string): { headers: string[]; rows: string[][]; summary: string } {
  const lines = content.trim().split('\n');
  const headers = lines[0]?.split(',').map(h => h.trim().replace(/^"|"$/g, '')) || [];
  const rows = lines.slice(1).map(line => 
    line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
  );

  return {
    headers,
    rows,
    summary: `CSV with ${headers.length} columns and ${rows.length} rows. Columns: ${headers.join(', ')}`,
  };
}

// Parse JSON content
function parseJSON(content: string): { data: any; summary: string } {
  const data = JSON.parse(content);
  const type = Array.isArray(data) ? 'array' : typeof data;
  let summary = '';

  if (Array.isArray(data)) {
    summary = `JSON array with ${data.length} items`;
    if (data.length > 0 && typeof data[0] === 'object') {
      summary += `. Sample keys: ${Object.keys(data[0]).slice(0, 5).join(', ')}`;
    }
  } else if (typeof data === 'object') {
    const keys = Object.keys(data);
    summary = `JSON object with ${keys.length} keys: ${keys.slice(0, 10).join(', ')}`;
  } else {
    summary = `JSON ${type} value`;
  }

  return { data, summary };
}

// Parse code files
function parseCode(content: string, extension: string): { language: string; summary: string; structure: string[] } {
  const languageMap: Record<string, string> = {
    js: 'JavaScript',
    ts: 'TypeScript',
    tsx: 'TypeScript React',
    jsx: 'JavaScript React',
    py: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    go: 'Go',
    rs: 'Rust',
    rb: 'Ruby',
    php: 'PHP',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
  };

  const language = languageMap[extension] || extension.toUpperCase();
  const lines = content.split('\n');
  const structure: string[] = [];

  // Extract functions/classes for common languages
  const functionPatterns = [
    /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{)/g,
    /(?:def|class|async def)\s+(\w+)/g,
    /(?:public|private|protected)?\s*(?:static)?\s*(?:void|int|string|boolean|\w+)\s+(\w+)\s*\(/g,
  ];

  for (const pattern of functionPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1] && !structure.includes(match[1])) {
        structure.push(match[1]);
      }
    }
  }

  return {
    language,
    summary: `${language} file with ${lines.length} lines`,
    structure: structure.slice(0, 20),
  };
}

// Analyze markdown
function parseMarkdown(content: string): { headers: string[]; wordCount: number; summary: string } {
  const headers = content.match(/^#{1,6}\s+.+$/gm)?.map(h => h.replace(/^#+\s*/, '')) || [];
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  return {
    headers: headers.slice(0, 10),
    wordCount,
    summary: `Markdown document with ${wordCount} words and ${headers.length} sections`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, fileName, fileType, fileSize, analysisType = 'full' } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Content is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!fileName || typeof fileName !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'fileName is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (content.length > 500000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Content too large (max 500KB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (fileName.length > 255 || /[\/\\]/.test(fileName)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing document: ${fileName} (${fileType}, ${fileSize} bytes)`);

    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    let analysis = '';
    let structuredData: any = null;

    // Parse based on file type
    if (extension === 'csv') {
      const parsed = parseCSV(content);
      structuredData = { headers: parsed.headers, rowCount: parsed.rows.length };
      analysis = `**CSV Analysis:**\n${parsed.summary}\n\n**First 5 rows:**\n`;
      analysis += '| ' + parsed.headers.join(' | ') + ' |\n';
      analysis += '| ' + parsed.headers.map(() => '---').join(' | ') + ' |\n';
      parsed.rows.slice(0, 5).forEach(row => {
        analysis += '| ' + row.join(' | ') + ' |\n';
      });
    } else if (extension === 'json') {
      try {
        const parsed = parseJSON(content);
        structuredData = parsed.data;
        analysis = `**JSON Analysis:**\n${parsed.summary}\n\n**Preview:**\n\`\`\`json\n${JSON.stringify(parsed.data, null, 2).slice(0, 2000)}\n\`\`\``;
      } catch {
        analysis = `**JSON Parse Error:** Invalid JSON format\n\nRaw content preview:\n\`\`\`\n${content.slice(0, 500)}\n\`\`\``;
      }
    } else if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php', 'sql'].includes(extension)) {
      const parsed = parseCode(content, extension);
      structuredData = { language: parsed.language, functions: parsed.structure };
      analysis = `**${parsed.language} Code Analysis:**\n${parsed.summary}\n\n`;
      if (parsed.structure.length > 0) {
        analysis += `**Functions/Classes found:** ${parsed.structure.join(', ')}\n\n`;
      }
      analysis += `**Code Preview:**\n\`\`\`${extension}\n${content.slice(0, 2000)}\n\`\`\``;
    } else if (['md', 'markdown'].includes(extension)) {
      const parsed = parseMarkdown(content);
      structuredData = { headers: parsed.headers, wordCount: parsed.wordCount };
      analysis = `**Markdown Analysis:**\n${parsed.summary}\n\n`;
      if (parsed.headers.length > 0) {
        analysis += `**Sections:** ${parsed.headers.join(', ')}\n\n`;
      }
      analysis += `**Content Preview:**\n${content.slice(0, 2000)}`;
    } else if (['html', 'xml'].includes(extension)) {
      const tagCount = (content.match(/<[a-z][^>]*>/gi) || []).length;
      analysis = `**${extension.toUpperCase()} Analysis:**\nDocument with approximately ${tagCount} tags\n\n**Preview:**\n\`\`\`${extension}\n${content.slice(0, 2000)}\n\`\`\``;
    } else {
      // Generic text analysis
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter((w: string) => w.length > 0).length;
      analysis = `**Text Document Analysis:**\n- Lines: ${lines}\n- Words: ${words}\n- Characters: ${content.length}\n\n**Content Preview:**\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\``;
    }

    const result: AnalysisResult = {
      success: true,
      analysis,
      metadata: {
        fileType: fileType || extension,
        fileName,
        fileSize,
        structuredData,
      },
    };

    console.log(`Document analysis completed for ${fileName}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-document function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        analysis: '',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
