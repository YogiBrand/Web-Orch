import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Eye, 
  Trash2, 
  Monitor, 
  Play, 
  Square, 
  Pause,
  Activity,
  Clock,
  Cpu,
  Wifi
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  name: string;
  type: string;
  status: 'created' | 'running' | 'completed' | 'failed';
  browser?: string;
  agentType?: string;
  taskData?: {
    taskId?: string;
    concurrency?: number;
  };
  metadata?: {
    config?: any;
    browserSession?: any;
    liveMetrics?: {
      cpu: number;
      memory: number;
      network: number;
      uptime: number;
    };
    streamUrl?: string;
  };
  createdAt: string;
  endedAt?: string;
}

interface SessionsGridProps {
  sessions: Session[];
  onViewSession: (sessionId: string) => void;
  onTerminateSession: (sessionId: string) => void;
  compact?: boolean;
}

export function SessionsGrid({ 
  sessions, 
  onViewSession, 
  onTerminateSession,
  compact = false
}: SessionsGridProps) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    const colors = {
      created: 'bg-blue-100 text-blue-800',
      running: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getToolIcon = (tool: string) => {
    const icons: Record<string, string> = {
      'browser-use': '🌐',
      'skyvern': '🦅',
      'playwright': '🎭',
      'puppeteer': '🎪',
      'selenium': '🔧',
    };
    return icons[tool] || '🔧';
  };

  const calculateProgress = (session: Session) => {
    if (session.status === 'completed') return 100;
    if (session.status === 'failed') return 0;
    if (session.status === 'running') {
      // Simulate progress based on uptime
      const uptime = session.metadata?.liveMetrics?.uptime || 0;
      return Math.min((uptime / 60000) * 10, 90); // 10% per minute, max 90%
    }
    return 0;
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Monitor className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Sessions</h3>
        <p className="text-muted-foreground">
          No sessions found matching your criteria.
        </p>
      </div>
    );
  }

  const gridCols = compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {sessions.map((session) => (
        <Card 
          key={session.id}
          className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
            selectedSession === session.id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setSelectedSession(session.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">
                  {session.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm">{getToolIcon(session.type)}</span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {session.type}
                  </span>
                </div>
              </div>
              <Badge className={getStatusColor(session.status)}>
                {session.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-4">
            {/* Session Info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Monitor className="h-3 w-3" />
                <span className="capitalize">{session.browser || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{calculateProgress(session).toFixed(0)}%</span>
              </div>
              <Progress value={calculateProgress(session)} className="h-2" />
            </div>

            {/* Live Metrics (if running) */}
            {session.status === 'running' && session.metadata?.liveMetrics && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-blue-500" />
                  <span>{session.metadata.liveMetrics.cpu}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-green-500" />
                  <span>{session.metadata.liveMetrics.memory}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-purple-500" />
                  <span>{session.metadata.liveMetrics.network.toFixed(1)} MB/s</span>
                </div>
              </div>
            )}

            {/* Live Preview Thumbnail */}
            {session.status === 'running' && session.metadata?.streamUrl && (
              <div className="relative">
                <div className="aspect-video bg-gray-900 rounded-md overflow-hidden">
                  <iframe
                    src={session.metadata.streamUrl}
                    className="w-full h-full scale-50 origin-top-left"
                    style={{ transform: 'scale(0.5)', width: '200%', height: '200%' }}
                    title={`Session ${session.id} preview`}
                  />
                </div>
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    🔴 LIVE
                  </Badge>
                </div>
              </div>
            )}

            {/* Task Info */}
            {session.taskData?.taskId && (
              <div className="text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Task:</span>
                  <code className="font-mono bg-gray-100 px-1 rounded text-xs">
                    {session.taskData.taskId}
                  </code>
                </div>
                {session.taskData.concurrency && session.taskData.concurrency > 1 && (
                  <div className="mt-1 text-muted-foreground">
                    Part of {session.taskData.concurrency} parallel sessions
                  </div>
                )}
              </div>
            )}

            {/* Session ID */}
            <div className="text-xs text-muted-foreground font-mono truncate">
              ID: {session.id}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1">
                {session.status === 'created' && (
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                {session.status === 'running' && (
                  <>
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                    >
                      <Square className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewSession(session.id);
                  }}
                  className="h-6 px-2 text-xs"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                {(session.status === 'running' || session.status === 'created') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTerminateSession(session.id);
                    }}
                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}