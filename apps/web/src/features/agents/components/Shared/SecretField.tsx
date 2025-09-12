```typescript
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input'; // Assuming Radix UI Input is wrapped or directly used

interface SecretFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SecretField({ value, onChange, placeholder, disabled }: SecretFieldProps) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="relative">
      <Input
        type={showSecret ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10" // Add padding for the eye icon
      />
      <button
        type="button"
        onClick={() => setShowSecret(!showSecret)}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        disabled={disabled}
      >
        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
```