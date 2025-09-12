import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, Check } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";

export function CodeEditor() {
  const [language, setLanguage] = useState("javascript");
  const [isRunning, setIsRunning] = useState(false);
  const [code, setCode] = useState(getDefaultCode());
  const editorRef = useRef<HTMLTextAreaElement>(null);
  
  const { sendMessage } = useWebSocket();

  function getDefaultCode() {
    return `import { Browser, Page } from 'puppeteer';

export default async function automateForm(page: Page) {
  await page.goto('https://example.com/form');
  await page.waitForSelector('#email');
  await page.type('#email', 'test@example.com');
  await page.click('#submit');
}

// Orchestrator Configuration
const orchestrator = {
  llmModel: 'gpt-4',
  parallelSessions: 3,
  urls: [
    'https://form1.example.com',
    'https://form2.example.com',
  ]
};`;
  }

  const handleRunScript = async () => {
    if (isRunning) {
      setIsRunning(false);
      return;
    }

    setIsRunning(true);
    
    try {
      const response = await fetch('/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      
      if (response.ok) {
        sendMessage({ type: 'script_started', code, language });
      }
    } catch (error) {
      console.error('Failed to execute script:', error);
    } finally {
      setTimeout(() => setIsRunning(false), 3000);
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.height = 'auto';
      editorRef.current.style.height = editorRef.current.scrollHeight + 'px';
    }
  }, [code]);

  return (
    <div className="bg-white flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleRunScript}
            className={`px-3 py-1 text-sm font-medium ${
              isRunning 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-primary hover:bg-primary/90"
            }`}
            data-testid="button-run-script"
          >
            {isRunning ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run
              </>
            )}
          </Button>
          
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32" data-testid="select-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Auto-save</span>
          <Check className="w-3 h-3 text-accent" />
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 relative code-editor-container">
        <div className="absolute inset-0 bg-gray-900 text-gray-100 font-mono text-sm overflow-hidden">
          <div className="flex h-full">
            {/* Line Numbers */}
            <div className="w-12 bg-gray-800 text-gray-500 text-right pr-2 py-4 text-xs leading-5 select-none">
              {code.split('\n').map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            
            {/* Code Area */}
            <div className="flex-1 relative">
              <textarea
                ref={editorRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="absolute inset-0 bg-transparent text-gray-100 p-4 resize-none outline-none font-mono text-sm leading-5 w-full h-full"
                spellCheck={false}
                data-testid="textarea-code-editor"
                style={{
                  fontFamily: 'var(--font-mono)',
                  tabSize: 2,
                }}
              />
              
              {/* Syntax highlighting overlay (simplified) */}
              <div className="absolute inset-0 p-4 pointer-events-none font-mono text-sm leading-5 whitespace-pre-wrap">
                {code.split('\n').map((line, index) => (
                  <div key={index} className="opacity-0">
                    {line || ' '}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
