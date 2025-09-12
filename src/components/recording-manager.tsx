import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Play, 
  Pause, 
  Stop, 
  Download, 
  Trash2, 
  Eye, 
  Film,
  Clock,
  HardDrive,
  Share
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface Recording {
  id: string;
  sessionId: string;
  status: 'recording' | 'processing' | 'completed' | 'failed' | 'stopped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  filePath: string;
  thumbnailPath?: string;
  fileSize?: number;
  metadata: {
    resolution: { width: number; height: number };
    framerate: number;
    format: string;
    quality: string;
    codec: string;
  };
  error?: string;
}

interface PlaybackSession {
  id: string;
  recordingId: string;
  status: 'active' | 'paused' | 'stopped';
  currentTime: number;
  duration: number;
  playbackRate: number;
}

interface RecordingManagerProps {
  sessionId?: string;
  onRecordingStart?: (recording: Recording) => void;
  onRecordingStop?: (recording: Recording) => void;
}

/**
 * Recording Manager - Handles VNC session recordings and playback
 */
export const RecordingManager: React.FC<RecordingManagerProps> = ({
  sessionId,
  onRecordingStart,
  onRecordingStop
}) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [activeRecording, setActiveRecording] = useState<Recording | null>(null);
  const [playbackSession, setPlaybackSession] = useState<PlaybackSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  
  const { toast } = useToast();

  // Load recordings on component mount
  useEffect(() => {
    loadRecordings();
  }, [sessionId]);

  /**
   * Load recordings from API
   */
  const loadRecordings = async () => {
    setIsLoading(true);
    try {
      const endpoint = sessionId 
        ? `/api/recordings/session/${sessionId}`
        : '/api/recordings';
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok) {
        setRecordings(data.recordings || []);
        
        // Check for active recording
        const active = data.recordings?.find((r: Recording) => r.status === 'recording');
        setActiveRecording(active || null);
      } else {
        throw new Error(data.error || 'Failed to load recordings');
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
      toast({
        title: 'Load Error',
        description: 'Failed to load recordings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start recording current session
   */
  const startRecording = async () => {
    if (!sessionId) {
      toast({
        title: 'No Session',
        description: 'No active session to record',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(`/api/recordings/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          quality: 'high',
          framerate: 30,
          format: 'mp4'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        const recording = data.recording;
        setActiveRecording(recording);
        setRecordings(prev => [recording, ...prev]);
        onRecordingStart?.(recording);
        
        toast({
          title: 'Recording Started',
          description: 'Session recording is now active',
          variant: 'default'
        });
      } else {
        throw new Error(data.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Failed to start recording',
        variant: 'destructive'
      });
    }
  };

  /**
   * Stop active recording
   */
  const stopRecording = async () => {
    if (!activeRecording) return;

    try {
      const response = await fetch(`/api/recordings/${activeRecording.id}/stop`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (response.ok) {
        const recording = data.recording;
        setActiveRecording(null);
        setRecordings(prev => 
          prev.map(r => r.id === recording.id ? recording : r)
        );
        onRecordingStop?.(recording);
        
        toast({
          title: 'Recording Stopped',
          description: 'Processing recording...',
          variant: 'default'
        });
      } else {
        throw new Error(data.error || 'Failed to stop recording');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      toast({
        title: 'Stop Error',
        description: 'Failed to stop recording',
        variant: 'destructive'
      });
    }
  };

  /**
   * Start playback session
   */
  const startPlayback = async (recording: Recording) => {
    try {
      const response = await fetch(`/api/recordings/${recording.id}/playback`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (response.ok) {
        setPlaybackSession(data.session);
        setSelectedRecording(recording);
        
        toast({
          title: 'Playback Started',
          description: 'Playing recording',
          variant: 'default'
        });
      } else {
        throw new Error(data.error || 'Failed to start playback');
      }
    } catch (error) {
      console.error('Failed to start playback:', error);
      toast({
        title: 'Playback Error',
        description: 'Failed to start playback',
        variant: 'destructive'
      });
    }
  };

  /**
   * Control playback
   */
  const controlPlayback = async (action: 'play' | 'pause' | 'stop', value?: number) => {
    if (!playbackSession) return;

    try {
      const response = await fetch(`/api/recordings/playback/${playbackSession.id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value })
      });

      if (response.ok) {
        const data = await response.json();
        setPlaybackSession(data.session);
      } else {
        throw new Error('Failed to control playback');
      }
    } catch (error) {
      console.error('Failed to control playback:', error);
    }
  };

  /**
   * Download recording
   */
  const downloadRecording = async (recording: Recording) => {
    try {
      const response = await fetch(`/api/recordings/${recording.id}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${recording.sessionId}-${Date.now()}.${recording.metadata.format}`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Download Started',
          description: 'Recording download initiated',
          variant: 'default'
        });
      } else {
        throw new Error('Failed to download recording');
      }
    } catch (error) {
      console.error('Failed to download recording:', error);
      toast({
        title: 'Download Error',
        description: 'Failed to download recording',
        variant: 'destructive'
      });
    }
  };

  /**
   * Delete recording
   */
  const deleteRecording = async (recording: Recording) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      const response = await fetch(`/api/recordings/${recording.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setRecordings(prev => prev.filter(r => r.id !== recording.id));
        
        if (selectedRecording?.id === recording.id) {
          setSelectedRecording(null);
          setPlaybackSession(null);
        }
        
        toast({
          title: 'Recording Deleted',
          description: 'Recording has been removed',
          variant: 'default'
        });
      } else {
        throw new Error('Failed to delete recording');
      }
    } catch (error) {
      console.error('Failed to delete recording:', error);
      toast({
        title: 'Delete Error',
        description: 'Failed to delete recording',
        variant: 'destructive'
      });
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'recording': return 'destructive';
      case 'processing': return 'secondary';
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Recording Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {!activeRecording ? (
              <Button 
                onClick={startRecording}
                disabled={!sessionId}
                className="gap-2"
              >
                <Film className="w-4 h-4" />
                Start Recording
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                <Button 
                  onClick={stopRecording}
                  variant="destructive"
                  className="gap-2"
                >
                  <Stop className="w-4 h-4" />
                  Stop Recording
                </Button>
                
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Recording in progress</span>
                  <Badge variant="destructive">LIVE</Badge>
                </div>
              </div>
            )}
            
            <Button 
              onClick={loadRecordings}
              variant="outline"
              disabled={isLoading}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Playback */}
      {playbackSession && selectedRecording && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Now Playing
              </span>
              <Badge variant="outline">
                {selectedRecording.metadata.quality} • {selectedRecording.metadata.format.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Playback Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatDuration(playbackSession.currentTime)}</span>
                <span>{formatDuration(playbackSession.duration)}</span>
              </div>
              <Progress 
                value={(playbackSession.currentTime / playbackSession.duration) * 100}
                className="cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  const seekTime = percentage * playbackSession.duration;
                  controlPlayback('seek', seekTime);
                }}
              />
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              {playbackSession.status === 'paused' ? (
                <Button 
                  onClick={() => controlPlayback('play')}
                  size="sm"
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  Play
                </Button>
              ) : (
                <Button 
                  onClick={() => controlPlayback('pause')}
                  size="sm"
                  className="gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}
              
              <Button 
                onClick={() => controlPlayback('stop')}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Stop className="w-4 h-4" />
                Stop
              </Button>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm">Speed:</span>
                <select 
                  value={playbackSession.playbackRate}
                  onChange={(e) => controlPlayback('seek', undefined)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recordings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recordings</span>
            <Badge variant="outline">{recordings.length} recordings</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recordings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recordings found</p>
              <p className="text-sm">Start a recording to see it here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording) => (
                <div 
                  key={recording.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Recording Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs">
                        {recording.thumbnailPath ? (
                          <img 
                            src={`/api/recordings/${recording.id}/thumbnail`}
                            alt="Thumbnail"
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Film className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          Session {recording.sessionId.slice(0, 8)}...
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(recording.startTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant={getStatusColor(recording.status)}>
                      {recording.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Recording Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{recording.duration ? formatDuration(recording.duration) : '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      <span>{recording.fileSize ? formatFileSize(recording.fileSize) : '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>{recording.metadata.resolution.width}x{recording.metadata.resolution.height}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{recording.metadata.format.toUpperCase()}</span>
                      <span>•</span>
                      <span>{recording.metadata.quality}</span>
                    </div>
                  </div>

                  {/* Recording Actions */}
                  {recording.status === 'completed' && (
                    <div className="flex items-center gap-2 pt-2">
                      <Button 
                        onClick={() => startPlayback(recording)}
                        size="sm"
                        className="gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Play
                      </Button>
                      
                      <Button 
                        onClick={() => downloadRecording(recording)}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                      
                      <Button 
                        onClick={() => deleteRecording(recording)}
                        size="sm"
                        variant="outline"
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  )}

                  {/* Recording Error */}
                  {recording.status === 'failed' && recording.error && (
                    <div className="bg-red-50 text-red-700 text-sm p-3 rounded border border-red-200">
                      <strong>Error:</strong> {recording.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};