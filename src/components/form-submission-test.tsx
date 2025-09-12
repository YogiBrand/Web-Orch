/**
 * Test Form Submission Component - Minimal version to test functionality
 */

import React, { useState } from 'react';

export default function FormSubmissionTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');

  const testSubmission = async () => {
    setIsLoading(true);
    setResult('');
    
    try {
      console.log('🧪 Testing form submission...');
      
      const response = await fetch('/api/form-submission/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          url: 'https://example.com/contact',
          customData: { name: 'Test User', email: 'test@example.com' },
          agentId: 'hybrid-ai'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Form submission successful:', data);
      setResult(`Success! Job ID: ${data.id}, Status: ${data.status}`);
      
    } catch (error) {
      console.error('❌ Form submission failed:', error);
      setResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🧪 Form Submission Test</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              This is a minimal test component to verify form submission functionality.
            </p>
          </div>
          
          <button
            onClick={testSubmission}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Testing...' : 'Test Form Submission'}
          </button>
          
          {result && (
            <div className={`p-4 rounded-lg ${result.startsWith('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="font-mono text-sm">{result}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}