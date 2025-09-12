import React from 'react';
import { NoVNCViewer } from './novnc-viewer';

interface BrowserPreviewProps {
  sessionId?: string;
  vncUrl?: string;
  token?: string;
  autoConnect?: boolean;
}

export function BrowserPreview({ 
  sessionId = 'demo-session',
  vncUrl,
  token,
  autoConnect = false 
}: BrowserPreviewProps) {
  return (
    <div className="bg-gray-50 flex flex-col h-full p-4">
      <NoVNCViewer
        sessionId={sessionId}
        vncUrl={vncUrl}
        token={token}
        autoConnect={autoConnect}
        onConnectionChange={(status) => {
          console.log(`Browser preview connection status: ${status}`);
        }}
        onScreenshot={(blob) => {
          console.log('Screenshot captured:', blob.size, 'bytes');
        }}
        onFullscreen={(isFullscreen) => {
          console.log(`Fullscreen mode: ${isFullscreen}`);
        }}
      />
    </div>
  );
}