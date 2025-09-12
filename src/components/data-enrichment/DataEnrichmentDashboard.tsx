import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Upload, 
  Download, 
  Activity,
  DollarSign,
  Users,
  Building2,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Zap,
  Database
} from "lucide-react";
import { FieldMappingInterface } from "./FieldMappingInterface";
import { EnrichmentProgress } from "./EnrichmentProgress";
import { DataPreview } from "./DataPreview";
import { EnrichmentHistory } from "./EnrichmentHistory";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types
export interface EnrichmentJob {
  id: string;
  name: string;
  status: "pending" | "mapping" | "running" | "completed" | "failed" | "paused";
  type: "company" | "contact" | "both";
  source: "csv" | "excel" | "api" | "crm_list";
  sourceId?: string;
  totalRecords: number;
  processedRecords: number;
  enrichedRecords: number;
  failedRecords: number;
  fields: string[];
  enrichmentProviders: string[];
  estimatedCost: number;
  actualCost: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  error?: string;
  results?: any[];
  mapping?: Record<string, string>;
}

export interface EnrichmentStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalRecordsEnriched: number;
  totalCost: number;
  successRate: number;
  averageEnrichmentTime: number;
  providersUsed: string[];
}

export function DataEnrichmentDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedJob, setSelectedJob] = useState<EnrichmentJob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showMappingInterface, setShowMappingInterface] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/enrichment`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'job_update') {
        queryClient.setQueryData<EnrichmentJob[]>(
          ['/api/enrichment/jobs'],
          (oldData) => {
            if (!oldData) return [data.job];
            const index = oldData.findIndex(j => j.id === data.job.id);
            if (index === -1) return [...oldData, data.job];
            const newData = [...oldData];
            newData[index] = data.job;
            return newData;
          }
        );
      }
    };

    return () => ws.close();
  }, [queryClient]);

  // Queries
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<EnrichmentJob[]>({
    queryKey: ['/api/enrichment/jobs'],
    refetchInterval: 5000 // Poll every 5 seconds for updates
  });

  const { data: stats, isLoading: statsLoading } = useQuery<EnrichmentStats>({
    queryKey: ['/api/enrichment/stats']
  });

  const { data: providers = [] } = useQuery<string[]>({
    queryKey: ['/api/enrichment/providers']
  });

  // Mutations
  const createJobMutation = useMutation({
    mutationFn: (data: FormData) => 
      fetch('/api/enrichment/jobs', {
        method: 'POST',
        body: data,
        credentials: 'include'
      }).then(res => res.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrichment/jobs'] });
      setSelectedJob(data);
      setShowMappingInterface(true);
      toast({
        title: "Job Created",
        description: "Configure field mapping to start enrichment"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const startJobMutation = useMutation({
    mutationFn: (data: { jobId: string; mapping: Record<string, string> }) =>
      apiRequest(`/api/enrichment/jobs/${data.jobId}/start`, 'POST', { mapping: data.mapping }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrichment/jobs'] });
      setShowMappingInterface(false);
      setActiveTab("progress");
      toast({
        title: "Enrichment Started",
        description: "Processing your data..."
      });
    }
  });

  const pauseJobMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest(`/api/enrichment/jobs/${jobId}/pause`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrichment/jobs'] });
      toast({
        title: "Job Paused",
        description: "Enrichment has been paused"
      });
    }
  });

  const resumeJobMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest(`/api/enrichment/jobs/${jobId}/resume`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrichment/jobs'] });
      toast({
        title: "Job Resumed",
        description: "Enrichment has been resumed"
      });
    }
  });

  const exportJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/enrichment/jobs/${jobId}/export`, {
        credentials: 'include'
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enriched-data-${jobId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Your enriched data has been downloaded"
      });
    }
  });

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', file.name.endsWith('.csv') ? 'csv' : 'excel');
      createJobMutation.mutate(formData);
    }
  };

  // Active jobs
  const activeJobs = jobs.filter(j => ['running', 'mapping'].includes(j.status));
  const recentJobs = jobs.slice(0, 5);

  if (statsLoading || jobsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Data Enrichment</h2>
          <p className="text-muted-foreground">
            Enhance your data with AI-powered enrichment from multiple providers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Configure Providers
          </Button>
          <label htmlFor="file-upload">
            <Button className="gap-2" asChild>
              <span>
                <Upload className="h-4 w-4" />
                Upload Data
              </span>
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              Processing {activeJobs.reduce((sum, j) => sum + (j.totalRecords - j.processedRecords), 0)} records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Enriched</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalRecordsEnriched?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.successRate ? `${(stats.successRate * 100).toFixed(1)}% success rate` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalCost?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {stats?.providersUsed?.length || 0} providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageEnrichmentTime ? `${Math.round(stats.averageEnrichmentTime)}s` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per record enrichment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs Alert */}
      {activeJobs.length > 0 && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {activeJobs.length} enrichment {activeJobs.length === 1 ? 'job is' : 'jobs are'} currently running
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("progress")}
              >
                View Progress
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">
            Progress
            {activeJobs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeJobs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Start */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
                <CardDescription>
                  Start enriching your data in seconds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Upload your data</h4>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <label htmlFor="quick-upload" className="cursor-pointer">
                      <p className="text-sm text-muted-foreground">
                        Drop CSV or Excel file here or{" "}
                        <span className="text-primary font-medium">browse</span>
                      </p>
                    </label>
                    <input
                      id="quick-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Or select from CRM</h4>
                  <Button variant="outline" className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Select from CRM Lists
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Jobs</CardTitle>
                <CardDescription>
                  Your latest enrichment activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentJobs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No enrichment jobs yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setSelectedJob(job);
                          setActiveTab(job.status === 'completed' ? 'preview' : 'progress');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {job.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : job.status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{job.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.enrichedRecords}/{job.totalRecords} records • ${job.actualCost.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          job.status === 'completed' ? 'success' :
                          job.status === 'failed' ? 'destructive' :
                          'default'
                        }>
                          {job.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Providers */}
          <Card>
            <CardHeader>
              <CardTitle>Available Providers</CardTitle>
              <CardDescription>
                Data enrichment sources configured for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Clearbit', 'Hunter.io', 'Apollo', 'ZoomInfo', 'Lusha', 'Snov.io', 'RocketReach', 'Cognism'].map((provider) => (
                  <div key={provider} className="flex items-center gap-2 p-3 rounded-lg border">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{provider}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <EnrichmentProgress
            jobs={activeJobs}
            selectedJob={selectedJob}
            onPause={(jobId) => pauseJobMutation.mutate(jobId)}
            onResume={(jobId) => resumeJobMutation.mutate(jobId)}
            onSelectJob={setSelectedJob}
          />
        </TabsContent>

        <TabsContent value="preview">
          <DataPreview
            job={selectedJob}
            onExport={(jobId) => exportJobMutation.mutate(jobId)}
            onSelectJob={setSelectedJob}
            jobs={jobs.filter(j => j.status === 'completed')}
          />
        </TabsContent>

        <TabsContent value="history">
          <EnrichmentHistory
            jobs={jobs}
            onSelectJob={(job) => {
              setSelectedJob(job);
              setActiveTab(job.status === 'completed' ? 'preview' : 'progress');
            }}
            onExport={(jobId) => exportJobMutation.mutate(jobId)}
          />
        </TabsContent>
      </Tabs>

      {/* Field Mapping Modal */}
      {showMappingInterface && selectedJob && (
        <FieldMappingInterface
          job={selectedJob}
          onComplete={(mapping) => {
            startJobMutation.mutate({ jobId: selectedJob.id, mapping });
          }}
          onCancel={() => {
            setShowMappingInterface(false);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
}