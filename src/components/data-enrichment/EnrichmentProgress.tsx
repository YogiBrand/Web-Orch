import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  DollarSign,
  Database,
  RefreshCw,
  ChevronRight,
  Info,
  BarChart3
} from "lucide-react";
import { EnrichmentJob } from "./DataEnrichmentDashboard";

interface EnrichmentProgressProps {
  jobs: EnrichmentJob[];
  selectedJob: EnrichmentJob | null;
  onPause: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onSelectJob: (job: EnrichmentJob) => void;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

export function EnrichmentProgress({ 
  jobs, 
  selectedJob, 
  onPause, 
  onResume, 
  onSelectJob 
}: EnrichmentProgressProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedJob, setExpandedJob] = useState<string | null>(selectedJob?.id || null);

  // Simulate log updates for demo
  useEffect(() => {
    if (selectedJob && selectedJob.status === 'running') {
      const interval = setInterval(() => {
        const newLog: LogEntry = {
          timestamp: new Date().toISOString(),
          level: Math.random() > 0.8 ? 'warning' : 'info',
          message: [
            'Enriching company data from Clearbit...',
            'Validating email addresses...',
            'Fetching social profiles...',
            'Updating CRM records...',
            'Processing batch 10 of 50...'
          ][Math.floor(Math.random() * 5)]
        };
        setLogs(prev => [...prev.slice(-49), newLog]);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [selectedJob]);

  const getProgressPercentage = (job: EnrichmentJob) => {
    if (job.totalRecords === 0) return 0;
    return Math.round((job.processedRecords / job.totalRecords) * 100);
  };

  const getTimeRemaining = (job: EnrichmentJob) => {
    if (job.status !== 'running' || job.processedRecords === 0) return null;
    
    const elapsed = Date.now() - new Date(job.startedAt!).getTime();
    const rate = job.processedRecords / (elapsed / 1000); // records per second
    const remaining = job.totalRecords - job.processedRecords;
    const secondsRemaining = remaining / rate;
    
    if (secondsRemaining < 60) return `${Math.round(secondsRemaining)}s`;
    if (secondsRemaining < 3600) return `${Math.round(secondsRemaining / 60)}m`;
    return `${Math.round(secondsRemaining / 3600)}h`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const currentJob = selectedJob || jobs[0];

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active Enrichment Jobs</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Upload data or select from your CRM lists to start enriching
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Active Jobs</CardTitle>
              <CardDescription>
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} in progress
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentJob?.id === job.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => onSelectJob(job)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <div>
                            <p className="font-medium text-sm">{job.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.type === 'company' ? 'Companies' : 'Contacts'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          job.status === 'running' ? 'default' :
                          job.status === 'paused' ? 'secondary' :
                          'outline'
                        }>
                          {getProgressPercentage(job)}%
                        </Badge>
                      </div>
                      <Progress value={getProgressPercentage(job)} className="h-2 mb-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{job.processedRecords}/{job.totalRecords}</span>
                        {getTimeRemaining(job) && (
                          <span>{getTimeRemaining(job)} remaining</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Job Details */}
        <div className="lg:col-span-2">
          {currentJob && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{currentJob.name}</CardTitle>
                    <CardDescription>
                      Started {new Date(currentJob.startedAt || currentJob.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentJob.status === 'running' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPause(currentJob.id)}
                        className="gap-2"
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    ) : currentJob.status === 'paused' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResume(currentJob.id)}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Overall Progress</span>
                        <span className="font-medium">
                          {getProgressPercentage(currentJob)}%
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(currentJob)} className="h-3" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{currentJob.processedRecords} of {currentJob.totalRecords} records</span>
                        {getTimeRemaining(currentJob) && (
                          <span>~{getTimeRemaining(currentJob)} remaining</span>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Enriched</p>
                        <p className="text-2xl font-bold text-green-600">
                          {currentJob.enrichedRecords}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-600">
                          {currentJob.failedRecords}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">
                          {currentJob.processedRecords > 0 
                            ? Math.round((currentJob.enrichedRecords / currentJob.processedRecords) * 100)
                            : 0}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Cost</p>
                        <p className="text-2xl font-bold">
                          ${currentJob.actualCost.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Providers */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Active Providers</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentJob.enrichmentProviders.map((provider) => (
                          <Badge key={provider} variant="secondary">
                            <Zap className="h-3 w-3 mr-1" />
                            {provider}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Fields Being Enriched */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Fields Being Enriched</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentJob.fields.map((field) => (
                          <Badge key={field} variant="outline">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {currentJob.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{currentJob.error}</AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="logs">
                    <ScrollArea className="h-[300px] w-full rounded-lg border p-4">
                      <div className="space-y-2">
                        {logs.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No logs available yet
                          </p>
                        ) : (
                          logs.map((log, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 text-xs font-mono"
                            >
                              <span className="text-muted-foreground whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <Badge
                                variant={
                                  log.level === 'error' ? 'destructive' :
                                  log.level === 'warning' ? 'secondary' :
                                  log.level === 'success' ? 'success' :
                                  'outline'
                                }
                                className="font-mono text-xs px-1 py-0"
                              >
                                {log.level.toUpperCase()}
                              </Badge>
                              <span className="flex-1">{log.message}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="metrics" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Processing Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">
                              {currentJob.processedRecords > 0 && currentJob.startedAt
                                ? Math.round(
                                    currentJob.processedRecords / 
                                    ((Date.now() - new Date(currentJob.startedAt).getTime()) / 1000 / 60)
                                  )
                                : 0}
                            </span>
                            <span className="text-sm text-muted-foreground">records/min</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Average Cost</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">
                              ${currentJob.processedRecords > 0 
                                ? (currentJob.actualCost / currentJob.processedRecords).toFixed(3)
                                : '0.000'}
                            </span>
                            <span className="text-sm text-muted-foreground">per record</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Provider Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {currentJob.enrichmentProviders.map((provider) => (
                            <div key={provider} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span>{provider}</span>
                                <span className="text-muted-foreground">
                                  {Math.round(Math.random() * 30 + 70)}% success
                                </span>
                              </div>
                              <Progress value={Math.random() * 30 + 70} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}