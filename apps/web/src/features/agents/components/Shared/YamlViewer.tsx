```typescript
import React from 'react';
import yaml from 'js-yaml';

interface YamlViewerProps {
  data: any;
}

export function YamlViewer({ data }: YamlViewerProps) {
  const yamlString = React.useMemo(() => {
    try {
      return yaml.dump(data, { indent: 2, skipInvalid: true });
    } catch (e) {
      console.error("Error converting to YAML:", e);
      return "Error: Could not generate YAML preview.";
    }
  }, [data]);

  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
      <pre className="text-green-400 whitespace-pre-wrap break-all">
        {yamlString}
      </pre>
    </div>
  );
}
```