import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Loader2, Terminal, Code2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript", icon: "JS" },
  { value: "python", label: "Python", icon: "PY" },
];

const CODE_EXAMPLES = {
  javascript: `// JavaScript Example
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);

const sum = numbers.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);

// Return a result
({ doubled, sum });`,
  python: `# Python Example
numbers = [1, 2, 3, 4, 5]
doubled = [n * 2 for n in numbers]
print("Doubled:", doubled)

total = sum(numbers)
print("Sum:", total)`,
};

export default function Playground() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(CODE_EXAMPLES.javascript);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(CODE_EXAMPLES[lang as keyof typeof CODE_EXAMPLES] || "");
    setOutput("");
    setExecutionTime(null);
  };

  const runCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter some code to run");
      return;
    }

    setIsRunning(true);
    setOutput("");
    setExecutionTime(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("execute-code", {
        body: { code, language },
        headers: session?.access_token 
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      setExecutionTime(result.executionTime);

      if (result.success) {
        setOutput(result.output || "(no output)");
      } else {
        setOutput(`Error: ${result.error}\n${result.output || ""}`);
      }
    } catch (error) {
      console.error("Execution error:", error);
      setOutput(`Failed to execute code: ${error instanceof Error ? error.message : "Unknown error"}`);
      toast.error("Failed to execute code");
    } finally {
      setIsRunning(false);
    }
  };

  const clearOutput = () => {
    setOutput("");
    setExecutionTime(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Code Playground</h1>
            </div>
          </div>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {lang.icon}
                    </span>
                    {lang.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
          {/* Code Editor */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Editor
                </CardTitle>
                <Button onClick={runCode} disabled={isRunning} size="sm">
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Code
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Write your code here..."
                className="h-full min-h-[400px] font-mono text-sm resize-none bg-muted/50"
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {/* Output */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Output
                  {executionTime !== null && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      ({executionTime}ms)
                    </span>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearOutput}
                  disabled={!output}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <div className="h-full min-h-[400px] bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-auto">
                {isRunning ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing...
                  </div>
                ) : output ? (
                  <pre className="whitespace-pre-wrap break-words">{output}</pre>
                ) : (
                  <span className="text-muted-foreground">
                    Click "Run Code" to see the output here
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
