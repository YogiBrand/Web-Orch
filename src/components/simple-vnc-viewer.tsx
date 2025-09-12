import React, { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Play, 
  Pause, 
  Camera, 
  Maximize, 
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';

interface SimpleVNCViewerProps {
  sessionId: string;
  agentId?: string;
  interactive?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export function SimpleVNCViewer({ 
  sessionId, 
  agentId = 'skyvern',
  interactive = false,
  onConnectionChange 
}: SimpleVNCViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine VNC URL based on agent type
  const getVNCUrl = () => {
    // Map agent IDs to their VNC ports
    const agentVNCPorts: Record<string, number> = {
      'skyvern': 5901,
      'browser-use': 5903,
      'computer-use-claude': 5901,
      'computer-use-openai': 5904,
      'puppeteer': 5905,
      'selenium-grid': 5900
    };

    const vncPort = agentVNCPorts[agentId] || 5901;
    
    // Use noVNC web client if available
    // This assumes noVNC is running on port 6080 (standard port)
    return `http://localhost:6080/vnc.html?host=localhost&port=${vncPort}&autoconnect=true&resize=scale&view_only=${!interactive}`;
  };

  useEffect(() => {
    // Simulate connection after a short delay
    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsConnected(true);
      onConnectionChange?.(true);
    }, 1000);

    return () => {
      clearTimeout(timer);
      onConnectionChange?.(false);
    };
  }, [sessionId]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = getVNCUrl();
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      iframeRef.current.requestFullscreen?.();
    }
  };

  const handleScreenshot = () => {
    // This would need to be implemented with server-side support
    console.log('Screenshot functionality not yet implemented');
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Session: {sessionId} | Agent: {agentId}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={handleScreenshot}>
            <Camera className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleFullscreen}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* VNC Display */}
      <div className="flex-1 relative bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-white">
              <RefreshCw className="h-8 w-8 animate-spin mb-2 mx-auto" />
              <p className="text-sm">Connecting to browser session...</p>
            </div>
          </div>
        )}
        
        {/* Iframe for noVNC web client */}
        <iframe
          ref={iframeRef}
          src={getVNCUrl()}
          className="w-full h-full border-0"
          onLoad={() => {
            setIsLoading(false);
            setIsConnected(true);
          }}
          onError={() => {
            setIsLoading(false);
            setIsConnected(false);
          }}
          allow="fullscreen"
          title="VNC Browser Session"
        />
        
        {/* Fallback if iframe doesn't load */}
        {!isLoading && !isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <WifiOff className="h-12 w-12 mb-4 mx-auto text-gray-400" />
              <p className="text-lg mb-2">Unable to connect to browser session</p>
              <p className="text-sm text-gray-400 mb-4">
                Make sure the VNC server is running on the agent
              </p>
              <Button onClick={handleRefresh} variant="secondary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Mode Indicator */}
      {interactive && (
        <div className="p-2 bg-blue-50 border-t text-center">
          <p className="text-xs text-blue-600">
            Interactive mode enabled - You can control the browser
          </p>
        </div>
      )}
    </div>
  );
}