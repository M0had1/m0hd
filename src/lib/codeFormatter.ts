import * as prettier from 'prettier';
import prettierPluginBabel from 'prettier/plugins/babel';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettierPluginHtml from 'prettier/plugins/html';
import prettierPluginCss from 'prettier/plugins/postcss';
import prettierPluginMarkdown from 'prettier/plugins/markdown';
import prettierPluginTypescript from 'prettier/plugins/typescript';

type SupportedLanguage = 
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'scss'
  | 'less'
  | 'json'
  | 'markdown'
  | 'yaml';

const parserMap: Record<SupportedLanguage, string> = {
  javascript: 'babel',
  typescript: 'typescript',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  markdown: 'markdown',
  yaml: 'yaml',
};

const supportedLanguages = Object.keys(parserMap);

export const isFormattingSupported = (language: string): boolean => {
  return supportedLanguages.includes(language);
};

export const formatCode = async (
  code: string,
  language: string
): Promise<{ formatted: string; error: string | null }> => {
  if (!isFormattingSupported(language)) {
    return { 
      formatted: code, 
      error: `Formatting not supported for ${language}` 
    };
  }

  try {
    const parser = parserMap[language as SupportedLanguage];
    
    const plugins = [
      prettierPluginBabel,
      prettierPluginEstree,
      prettierPluginHtml,
      prettierPluginCss,
      prettierPluginMarkdown,
      prettierPluginTypescript,
    ];

    const formatted = await prettier.format(code, {
      parser,
      plugins,
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 80,
      bracketSpacing: true,
      arrowParens: 'avoid',
    });

    return { formatted, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown formatting error';
    return { formatted: code, error: errorMessage };
  }
};

export const getSupportedLanguages = (): string[] => supportedLanguages;
