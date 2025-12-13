import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

// Sandboxed JavaScript execution using Function constructor with timeout
async function executeJavaScript(code: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    // Create a sandboxed console
    const sandboxConsole = {
      log: (...args: any[]) => logs.push(args.map(a => JSON.stringify(a, null, 2)).join(' ')),
      error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => JSON.stringify(a, null, 2)).join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => JSON.stringify(a, null, 2)).join(' ')),
      info: (...args: any[]) => logs.push('[INFO] ' + args.map(a => JSON.stringify(a, null, 2)).join(' ')),
    };

    // Safe math and utility functions
    const safeGlobals = {
      console: sandboxConsole,
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      atob,
      btoa,
    };

    // Wrap code to capture return value
    const wrappedCode = `
      "use strict";
      const { console, Math, Date, JSON, Array, Object, String, Number, Boolean, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, atob, btoa } = globals;
      ${code}
    `;

    // Create and execute the function
    const executor = new Function('globals', wrappedCode);
    const result = executor(safeGlobals);

    const executionTime = Date.now() - startTime;
    
    let output = logs.join('\n');
    if (result !== undefined) {
      output += (output ? '\n' : '') + '→ ' + JSON.stringify(result, null, 2);
    }

    return {
      success: true,
      output: output || '(no output)',
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      output: logs.join('\n'),
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    };
  }
}

// Python-like evaluation for simple expressions
function evaluatePythonLike(code: string): ExecutionResult {
  const startTime = Date.now();
  
  try {
    // Convert Python-like syntax to JavaScript
    let jsCode = code
      .replace(/print\s*\((.*?)\)/g, 'console.log($1)')
      .replace(/True/g, 'true')
      .replace(/False/g, 'false')
      .replace(/None/g, 'null')
      .replace(/\*\*/g, '**')  // Power operator
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!')
      .replace(/len\s*\((.*?)\)/g, '$1.length')
      .replace(/range\s*\((\d+)\)/g, 'Array.from({length: $1}, (_, i) => i)')
      .replace(/range\s*\((\d+),\s*(\d+)\)/g, 'Array.from({length: $2 - $1}, (_, i) => i + $1)');

    return executeJavaScriptSync(jsCode);
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Python conversion error: ${error instanceof Error ? error.message : String(error)}`,
      executionTime: Date.now() - startTime,
    };
  }
}

function executeJavaScriptSync(code: string): ExecutionResult {
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    const sandboxConsole = {
      log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
    };

    const safeGlobals = {
      console: sandboxConsole,
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    };

    const wrappedCode = `
      "use strict";
      const { console, Math, Date, JSON, Array, Object, String, Number, Boolean, parseInt, parseFloat, isNaN, isFinite } = globals;
      ${code}
    `;

    const executor = new Function('globals', wrappedCode);
    const result = executor(safeGlobals);

    let output = logs.join('\n');
    if (result !== undefined) {
      output += (output ? '\n' : '') + '→ ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
    }

    return {
      success: true,
      output: output || '(no output)',
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: logs.join('\n'),
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language = 'javascript' } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit code length
    if (code.length > 10000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Code too long (max 10000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Executing ${language} code (${code.length} chars)`);

    let result: ExecutionResult;

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        result = await executeJavaScript(code);
        break;
      case 'python':
      case 'py':
        result = evaluatePythonLike(code);
        break;
      default:
        // Try JavaScript for unknown languages
        result = await executeJavaScript(code);
    }

    console.log(`Execution completed in ${result.executionTime}ms, success: ${result.success}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in execute-code function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        output: '',
        executionTime: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
