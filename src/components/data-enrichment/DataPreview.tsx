import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Download, 
  Search, 
  Filter, 
  Eye,
  Table2,
  FileJson,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Database,
  ArrowUpDown,
  Copy,
  ExternalLink
} from "lucide-react";
import { EnrichmentJob } from "./DataEnrichmentDashboard";

interface DataPreviewProps {
  job: EnrichmentJob | null;
  jobs: EnrichmentJob[];
  onExport: (jobId: string) => void;
  onSelectJob: (job: EnrichmentJob) => void;
}

interface EnrichedRecord {
  id: string;
  original: Record<string, any>;
  enriched: Record<string, any>;
  status: 'success' | 'partial' | 'failed';
  providers: string[];
  enrichedAt: string;
  cost: number;
}

export function DataPreview({ job, jobs, onExport, onSelectJob }: DataPreviewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'partial' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<EnrichedRecord | null>(null);
  const [sortBy, setSortBy] = useState<'enrichedAt' | 'status' | 'cost'>('enrichedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const recordsPerPage = 20;

  // Sample enriched data for demo
  const sampleRecords: EnrichedRecord[] = job ? Array.from({ length: job.enrichedRecords }, (_, i) => ({
    id: `record-${i}`,
    original: {
      company: `Company ${i + 1}`,
      domain: `company${i + 1}.com`,
      location: 'San Francisco, CA'
    },
    enriched: {
      company: `Company ${i + 1}`,
      domain: `company${i + 1}.com`,
      website: `https://company${i + 1}.com`,
      industry: ['Technology', 'Healthcare', 'Finance', 'Retail'][i % 4],
      size: ['1-10', '11-50', '51-200', '201-500', '500+'][i % 5],
      location: 'San Francisco, CA',
      description: `Leading provider of innovative solutions in the ${['technology', 'healthcare', 'finance', 'retail'][i % 4]} sector.`,
      linkedinUrl: `https://linkedin.com/company/company${i + 1}`,
      foundedYear: 2010 + (i % 10),
      revenue: `$${(Math.random() * 100).toFixed(1)}M`,
      employees: Math.floor(Math.random() * 500) + 50,
      phoneNumber: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      email: `contact@company${i + 1}.com`,
      technologies: ['React', 'Node.js', 'AWS', 'Python', 'Docker'].slice(0, Math.floor(Math.random() * 3) + 2)
    },
    status: Math.random() > 0.9 ? 'failed' : Math.random() > 0.7 ? 'partial' : 'success',
    providers: ['Clearbit', 'Apollo'].slice(0, Math.floor(Math.random() * 2) + 1),
    enrichedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    cost: Math.random() * 0.1
  })) : [];

  // Filter and search
  const filteredRecords = sampleRecords
    .filter(record => {
      if (filterStatus !== 'all' && record.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return Object.values(record.enriched).some(value => 
          String(value).toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'enrichedAt':
          return order * (new Date(a.enrichedAt).getTime() - new Date(b.enrichedAt).getTime());
        case 'status':
          return order * a.status.localeCompare(b.status);
        case 'cost':
          return order * (a.cost - b.cost);
        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success" className="gap-1"><Check className="h-3 w-3" /> Success</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Partial</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> Failed</Badge>;
      default:
        return null;
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (job) {
      onExport(job.id);
    }
  };

  if (!job) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Completed Jobs</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            Complete an enrichment job to preview the results here
          </p>
          {jobs.length > 0 && (
            <div className="space-y-2 w-full max-w-md">
              <p className="text-sm text-muted-foreground">Select a completed job:</p>
              {jobs.map((j) => (
                <Button
                  key={j.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onSelectJob(j)}
                >
                  <Database className="h-4 w-4 mr-2" />
                  {j.name} - {j.enrichedRecords} records
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{job.name}</CardTitle>
              <CardDescription>
                {job.enrichedRecords} records enriched • Completed {new Date(job.completedAt || '').toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={job.id} onValueChange={(id) => {
                const selectedJob = jobs.find(j => j.id === id);
                if (selectedJob) onSelectJob(selectedJob);
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport('json')} className="gap-2">
                <FileJson className="h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search enriched data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enrichedAt">Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
            <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
              <TabsList>
                <TabsTrigger value="table">
                  <Table2 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="json">
                  <FileJson className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Data View */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <div>
              <ScrollArea className="w-full">
                <div className="min-w-full">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Industry</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Website</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Providers</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-accent/50">
                          <td className="px-4 py-3">
                            {getStatusBadge(record.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-sm">{record.enriched.company}</p>
                              <p className="text-xs text-muted-foreground">{record.enriched.domain}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{record.enriched.industry}</td>
                          <td className="px-4 py-3 text-sm">{record.enriched.size}</td>
                          <td className="px-4 py-3 text-sm">{record.enriched.location}</td>
                          <td className="px-4 py-3">
                            {record.enriched.website && (
                              <a
                                href={record.enriched.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Visit
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {record.providers.map((provider) => (
                                <Badge key={provider} variant="outline" className="text-xs">
                                  {provider}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            ${record.cost.toFixed(3)}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRecord(record)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              
              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * recordsPerPage) + 1} to{' '}
                  {Math.min(currentPage * recordsPerPage, filteredRecords.length)} of{' '}
                  {filteredRecords.length} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = currentPage - 2 + i;
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    }).filter(Boolean)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[600px] p-4">
              <pre className="text-xs">
                {JSON.stringify(paginatedRecords, null, 2)}
              </pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Record Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedRecord(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="enriched">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="enriched">Enriched Data</TabsTrigger>
                  <TabsTrigger value="original">Original Data</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                </TabsList>
                <TabsContent value="enriched">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {Object.entries(selectedRecord.enriched).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="font-medium text-sm w-32">{key}:</span>
                          <span className="text-sm flex-1">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="original">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {Object.entries(selectedRecord.original).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="font-medium text-sm w-32">{key}:</span>
                          <span className="text-sm flex-1">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="metadata">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm w-32">Status:</span>
                      {getStatusBadge(selectedRecord.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm w-32">Providers:</span>
                      <div className="flex gap-1">
                        {selectedRecord.providers.map((provider) => (
                          <Badge key={provider} variant="outline">
                            {provider}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm w-32">Enriched At:</span>
                      <span className="text-sm">
                        {new Date(selectedRecord.enrichedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm w-32">Cost:</span>
                      <span className="text-sm">${selectedRecord.cost.toFixed(3)}</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}