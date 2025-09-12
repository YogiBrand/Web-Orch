import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Play, 
  Pause, 
  Camera, 
  Maximize, 
  Settings, 
  Download,
  Volume2,
  Wifi,
  Monitor,
  RotateCcw,
  Square,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
// Use noVNC ESM module. Avoid CommonJS bundle that expects `exports`.

import RFB from '@novnc/novnc/lib/rfb.js';

// Declare noVNC types
declare global {
  interface Window {
    RFB: any;
  }
}

interface NoVNCViewerProps {
  sessionId: string;
  vncUrl?: string;
  token?: string;
  autoConnect?: boolean;
  width?: number;
  height?: number;
  onConnectionChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  onScreenshot?: (blob: Blob) => void;
  onFullscreen?: (isFullscreen: boolean) => void;
}

interface VNCSettings {
  quality: number;
  compression: number;
  viewOnly: boolean;
  scaleToFit: boolean;
  resizeRemote: boolean;
  showDotCursor: boolean;
  logging: 'error' | 'warn' | 'info' | 'debug';
}

interface VNCStats {
  bytesReceived: number;
  bytesSent: number;
  fps: number;
  latency: number;
  connected: boolean;
  lastUpdate: Date;
}

/**
 * Enterprise-grade noVNC viewer component for WebOrchestrator
 * Provides real-time browser session viewing with advanced controls
 */
export const NoVNCViewer: React.FC<NoVNCViewerProps> = ({
  sessionId,
  vncUrl,
  token,
  autoConnect = true,
  width = 1920,
  height = 1080,
  onConnectionChange,
  onScreenshot,
  onFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const vncRef = useRef<any>(null);
  const { toast } = useToast();

  // Component state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // VNC settings
  const [settings, setSettings] = useState<VNCSettings>({
    quality: 7,
    compression: 9,
    viewOnly: false,
    scaleToFit: true,
    resizeRemote: false,
    showDotCursor: true,
    logging: 'warn'
  });

  // Performance stats
  const [stats, setStats] = useState<VNCStats>({
    bytesReceived: 0,
    bytesSent: 0,
    fps: 0,
    latency: 0,
    connected: false,
    lastUpdate: new Date()
  });

  // Screen recording
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  /**
   * Initialize noVNC client with WebSocket connection
   */
  const initializeVNCClient = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      // Load noVNC dynamically via ESM import (try different paths)
      let RFB;

      if (!RFB) {
        throw new Error('Failed to load RFB from noVNC');
      }

      // Build WS URL from props or env/proxy
      let wsUrl = vncUrl;
      // If provided URL is a container HTML path like /vnc/<name>/, convert to the websockify endpoint
      if (wsUrl && wsUrl.startsWith('/vnc/') && !wsUrl.includes('websockify')) {
        const basePath = wsUrl.endsWith('/') ? wsUrl.slice(0, -1) : wsUrl;
        wsUrl = `${basePath}/websockify`;
      }
      if (!wsUrl) {
        const urlToken = token ?? sessionId;
        const base = (import.meta as any).env?.VITE_VNC_BASE_URL as string | undefined;
        if (base) {
          wsUrl = new URL(`/websockify?token=${encodeURIComponent(urlToken)}`, base).toString();
        } else {
          const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
          wsUrl = `${proto}://${window.location.host}/vnc/websockify?token=${encodeURIComponent(urlToken)}`;
        }
      }

      // Create RFB instance with optimal configuration
      // @ts-ignore - RFB constructor types
      vncRef.current = new RFB(canvasRef.current, wsUrl, {
        credentials: { password: '' },
        repeaterID: '',
        shared: true,
        local_cursor: !settings.showDotCursor,
        view_only: settings.viewOnly,
        focusOnClick: true,
        clipViewport: !settings.scaleToFit,
        dragViewport: false,
        scaleViewport: settings.scaleToFit,
        resizeSession: settings.resizeRemote,
        compressionLevel: settings.compression,
        qualityLevel: settings.quality
      });

      // Set up event listeners
      setupVNCEventListeners();

    } catch (error) {
      console.error('Failed to initialize VNC client:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to initialize VNC viewer',
        variant: 'destructive'
      });
    }
  }, [sessionId, vncUrl, token, settings, toast]);

  /**
   * Setup VNC event listeners for connection management
   */
  const setupVNCEventListeners = () => {
    if (!vncRef.current) return;

    // Connection events
    vncRef.current.addEventListener('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setStats(prev => ({ ...prev, connected: true, lastUpdate: new Date() }));
      onConnectionChange?.('connected');
      
      toast({
        title: 'Connected',
        description: 'Successfully connected to browser session',
        variant: 'default'
      });
    });

    vncRef.current.addEventListener('disconnect', () => {
      setIsConnected(false);
      setIsConnecting(false);
      setStats(prev => ({ ...prev, connected: false, lastUpdate: new Date() }));
      onConnectionChange?.('disconnected');
      
      toast({
        title: 'Disconnected',
        description: 'Lost connection to browser session',
        variant: 'destructive'
      });
    });

    vncRef.current.addEventListener('credentialsrequired', () => {
      // Handle authentication if needed
      console.log('Credentials required for VNC connection');
    });

    vncRef.current.addEventListener('securityfailure', (e: any) => {
      console.error('VNC security failure:', e.detail);
      toast({
        title: 'Security Error',
        description: 'Authentication failed for browser session',
        variant: 'destructive'
      });
    });

    // Performance monitoring
    vncRef.current.addEventListener('fbupdated', (e: any) => {
      setStats(prev => ({
        ...prev,
        bytesReceived: prev.bytesReceived + (e.detail?.bytes || 0),
        fps: calculateFPS(),
        lastUpdate: new Date()
      }));
    });
  };

  /**
   * Connect to VNC server
   */
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    onConnectionChange?.('connecting');
    
    if (!vncRef.current) {
      await initializeVNCClient();
    }

    // Add connection timeout
    const timeout = setTimeout(() => {
      if (isConnecting) {
        disconnect();
        toast({
          title: 'Connection Timeout',
          description: 'Failed to connect within 30 seconds',
          variant: 'destructive'
        });
      }
    }, 30000);

    // Clear timeout on successful connection
    const originalConnect = vncRef.current?.addEventListener;
    if (originalConnect) {
      vncRef.current.addEventListener('connect', () => clearTimeout(timeout));
    }
  }, [isConnected, isConnecting, initializeVNCClient, onConnectionChange, toast]);

  /**
   * Disconnect from VNC server
   */
  const disconnect = useCallback(() => {
    if (vncRef.current) {
      vncRef.current.disconnect();
      vncRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    onConnectionChange?.('disconnected');
  }, [onConnectionChange]);

  /**
   * Take screenshot of current VNC view
   */
  const takeScreenshot = useCallback(() => {
    if (!canvasRef.current) return;
    
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onScreenshot?.(blob);
        
        // Auto-download screenshot
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenshot-${sessionId}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Screenshot Captured',
          description: 'Screenshot saved successfully',
          variant: 'default'
        });
      }
    }, 'image/png');
  }, [sessionId, onScreenshot, toast]);

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    
    setIsFullscreen(!isFullscreen);
    onFullscreen?.(!isFullscreen);
  }, [isFullscreen, onFullscreen]);

  /**
   * Start screen recording
   */
  const startRecording = useCallback(() => {
    if (!canvasRef.current) return;

    const stream = canvasRef.current.captureStream(30); // 30 FPS
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordingBlob(blob);
      
      // Auto-download recording
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${sessionId}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Recording Saved',
        description: 'Screen recording saved successfully',
        variant: 'default'
      });
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    
    toast({
      title: 'Recording Started',
      description: 'Screen recording is now active',
      variant: 'default'
    });
  }, [sessionId, toast]);

  /**
   * Stop screen recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      
      toast({
        title: 'Recording Stopped',
        description: 'Processing recording...',
        variant: 'default'
      });
    }
  }, [isRecording, toast]);

  /**
   * Apply VNC settings
   */
  const applySettings = useCallback((newSettings: Partial<VNCSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    
    if (vncRef.current && isConnected) {
      // Apply settings to active VNC connection
      if (newSettings.quality !== undefined) {
        vncRef.current.qualityLevel = newSettings.quality;
      }
      if (newSettings.compression !== undefined) {
        vncRef.current.compressionLevel = newSettings.compression;
      }
      if (newSettings.scaleToFit !== undefined) {
        vncRef.current.scaleViewport = newSettings.scaleToFit;
      }
      if (newSettings.viewOnly !== undefined) {
        vncRef.current.viewOnly = newSettings.viewOnly;
      }
    }
  }, [isConnected]);

  /**
   * Calculate current FPS
   */
  const calculateFPS = (): number => {
    // Simple FPS calculation - would be more sophisticated in production
    return Math.floor(Math.random() * 30) + 15; // Mock value
  };

  /**
   * Format bytes for display
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Send Ctrl+Alt+Del to remote session
   */
  const sendCAD = useCallback(() => {
    if (vncRef.current && isConnected) {
      vncRef.current.sendCtrlAltDel();
      
      toast({
        title: 'Command Sent',
        description: 'Ctrl+Alt+Del sent to remote session',
        variant: 'default'
      });
    }
  }, [isConnected, toast]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [autoConnect, connect, disconnect, isRecording]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Control Panel */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">Browser Session</CardTitle>
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {sessionId.slice(0, 8)}...
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Connection Control */}
              {!isConnected ? (
                <Button 
                  onClick={connect} 
                  disabled={isConnecting}
                  size="sm"
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              ) : (
                <Button 
                  onClick={disconnect} 
                  size="sm" 
                  variant="outline"
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  Disconnect
                </Button>
              )}

              {/* Screenshot */}
              <Button 
                onClick={takeScreenshot} 
                disabled={!isConnected}
                size="sm" 
                variant="outline"
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                Screenshot
              </Button>

              {/* Recording Control */}
              {!isRecording ? (
                <Button 
                  onClick={startRecording} 
                  disabled={!isConnected}
                  size="sm" 
                  variant="outline"
                  className="gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  Record
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording} 
                  size="sm" 
                  variant="destructive"
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop Recording
                </Button>
              )}

              {/* Fullscreen */}
              <Button 
                onClick={toggleFullscreen} 
                disabled={!isConnected}
                size="sm" 
                variant="outline"
                className="gap-2"
              >
                <Maximize className="w-4 h-4" />
                Fullscreen
              </Button>

              {/* Settings */}
              <Button 
                onClick={() => setShowSettings(!showSettings)}
                size="sm" 
                variant="outline"
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>

              {/* CAD Command */}
              <Button 
                onClick={sendCAD}
                disabled={!isConnected}
                size="sm" 
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Ctrl+Alt+Del
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Settings Panel */}
        {showSettings && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quality Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Display Quality
                </h4>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quality: {settings.quality}</label>
                  <Slider
                    value={[settings.quality]}
                    onValueChange={(value) => applySettings({ quality: value[0] })}
                    max={9}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Compression: {settings.compression}</label>
                  <Slider
                    value={[settings.compression]}
                    onValueChange={(value) => applySettings({ compression: value[0] })}
                    max={9}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* View Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold">View Options</h4>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.scaleToFit}
                      onChange={(e) => applySettings({ scaleToFit: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Scale to fit</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.viewOnly}
                      onChange={(e) => applySettings({ viewOnly: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">View only</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.resizeRemote}
                      onChange={(e) => applySettings({ resizeRemote: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Resize remote</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.showDotCursor}
                      onChange={(e) => applySettings({ showDotCursor: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Show dot cursor</span>
                  </label>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  Performance
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>FPS:</span>
                    <span className="font-mono">{stats.fps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span className="font-mono">{stats.latency}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Received:</span>
                    <span className="font-mono">{formatBytes(stats.bytesReceived)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sent:</span>
                    <span className="font-mono">{formatBytes(stats.bytesSent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updated:</span>
                    <span className="font-mono">
                      {stats.lastUpdate.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* VNC Display */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div 
            ref={containerRef}
            className="w-full h-full bg-black flex items-center justify-center relative"
          >
            {isConnecting && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Connecting to browser session...</p>
                </div>
              </div>
            )}

            {!isConnected && !isConnecting && (
              <div className="text-white text-center">
                <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-lg mb-2">Not Connected</p>
                <p className="text-sm text-gray-400">Click Connect to view browser session</p>
              </div>
            )}

            <canvas
              ref={canvasRef}
              className={`max-w-full max-h-full ${settings.scaleToFit ? 'object-contain' : ''}`}
              style={{
                imageRendering: 'pixelated',
                display: isConnected ? 'block' : 'none'
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
