import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { 
  Activity, 
  Wifi, 
  Zap, 
  Monitor,
  Clock,
  TrendingUp,
  TrendingDown,
  Settings,
  AlertTriangle
} from 'lucide-react';

interface StreamingMetrics {
  bandwidth: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  fps: number;
  timestamp: Date;
}

interface QualityProfile {
  name: string;
  resolution: { width: number; height: number };
  framerate: number;
  compression: number;
  quality: number;
  bitrate: number;
  minBandwidth: number;
}

interface PerformanceData {
  connectionId: string;
  currentMetrics: StreamingMetrics;
  currentProfile: QualityProfile;
  networkCondition: {
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    score: number;
  };
  adaptationHistory: Array<{
    timestamp: Date;
    fromProfile: string;
    toProfile: string;
    reason: string;
  }>;
}

interface VNCPerformanceDashboardProps {
  connectionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * VNC Performance Dashboard - Real-time monitoring and optimization
 */
export const VNCPerformanceDashboard: React.FC<VNCPerformanceDashboardProps> = ({
  connectionId,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableProfiles, setAvailableProfiles] = useState<QualityProfile[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<StreamingMetrics[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Load performance data
  const loadPerformanceData = async () => {
    if (!connectionId) return;

    try {
      const response = await fetch(`/api/vnc/performance/${connectionId}`);
      const data = await response.json();
      
      if (response.ok) {
        setPerformanceData(data);
        
        // Update metrics history
        if (data.currentMetrics) {
          setMetricsHistory(prev => {
            const newHistory = [...prev, data.currentMetrics];
            return newHistory.slice(-50); // Keep last 50 entries
          });
        }
      } else {
        console.error('Failed to load performance data:', data.error);
      }
    } catch (error) {
      console.error('Performance data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load available quality profiles
  const loadQualityProfiles = async () => {
    try {
      const response = await fetch('/api/vnc/quality-profiles');
      const data = await response.json();
      
      if (response.ok) {
        setAvailableProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Failed to load quality profiles:', error);
    }
  };

  // Change quality profile
  const changeQualityProfile = async (profileName: string) => {
    if (!connectionId) return;

    try {
      const response = await fetch(`/api/vnc/adapt-quality/${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProfile: profileName })
      });

      if (response.ok) {
        await loadPerformanceData(); // Refresh data
      } else {
        console.error('Failed to change quality profile');
      }
    } catch (error) {
      console.error('Quality profile change error:', error);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && connectionId) {
      const interval = setInterval(loadPerformanceData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [connectionId, autoRefresh, refreshInterval]);

  // Initial load
  useEffect(() => {
    loadPerformanceData();
    loadQualityProfiles();
  }, [connectionId]);

  /**
   * Get condition color based on network condition
   */
  const getConditionColor = (level: string): string => {
    switch (level) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  /**
   * Get condition badge variant
   */
  const getConditionVariant = (level: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (level) {
      case 'excellent': return 'default';
      case 'good': return 'default';
      case 'fair': return 'secondary';
      case 'poor': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  /**
   * Format bandwidth for display
   */
  const formatBandwidth = (mbps: number): string => {
    if (mbps < 1) return `${(mbps * 1000).toFixed(0)} Kbps`;
    return `${mbps.toFixed(1)} Mbps`;
  };

  /**
   * Calculate trend from metrics history
   */
  const calculateTrend = (metric: keyof StreamingMetrics): 'up' | 'down' | 'stable' => {
    if (metricsHistory.length < 2) return 'stable';
    
    const recent = metricsHistory.slice(-5);
    const older = metricsHistory.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, m) => sum + (m[metric] as number), 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + (m[metric] as number), 0) / older.length;
    
    const diff = Math.abs(recentAvg - olderAvg) / olderAvg;
    
    if (diff < 0.05) return 'stable';
    return recentAvg > olderAvg ? 'up' : 'down';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading performance data...</span>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData) {
    return (
      <Card>
        <CardContent className="text-center p-8">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No performance data available</p>
        </CardContent>
      </Card>
    );
  }

  const { currentMetrics, currentProfile, networkCondition, adaptationHistory } = performanceData;

  return (
    <div className="space-y-6">
      {/* Network Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Network Performance
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getConditionVariant(networkCondition.level)}>
                {networkCondition.level.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score: {networkCondition.score}/100
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Bandwidth */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bandwidth</span>
                <div className="flex items-center gap-1">
                  {calculateTrend('bandwidth') === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                  {calculateTrend('bandwidth') === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                  <span className="text-sm">{formatBandwidth(currentMetrics.bandwidth)}</span>
                </div>
              </div>
              <Progress value={Math.min(currentMetrics.bandwidth * 10, 100)} />
            </div>

            {/* Latency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Latency</span>
                <div className="flex items-center gap-1">
                  {calculateTrend('latency') === 'up' && <TrendingUp className="w-3 h-3 text-red-500" />}
                  {calculateTrend('latency') === 'down' && <TrendingDown className="w-3 h-3 text-green-500" />}
                  <span className="text-sm">{currentMetrics.latency.toFixed(0)}ms</span>
                </div>
              </div>
              <Progress 
                value={Math.max(0, 100 - (currentMetrics.latency / 4))} 
                className={currentMetrics.latency > 200 ? 'bg-red-100' : ''}
              />
            </div>

            {/* Packet Loss */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Packet Loss</span>
                <div className="flex items-center gap-1">
                  {calculateTrend('packetLoss') === 'up' && <TrendingUp className="w-3 h-3 text-red-500" />}
                  {calculateTrend('packetLoss') === 'down' && <TrendingDown className="w-3 h-3 text-green-500" />}
                  <span className="text-sm">{currentMetrics.packetLoss.toFixed(2)}%</span>
                </div>
              </div>
              <Progress 
                value={Math.max(0, 100 - (currentMetrics.packetLoss * 50))} 
                className={currentMetrics.packetLoss > 1 ? 'bg-red-100' : ''}
              />
            </div>

            {/* FPS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Frame Rate</span>
                <div className="flex items-center gap-1">
                  {calculateTrend('fps') === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                  {calculateTrend('fps') === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                  <span className="text-sm">{currentMetrics.fps.toFixed(0)} fps</span>
                </div>
              </div>
              <Progress value={(currentMetrics.fps / currentProfile.framerate) * 100} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Quality Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Current Quality Profile
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold capitalize">{currentProfile.name}</h3>
              <p className="text-sm text-muted-foreground">
                {currentProfile.resolution.width}×{currentProfile.resolution.height} • {currentProfile.framerate} fps
              </p>
            </div>
            <Badge variant="outline">
              {formatBandwidth(currentProfile.bitrate / 1000)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Quality:</span>
              <span className="ml-2">{currentProfile.quality}/9</span>
            </div>
            <div>
              <span className="font-medium">Compression:</span>
              <span className="ml-2">{currentProfile.compression}/9</span>
            </div>
            <div>
              <span className="font-medium">Bitrate:</span>
              <span className="ml-2">{currentProfile.bitrate} kbps</span>
            </div>
            <div>
              <span className="font-medium">Min. Bandwidth:</span>
              <span className="ml-2">{currentProfile.minBandwidth} Mbps</span>
            </div>
          </div>

          {/* Quality Profile Selector */}
          {showSettings && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Change Quality Profile:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availableProfiles.map((profile) => (
                  <Button
                    key={profile.name}
                    variant={profile.name === currentProfile.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => changeQualityProfile(profile.name)}
                    className="justify-start"
                  >
                    <div className="text-left">
                      <div className="font-medium capitalize">{profile.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {profile.resolution.width}×{profile.resolution.height} • {profile.framerate}fps
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adaptation History */}
      {adaptationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Adaptation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {adaptationHistory.slice(-5).reverse().map((adaptation, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="text-sm">
                        <span className="font-medium">{adaptation.fromProfile}</span>
                        {' → '}
                        <span className="font-medium">{adaptation.toProfile}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {adaptation.reason}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(adaptation.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Warnings */}
      {(currentMetrics.latency > 200 || currentMetrics.packetLoss > 1 || currentMetrics.bandwidth < 1) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">Performance Issues Detected</h4>
                <ul className="text-sm text-orange-700 mt-1 space-y-1">
                  {currentMetrics.latency > 200 && (
                    <li>• High latency ({currentMetrics.latency.toFixed(0)}ms) may cause delays</li>
                  )}
                  {currentMetrics.packetLoss > 1 && (
                    <li>• High packet loss ({currentMetrics.packetLoss.toFixed(2)}%) may cause stuttering</li>
                  )}
                  {currentMetrics.bandwidth < 1 && (
                    <li>• Low bandwidth ({formatBandwidth(currentMetrics.bandwidth)}) may limit quality</li>
                  )}
                </ul>
                <p className="text-sm text-orange-700 mt-2">
                  Consider switching to a lower quality profile for better performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};