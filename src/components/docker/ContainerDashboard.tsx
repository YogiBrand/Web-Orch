import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Container,
  Play,
  Square,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  Activity,
  Cpu,
  Memory,
  HardDrive,
  Network,
  Clock,
  ExternalLink,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Filter,
  RefreshCw,
  Terminal,
  BarChart3,
  Settings,
  Eye,
  Copy,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ContainerMetrics {
  cpuUsage: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
  blockRead: number;
  blockWrite: number;
  uptime: number;
}

interface DeploymentStatus {
  id: string;
  status: 'initializing' | 'pulling' | 'building' | 'deploying' | 'running' | 'stopping' | 'stopped' | 'failed' | 'healthy' | 'unhealthy';
  progress: number;
  message: string;
  containerId?: string;
  containerName?: string;
  ports?: { internal: number; external: number }[];
  logs?: string[];
  metrics?: ContainerMetrics;
  error?: string;
  startedAt?: Date;
  updatedAt: Date;
  agentId?: string;
  environmentType?: 'local' | 'cloud' | 'kubernetes';
  imageId?: string;
  version?: string;
}

interface ContainerDashboardProps {
  refreshInterval?: number;
  showMetrics?: boolean;
  showLogs?: boolean;
}

export const ContainerDashboard: React.FC<ContainerDashboardProps> = ({
  refreshInterval = 30000,
  showMetrics = true,
  showLogs = true
}) => {
  const [deployments, setDeployments] = useState<DeploymentStatus[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [selectedLogsDeployment, setSelectedLogsDeployment] = useState<string>('');

  // Fetch deployments
  const fetchDeployments = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (environmentFilter !== 'all') params.append('environmentType', environmentFilter);

      const response = await fetch(`/api/docker/deployments?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch deployments');
      }

      const data = await response.json();
      setDeployments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch container logs
  const fetchLogs = async (deploymentId: string) => {
    try {
      const response = await fetch(`/api/docker/deployments/${deploymentId}/logs?tail=100`);
      if (response.ok) {
        const data = await response.json();
        setLogs(prev => ({
          ...prev,
          [deploymentId]: data.logs
        }));
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  // Container actions
  const handleAction = async (deploymentId: string, action: 'stop' | 'restart' | 'remove') => {
    try {
      let response: Response;
      
      switch (action) {
        case 'stop':
          response = await fetch(`/api/docker/deployments/${deploymentId}`, {
            method: 'DELETE'
          });
          break;
        case 'restart':
          response = await fetch(`/api/docker/deployments/${deploymentId}/restart`, {
            method: 'POST'
          });
          break;
        case 'remove':
          response = await fetch(`/api/docker/deployments/${deploymentId}`, {
            method: 'DELETE'
          });
          break;
      }

      if (response.ok) {
        fetchDeployments(); // Refresh the list
      } else {
        throw new Error(`Failed to ${action} container`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  // Scale deployment
  const handleScale = async (deploymentId: string, replicas: number) => {
    try {
      const response = await fetch(`/api/docker/deployments/${deploymentId}/scale`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ replicas })
      });

      if (response.ok) {
        fetchDeployments();
      } else {
        throw new Error('Failed to scale deployment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scale failed');
    }
  };

  // Setup auto-refresh
  useEffect(() => {
    fetchDeployments();
    
    const interval = setInterval(fetchDeployments, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, statusFilter, environmentFilter]);

  // Filter deployments
  const filteredDeployments = deployments.filter(deployment => {
    const matchesSearch = 
      deployment.containerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.agentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || deployment.status === statusFilter;
    const matchesEnvironment = environmentFilter === 'all' || deployment.environmentType === environmentFilter;
    
    return matchesSearch && matchesStatus && matchesEnvironment;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'stopped':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'initializing':
      case 'pulling':
      case 'building':
      case 'deploying':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const openLogs = (deploymentId: string) => {
    setSelectedLogsDeployment(deploymentId);
    fetchLogs(deploymentId);
    setIsLogsDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading containers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Error Loading Containers</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={fetchDeployments} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Container Dashboard</h2>
          <p className="text-muted-foreground">
            Manage and monitor your deployed containers
          </p>
        </div>
        <Button onClick={fetchDeployments} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Containers</CardTitle>
            <Container className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deployments.length}</div>
            <p className="text-xs text-muted-foreground">
              Active deployments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {deployments.filter(d => d.status === 'running' || d.status === 'healthy').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Healthy containers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {deployments.filter(d => d.status === 'failed' || d.status === 'unhealthy').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Error state
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deploying</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {deployments.filter(d => ['initializing', 'pulling', 'building', 'deploying'].includes(d.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search" className="sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search containers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="healthy">Healthy</option>
                <option value="stopped">Stopped</option>
                <option value="failed">Failed</option>
                <option value="deploying">Deploying</option>
              </select>

              <select
                value={environmentFilter}
                onChange={(e) => setEnvironmentFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Environments</option>
                <option value="local">Local</option>
                <option value="cloud">Cloud</option>
                <option value="kubernetes">Kubernetes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Containers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deployed Containers</CardTitle>
          <CardDescription>
            Monitor status, metrics, and manage your container deployments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Ports</TableHead>
                  <TableHead>Uptime</TableHead>
                  {showMetrics && <TableHead>Resources</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeployments.map((deployment) => (
                  <TableRow key={deployment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {deployment.containerName || deployment.agentId}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {deployment.imageId}:{deployment.version || 'latest'}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getStatusColor(deployment.status)}>
                          {deployment.status}
                        </Badge>
                        {['initializing', 'pulling', 'building', 'deploying'].includes(deployment.status) && (
                          <div className="w-full">
                            <Progress value={deployment.progress} className="h-1" />
                            <div className="text-xs text-muted-foreground mt-1">
                              {deployment.message}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {deployment.environmentType}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {deployment.ports?.length ? (
                        <div className="space-y-1">
                          {deployment.ports.map((port, index) => (
                            <div key={index} className="flex items-center space-x-1">
                              <code className="text-xs bg-muted px-1 rounded">
                                {port.external}:{port.internal}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`http://localhost:${port.external}`, '_blank')}
                                className="h-4 w-4 p-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {deployment.startedAt 
                            ? formatDistanceToNow(new Date(deployment.startedAt), { addSuffix: true })
                            : '-'
                          }
                        </span>
                      </div>
                    </TableCell>

                    {showMetrics && (
                      <TableCell>
                        {deployment.metrics ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-xs">
                              <Cpu className="h-3 w-3" />
                              <span>{deployment.metrics.cpuUsage.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <Memory className="h-3 w-3" />
                              <span>
                                {formatBytes(deployment.metrics.memoryUsage)}/
                                {formatBytes(deployment.metrics.memoryLimit)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <Network className="h-3 w-3" />
                              <span>
                                ↓{formatBytes(deployment.metrics.networkRx)}
                                ↑{formatBytes(deployment.metrics.networkTx)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No data</span>
                        )}
                      </TableCell>
                    )}

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {showLogs && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openLogs(deployment.id)}
                          >
                            <Terminal className="h-4 w-4" />
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(deployment.id)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy ID
                            </DropdownMenuItem>

                            {deployment.ports?.length && (
                              <DropdownMenuItem
                                onClick={() => window.open(`http://localhost:${deployment.ports![0].external}`, '_blank')}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {['stopped', 'failed'].includes(deployment.status) ? (
                              <DropdownMenuItem
                                onClick={() => handleAction(deployment.id, 'restart')}
                                className="text-green-600"
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Start
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleAction(deployment.id, 'stop')}
                                className="text-orange-600"
                              >
                                <Square className="mr-2 h-4 w-4" />
                                Stop
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleAction(deployment.id, 'restart')}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restart
                            </DropdownMenuItem>

                            {(deployment.environmentType === 'cloud' || deployment.environmentType === 'kubernetes') && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const replicas = prompt('Enter number of replicas:', '1');
                                  if (replicas && !isNaN(parseInt(replicas))) {
                                    handleScale(deployment.id, parseInt(replicas));
                                  }
                                }}
                              >
                                <Zap className="mr-2 h-4 w-4" />
                                Scale
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleAction(deployment.id, 'remove')}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredDeployments.length === 0 && (
            <div className="text-center py-12">
              <Container className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                No containers found
              </h3>
              <p className="text-muted-foreground mt-2">
                {searchTerm || statusFilter !== 'all' || environmentFilter !== 'all'
                  ? 'No containers match your current filters'
                  : 'Deploy your first container to get started'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Container Logs Dialog */}
      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Terminal className="h-5 w-5" />
              <span>Container Logs</span>
              {selectedLogsDeployment && (
                <Badge variant="outline">
                  {deployments.find(d => d.id === selectedLogsDeployment)?.containerName}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1">
            <ScrollArea className="h-[500px] w-full border rounded-md p-4 bg-black text-green-400 font-mono text-sm">
              {logs[selectedLogsDeployment]?.length ? (
                logs[selectedLogsDeployment].map((log, index) => (
                  <div key={index} className="mb-1 whitespace-pre-wrap">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">
                  No logs available or still loading...
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => selectedLogsDeployment && fetchLogs(selectedLogsDeployment)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const logsText = logs[selectedLogsDeployment]?.join('\n') || '';
                copyToClipboard(logsText);
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};