// Temporarily disabled due to complex form schema issues
// TODO: Fix form schema compatibility with base AgentConnection schema

interface AgentConfigurationModalEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: any;
  mode: "create" | "edit";
}

export function AgentConfigurationModalEnhanced({ 
  open, 
  onOpenChange, 
}: AgentConfigurationModalEnhancedProps) {
  // Temporary stub component to prevent compilation errors
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Agent Configuration</h2>
        <p className="text-gray-600 mb-4">
          This component is temporarily disabled due to schema compatibility issues.
        </p>
        <button
          onClick={() => onOpenChange(false)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
                    </div>
                  </div>
  );
}
