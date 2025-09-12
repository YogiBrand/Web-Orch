import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Eye, Trash2, Pause, Play, Camera, Copy, 
  Monitor, Globe, Activity, Clock, Zap,
  ChevronRight, MoreHorizontal, Settings,
  Download, Share, AlertCircle, CheckCircle2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Session } from "@/pages/sessions";

interface SessionGridProps {
  sessions: Session[];
  viewMode: 'grid' | 'list' | 'grouped';
  selectedSessions: Set<string>;
  onSelectSession: (sessionId: string, selected: boolean) => void;
  onViewSession: (sessionId: string) => void;
  onTerminateSession: (sessionId: string) => void;
  onPauseSession: (sessionId: string) => void;
  onResumeSession: (sessionId: string) => void;
  onScreenshotSession: (sessionId: string) => void;
  getStatusColor: (status: string) => string;
  getBrowserIcon: (browser: string) => string;
  getTypeIcon: (type: string) => string;
}

export function SessionGrid({
  sessions,
  viewMode,
  selectedSessions,
  onSelectSession,
  onViewSession,
  onTerminateSession,
  onPauseSession,
  onResumeSession,
  onScreenshotSession,
  getStatusColor,
  getBrowserIcon,
  getTypeIcon
}: SessionGridProps) {
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  const handleCopySessionId = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sessionId);
  }, []);

  const SessionCard = ({ session }: { session: Session }) => (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-lg",
        "border-2",
        selectedSessions.has(session.id) 
          ? "border-blue-300 bg-blue-50" 
          : "border-transparent hover:border-gray-200"
      )}
      onMouseEnter={() => setHoveredSession(session.id)}
      onMouseLeave={() => setHoveredSession(null)}
      onClick={() => onViewSession(session.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={selectedSessions.has(session.id)}
              onCheckedChange={(checked) => {
                onSelectSession(session.id, checked as boolean);
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold truncate">{session.name}</h3>
                <Badge className={getStatusColor(session.status)} variant="outline">
                  {session.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>{getBrowserIcon(session.browser)}</span>
                  <span className="capitalize">{session.browser}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{getTypeIcon(session.type)}</span>
                  <span className="capitalize">{session.type}</span>
                </div>
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">
                {session.id.substring(0, 8)}...
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 opacity-0 group-hover:opacity-100"
                  onClick={(e) => handleCopySessionId(session.id, e)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Metrics */}
        {session.metrics && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">CPU</div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={session.metrics.cpuUsage || 0} 
                  className="h-2 flex-1" 
                />
                <span className="text-xs font-mono">
                  {(session.metrics.cpuUsage || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Memory</div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={session.metrics.memoryUsage || 0} 
                  className="h-2 flex-1" 
                />
                <span className="text-xs font-mono">
                  {(session.metrics.memoryUsage || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Task Info */}
        {session.taskData?.taskId && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-md">
            <Activity className="h-4 w-4 text-blue-600" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {session.taskData.taskName || 'Task'}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {session.taskData.taskId}
              </div>
            </div>
          </div>
        )}

        {/* Anti-Detection Status */}
        {session.config?.antiDetection?.enabled && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700">Stealth Mode</span>
              <Badge variant="outline" className="text-xs px-1 py-0">
                {session.config.antiDetection.level}
              </Badge>
            </div>
          </div>
        )}

        {/* Preview Thumbnail */}
        {session.metadata?.previewUrl && (
          <div className="relative mb-3 rounded-lg overflow-hidden bg-gray-100 aspect-video">
            <img
              src={session.metadata.previewUrl}
              alt="Session preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Gracefully hide preview if target is unreachable or not an image
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewSession(session.id);
                }}
                className="gap-2"
              >
                <Monitor className="h-4 w-4" />
                View Live
              </Button>
            </div>
          </div>
        )}

        {/* Timing Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {(() => {
                try {
                  const date = new Date(session.createdAt || session.startTime);
                  return isNaN(date.getTime()) 
                    ? 'Unknown time' 
                    : formatDistanceToNow(date, { addSuffix: true });
                } catch (error) {
                  return 'Unknown time';
                }
              })()}
            </span>
          </div>
          {session.duration && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>
                {typeof session.duration === 'number' 
                  ? `${Math.round(session.duration / 1000)}s`
                  : session.duration
                }
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewSession(session.id);
            }}
            className="flex-1 gap-2"
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
          
          {session.status === 'running' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPauseSession(session.id);
              }}
              className="gap-1"
            >
              <Pause className="h-4 w-4" />
            </Button>
          ) : session.status === 'paused' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onResumeSession(session.id);
              }}
              className="gap-1"
            >
              <Play className="h-4 w-4" />
            </Button>
          ) : null}
          
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onScreenshotSession(session.id);
            }}
            className="gap-1"
          >
            <Camera className="h-4 w-4" />
          </Button>
          
          {(session.status === 'running' || session.status === 'paused') && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onTerminateSession(session.id);
              }}
              className="gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const SessionListItem = ({ session }: { session: Session }) => (
    <div 
      className={cn(
        "group flex items-center gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer",
        selectedSessions.has(session.id) && "bg-blue-50 border-blue-200"
      )}
      onClick={() => onViewSession(session.id)}
    >
      <Checkbox
        checked={selectedSessions.has(session.id)}
        onCheckedChange={(checked) => {
          onSelectSession(session.id, checked as boolean);
        }}
        onClick={(e) => e.stopPropagation()}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-medium truncate">{session.name}</h3>
          <Badge className={getStatusColor(session.status)} variant="outline">
            {session.status}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{getBrowserIcon(session.browser)}</span>
            <span className="capitalize">{session.browser}</span>
            <span>•</span>
            <span>{getTypeIcon(session.type)}</span>
            <span className="capitalize">{session.type}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono">{session.id.substring(0, 12)}...</span>
          {session.taskData?.taskId && (
            <>
              <span>•</span>
              <span>Task: {session.taskData.taskId.substring(0, 8)}...</span>
            </>
          )}
          <span>•</span>
          <span>{formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}</span>
          {session.config?.antiDetection?.enabled && (
            <>
              <span>•</span>
              <span className="text-green-600">Stealth</span>
            </>
          )}
        </div>
      </div>
      
      {session.metrics && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span>CPU:</span>
            <span className="font-mono">{(session.metrics.cpuUsage || 0).toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span>MEM:</span>
            <span className="font-mono">{(session.metrics.memoryUsage || 0).toFixed(1)}%</span>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewSession(session.id);
          }}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
        
        {session.status === 'running' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPauseSession(session.id);
            }}
            className="h-8 w-8 p-0"
          >
            <Pause className="h-4 w-4" />
          </Button>
        ) : session.status === 'paused' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onResumeSession(session.id);
            }}
            className="h-8 w-8 p-0"
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : null}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onScreenshotSession(session.id);
          }}
          className="h-8 w-8 p-0"
        >
          <Camera className="h-4 w-4" />
        </Button>
        
        {(session.status === 'running' || session.status === 'paused') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTerminateSession(session.id);
            }}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const groupedSessions = sessions.reduce((groups: Record<string, Session[]>, session) => {
    const taskId = session.taskData?.taskId || 'standalone';
    if (!groups[taskId]) groups[taskId] = [];
    groups[taskId].push(session);
    return groups;
  }, {});

  if (viewMode === 'grid') {
    return (
      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div>
        {sessions.map((session) => (
          <SessionListItem key={session.id} session={session} />
        ))}
      </div>
    );
  }

  if (viewMode === 'grouped') {
    return (
      <div className="p-4 space-y-6">
        {Object.entries(groupedSessions).map(([taskId, taskSessions]) => (
          <div key={taskId}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">
                {taskId === 'standalone' ? 'Standalone Sessions' : `Task: ${taskId}`}
              </h3>
              <Badge variant="secondary">
                {taskSessions.length} session{taskSessions.length !== 1 ? 's' : ''}
              </Badge>
              {taskSessions.length > 1 && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Parallel
                </Badge>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {taskSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
