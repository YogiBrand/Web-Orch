import { CodeEditor } from "./code-editor";
import { BrowserPreview } from "./browser-preview";

export function Playground() {
  return (
    <div className="flex-1 flex">
      <div className="w-1/2 border-r border-gray-200">
        <CodeEditor />
      </div>
      <div className="w-1/2">
        <BrowserPreview />
      </div>
    </div>
  );
}


