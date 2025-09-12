import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Monitor, AlertCircle, Play, CheckCircle, XCircle } from 'lucide-react';

interface TaskStreamPreviewProps {
  taskId: string;
  provider: 'skyvern' | 'browser-use' | 'local';
  className?: string;
}

interface StreamData {
  screenshotUrl?: string;
  recordingUrl?: string;
  liveUrl?: string;
  status?: string;
  progress?: number;
  currentAction?: string;
  error?: string;
}

export function TaskStreamPreview({ taskId, provider, className = '' }: TaskStreamPreviewProps) {
  const [streamData, setStreamData] = useState<StreamData>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (!taskId || !provider) return;
    
    // Connect to task streaming WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const envWs = import.meta.env.VITE_WS_BASE_URL;
    const base = envWs ?? `${protocol}//${window.location.host}/ws`;
    const wsUrl = `${base}/tasks`;
    
    console.log(`[TaskStreamPreview] Connecting to ${wsUrl} for ${provider} task ${taskId}`);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('[TaskStreamPreview] WebSocket connected');
      setIsConnected(true);
      setIsLoading(false);
      
      // Subscribe to task updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        taskId,
        provider
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[TaskStreamPreview] Received:', data.type);
        
        switch (data.type) {
          case 'subscribed':
            console.log(`[TaskStreamPreview] Successfully subscribed to task ${taskId}`);
            break;
            
          case 'task-update':
            setStreamData(prev => ({
              ...prev,
              status: data.task.status,
              progress: data.task.progress,
              error: data.task.error
            }));
            break;
            
          case 'screenshot':
            setStreamData(prev => ({
              ...prev,
              screenshotUrl: data.url
            }));
            break;
            
          case 'recording':
            setStreamData(prev => ({
              ...prev,
              recordingUrl: data.url
            }));
            break;
            
          case 'live-preview':
            setStreamData(prev => ({
              ...prev,
              liveUrl: data.url
            }));
            break;
            
          case 'action':
            setStreamData(prev => ({
              ...prev,
              currentAction: `${data.action.type}: ${data.action.details || ''}`
            }));
            break;
            
          case 'task-complete':
            console.log(`[TaskStreamPreview] Task completed with status: ${data.status}`);
            setStreamData(prev => ({
              ...prev,
              status: data.status
            }));
            break;
            
          case 'error':
            console.error('[TaskStreamPreview] Error:', data.message);
            setStreamData(prev => ({
              ...prev,
              error: data.message
            }));
            break;
        }
      } catch (error) {
        console.error('[TaskStreamPreview] Failed to parse message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[TaskStreamPreview] WebSocket error:', error);
      setIsConnected(false);
      setStreamData(prev => ({
        ...prev,
        error: 'Connection error'
      }));
    };
    
    ws.onclose = () => {
      console.log('[TaskStreamPreview] WebSocket disconnected');
      setIsConnected(false);
    };
    
    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [taskId, provider]);
  
  const getStatusIcon = () => {
    switch (streamData.status) {
      case 'running':
        return <Play className="h-4 w-4 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };
  
  const getStatusColor = () => {
    switch (streamData.status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Live Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            {streamData.status && (
              <Badge className={`${getStatusColor()} text-white`}>
                <span className="flex items-center gap-1">
                  {getStatusIcon()}
                  {streamData.status}
                </span>
              </Badge>
            )}
            {isConnected ? (
              <Badge variant="outline" className="text-green-600">
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">
                Disconnected
              </Badge>
            )}
          </div>
        </div>
        {streamData.currentAction && (
          <p className="text-xs text-muted-foreground mt-1">
            {streamData.currentAction}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="p-0 h-[calc(100%-4rem)]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Connecting to stream...</p>
            </div>
          </div>
        ) : streamData.error ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="text-sm text-red-600">{streamData.error}</p>
            </div>
          </div>
        ) : streamData.liveUrl ? (
          // Browser-Use live preview URL
          <iframe
            ref={iframeRef}
            src={streamData.liveUrl}
            className="w-full h-full border-0"
            title="Browser Preview"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : streamData.recordingUrl ? (
          // Skyvern recording URL
          <video
            src={streamData.recordingUrl}
            controls
            autoPlay
            muted
            loop
            className="w-full h-full object-contain bg-black"
          />
        ) : streamData.screenshotUrl ? (
          // Static screenshot
          <img
            src={streamData.screenshotUrl}
            alt="Task screenshot"
            className="w-full h-full object-contain bg-gray-50"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Monitor className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">
                {provider === 'skyvern' ? 'Waiting for Skyvern preview...' :
                 provider === 'browser-use' ? 'Waiting for Browser-Use preview...' :
                 'No preview available'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}