import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table as DataTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Play, 
  Square, 
  Download, 
  Upload, 
  FileText, 
  Globe, 
  Settings, 
  Database,
  Zap,
  Sparkles,
  Plus,
  X,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
  Filter,
  Search,
  Table,
  List,
  BarChart3,
  Target,
  FileJson,
  FileSpreadsheet,
  ExternalLink,
  History,
  TrendingUp,
  MoreHorizontal
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ExtractionTask {
  id: string;
  name: string;
  description: string;
  targetUrl: string;
  method: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  results?: any[];
  createdAt: Date;
  completedAt?: Date;
}

interface ExtractionField {
  id: string;
  name: string;
  selector: string;
  type: "text" | "number" | "url" | "email" | "date";
  required: boolean;
}

export function PlaygroundDataExtraction() {
  // Main configuration state
  const [extractionType, setExtractionType] = useState("text"); // text, structured, links, images, forms, custom
  const [agent, setAgent] = useState("crawl4ai"); // crawl4ai, browser-use, skyvern, mcp
  const [sourceType, setSourceType] = useState("single"); // single, batch, crm, csv
  const [selectedModel, setSelectedModel] = useState("");
  
  // Source data
  const [targetUrl, setTargetUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState<string[]>([""]);
  const [selectedCrmList, setSelectedCrmList] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  
  // AI Enhancement
  const [useAiEnhancement, setUseAiEnhancement] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [targetEntity, setTargetEntity] = useState(""); // companies, contacts
  
  // Output configuration
  const [outputFormat, setOutputFormat] = useState("json"); // json, csv, crm
  const [fieldMappings, setFieldMappings] = useState<any>({});
  
  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [extractionFields, setExtractionFields] = useState<ExtractionField[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Derived state for latest run (safely read from window during first render; updated in onSuccess)
  const [crawlResults, setCrawlResults] = useState<any[]>([]);
  const urlsProcessed = crawlResults.length;
  const durationMs = crawlResults.reduce((acc, r) => acc + (r?.metadata?.responseTime || 0), 0);
  const successRate = urlsProcessed ? Math.round((crawlResults.filter(r => !r.error).length / urlsProcessed) * 100) : 0;

  // Mock data for demonstration
  const mockHistory: ExtractionTask[] = [
    {
      id: "1",
      name: "E-commerce Product Data",
      description: "Extract product information from online store",
      targetUrl: "https://example.com/products",
      method: "crawl4ai",
      status: "completed",
      progress: 100,
      results: [
        { name: "Product A", price: "$29.99", rating: "4.5", inStock: true },
        { name: "Product B", price: "$49.99", rating: "4.2", inStock: false },
        { name: "Product C", price: "$19.99", rating: "4.8", inStock: true }
      ],
      createdAt: new Date("2024-01-15T10:30:00"),
      completedAt: new Date("2024-01-15T10:32:45")
    },
    {
      id: "2", 
      name: "Company Contact Information",
      description: "Extract contact details from business directory",
      targetUrl: "https://directory.example.com",
      method: "browser-use",
      status: "completed",
      progress: 100,
      results: [
        { company: "Tech Corp", email: "info@techcorp.com", phone: "+1-555-0123" },
        { company: "Design Studio", email: "hello@design.com", phone: "+1-555-0456" }
      ],
      createdAt: new Date("2024-01-14T14:20:00"),
      completedAt: new Date("2024-01-14T14:25:30")
    }
  ];

  const allExtractionResults = mockHistory.flatMap(task => task.results || []);

  // API queries
  const { data: models = [] } = useQuery({
    queryKey: ["/api/models"],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
  });

  const { data: crmLists = [] } = useQuery({
    queryKey: ["/api/crm/lists"],
  });

  const { data: extractionTasks = [] } = useQuery({
    queryKey: ["/api/extraction/tasks"],
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await fetch("/api/extraction/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) {
        throw new Error("Failed to create extraction task");
      }
      return await response.json();
    },
    onSuccess: (task: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/extraction/tasks"] });
      toast({
        title: "Extraction Started",
        description: `Crawled ${task?.results?.length || 0} URL(s)`,
      });
      setCrawlResults(Array.isArray(task?.results) ? task.results : []);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create extraction task.",
        variant: "destructive",
      });
    },
  });

  const handleStartExtraction = () => {
    // Validation based on source type
    if (sourceType === "single" && !targetUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a target URL.",
        variant: "destructive",
      });
      return;
    }

    if (sourceType === "batch" && batchUrls.filter(url => url.trim()).length === 0) {
      toast({
        title: "Error", 
        description: "Please add at least one URL to the batch list.",
        variant: "destructive",
      });
      return;
    }

    if (sourceType === "crm" && !selectedCrmList) {
      toast({
        title: "Error",
        description: "Please select a CRM list.",
        variant: "destructive",
      });
      return;
    }

    if (sourceType === "csv" && csvData.length === 0) {
      toast({
        title: "Error",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          toast({
            title: "Extraction Complete",
            description: "Data extraction has finished successfully.",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    // Prepare task data based on configuration
    const taskData = {
      name: `${extractionType} extraction`,
      extractionType,
      agent,
      sourceType,
      targetUrl: sourceType === "single" ? targetUrl : null,
      batchUrls: sourceType === "batch" ? batchUrls.filter(url => url.trim()) : null,
      crmListId: sourceType === "crm" ? selectedCrmList : null,
      csvData: sourceType === "csv" ? csvData : null,
      useAiEnhancement,
      aiPrompt: useAiEnhancement ? aiPrompt : null,
      targetEntity,
      outputFormat,
      fieldMappings,
      extractionFields,
      modelId: selectedModel,
    };

    createTaskMutation.mutate(taskData);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map(row => headers.map(header => `"${row[header] || ""}"`).join(","))
    ];
    return csvRows.join("\n");
  };

  const addExtractionField = () => {
    const newField: ExtractionField = {
      id: Date.now().toString(),
      name: "",
      selector: "",
      type: "text",
      required: false,
    };
    setExtractionFields([...extractionFields, newField]);
  };

  const updateExtractionField = (id: string, updates: Partial<ExtractionField>) => {
    setExtractionFields(fields =>
      fields.map(field => field.id === id ? { ...field, ...updates } : field)
    );
  };

  const removeExtractionField = (id: string) => {
    setExtractionFields(fields => fields.filter(field => field.id !== id));
  };

  // Batch URL management
  const addBatchUrl = () => {
    setBatchUrls([...batchUrls, ""]);
  };

  const updateBatchUrl = (index: number, value: string) => {
    const updated = [...batchUrls];
    updated[index] = value;
    setBatchUrls(updated);
  };

  const removeBatchUrl = (index: number) => {
    setBatchUrls(batchUrls.filter((_, i) => i !== index));
  };

  // CSV handling
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(row => row.split(','));
        const headers = rows[0];
        const data = rows.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header.trim()] = row[index]?.trim() || '';
          });
          return obj;
        });
        setCsvData(data);
        toast({
          title: "CSV Uploaded",
          description: `Loaded ${data.length} rows from CSV file.`,
        });
      };
      reader.readAsText(file);
    }
  };

  // Export handling
  const handleExport = (format: "json" | "csv") => {
    const data = allExtractionResults;
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No extracted data available to export.",
        variant: "destructive",
      });
      return;
    }

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `extraction-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === "csv") {
      if (data.length === 0) return;
      
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(","),
        ...data.map(row => headers.map(h => `"${row[h] || ""}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `extraction-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export Complete",
      description: `Data exported as ${format.toUpperCase()} file.`,
    });
  };

  return (
  <div className="h-screen bg-background flex flex-col">
      {/* Unified header to match other pages */}
    <div className="bg-card border-b">
        <div className="mx-auto w-full max-w-6xl px-6 flex items-end justify-between pt-[72px] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Data Extraction Playground</h1>
            <p className="text-muted-foreground mt-1">Configure and run intelligent web data extraction tasks</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setProgress(0)} variant="outline" size="sm" disabled={isRunning} data-testid="button-reset">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleStartExtraction} disabled={isRunning || !targetUrl.trim()} size="sm" data-testid="button-start-extraction">
              {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {isRunning ? "Extracting..." : "Start Extraction"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
  <div className="flex-1 bg-background flex overflow-hidden">
        {/* Keep the main content centered and aligned with header */}
        <div className="mx-auto w-full max-w-6xl px-6 flex-1 overflow-auto">

        {/* KPI Row */}
        {crawlResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="shadow-sm border-border/50">
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground">URLs Processed</div>
                <div className="text-2xl font-semibold mt-1">{urlsProcessed}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border/50">
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground">Records (est.)</div>
                <div className="text-2xl font-semibold mt-1">{crawlResults.reduce((acc, r)=> Array.isArray(r?.content) ? acc + r.content.length : acc + 1, 0)}</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border/50">
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="text-2xl font-semibold mt-1">{Math.max(1, Math.round(durationMs/1000))}s</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border/50">
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground">Success Rate</div>
                <div className="text-2xl font-semibold mt-1">{successRate}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Bar */}
        {isRunning && (
          <Card className="w-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Extraction Progress</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Configuration Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-0">
          {/* Data Type & Agent Configuration */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <span className="inline-flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center text-xs rounded-full bg-primary/10 text-primary">1</span> Extraction Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure what type of data to extract and which agent to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="extraction-type">Data Type to Extract</Label>
                <Select value={extractionType} onValueChange={setExtractionType}>
                  <SelectTrigger data-testid="select-extraction-type">
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        Text Content
                      </div>
                    </SelectItem>
                    <SelectItem value="structured">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4 text-green-500" />
                        Structured Data (Tables, Lists)
                      </div>
                    </SelectItem>
                    <SelectItem value="links">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-purple-500" />
                        Links & URLs
                      </div>
                    </SelectItem>
                    <SelectItem value="images">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-orange-500" />
                        Images & Media
                      </div>
                    </SelectItem>
                    <SelectItem value="forms">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4 text-red-500" />
                        Forms & Input Fields
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-500" />
                        Custom Extraction
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="agent">Extraction Agent</Label>
                <Select value={agent} onValueChange={setAgent}>
                  <SelectTrigger data-testid="select-agent">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crawl4ai">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-green-500" />
                        Crawl4AI - Advanced AI Extraction
                      </div>
                    </SelectItem>
                    <SelectItem value="browser-use">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        Browser-Use - Interactive Automation
                      </div>
                    </SelectItem>
                    <SelectItem value="skyvern">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Skyvern - Visual AI Automation
                      </div>
                    </SelectItem>
                    <SelectItem value="mcp">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-500" />
                        MCP Protocol - Fast Extraction
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ai-model">AI Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger data-testid="select-ai-model">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(models) && models.map((model: any) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          {model.name || model.id}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Source Configuration */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <span className="inline-flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center text-xs rounded-full bg-primary/10 text-primary">2</span> Data Source Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure where to extract data from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="source-type">Source Type</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger data-testid="select-source-type">
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        Single URL
                      </div>
                    </SelectItem>
                    <SelectItem value="batch">
                      <div className="flex items-center gap-2">
                        <List className="h-4 w-4 text-green-500" />
                        Batch URLs
                      </div>
                    </SelectItem>
                    <SelectItem value="crm">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-purple-500" />
                        CRM List
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                        CSV Upload
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Single URL Input */}
              {sourceType === "single" && (
                <div>
                  <Label htmlFor="target-url">Target URL</Label>
                  <Input
                    id="target-url"
                    placeholder="https://example.com/data"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    data-testid="input-target-url"
                  />
                </div>
              )}

              {/* Batch URLs */}
              {sourceType === "batch" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Batch URLs ({batchUrls.filter(url => url.trim()).length} URLs)</Label>
                    <Button
                      onClick={addBatchUrl}
                      variant="outline"
                      size="sm"
                      data-testid="button-add-batch-url"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add URL
                    </Button>
                  </div>
                  <ScrollArea className="h-48 border rounded-md p-3">
                    <div className="space-y-2">
                      {batchUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder={`URL ${index + 1}`}
                            value={url}
                            onChange={(e) => updateBatchUrl(index, e.target.value)}
                            className="flex-1"
                            data-testid={`input-batch-url-${index}`}
                          />
                          <Button
                            onClick={() => removeBatchUrl(index)}
                            variant="outline"
                            size="sm"
                            disabled={batchUrls.length === 1}
                            data-testid={`button-remove-batch-url-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* CRM List Selection */}
              {sourceType === "crm" && (
                <div>
                  <Label htmlFor="crm-list">CRM List</Label>
                  <Select value={selectedCrmList} onValueChange={setSelectedCrmList}>
                    <SelectTrigger data-testid="select-crm-list">
                      <SelectValue placeholder="Select CRM list" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(crmLists) && crmLists.map((list: any) => (
                        <SelectItem key={list.id} value={list.id}>
                          <div className="flex items-center gap-2">
                            <List className="h-4 w-4" />
                            {list.name} ({list.type})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCrmList && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      Extract from URLs/websites associated with this CRM list
                    </div>
                  )}
                </div>
              )}

              {/* CSV Upload */}
              {sourceType === "csv" && (
                <div>
                  <Label htmlFor="csv-upload">CSV File Upload</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      ref={fileInputRef}
                      className="hidden"
                      data-testid="input-csv-file"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full"
                      data-testid="button-upload-csv"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {csvData.length > 0 ? `Loaded ${csvData.length} rows` : "Upload CSV File"}
                    </Button>
                    {csvData.length > 0 && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                        ✓ CSV loaded with {csvData.length} rows. URLs will be extracted from 'url' column.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Enhancement & Output Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 px-0">
          {/* AI Enhancement */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="inline-flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center text-xs rounded-full bg-primary/10 text-primary">3</span> AI Enhancement</span>
              </CardTitle>
              <CardDescription>
                Use AI to enhance extraction with custom prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-enhancement">Enable AI Enhancement</Label>
                <Button
                  onClick={() => setUseAiEnhancement(!useAiEnhancement)}
                  variant={useAiEnhancement ? "default" : "outline"}
                  size="sm"
                  data-testid="button-toggle-ai-enhancement"
                >
                  {useAiEnhancement ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {useAiEnhancement && (
                <>
                  <div>
                    <Label htmlFor="ai-prompt">AI Extraction Prompt</Label>
                    <Textarea
                      id="ai-prompt"
                      placeholder="Describe what specific information you want to extract. Be as detailed as possible. Example: 'Extract company names, email addresses, and contact information from each page. Focus on finding the main contact details and ignore footer information.'"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={4}
                      data-testid="textarea-ai-prompt"
                    />
                  </div>

                  <div>
                    <Label htmlFor="target-entity">Target Entity Type</Label>
                    <Select value={targetEntity} onValueChange={setTargetEntity}>
                      <SelectTrigger data-testid="select-target-entity">
                        <SelectValue placeholder="Select target entity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="companies">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            Companies
                          </div>
                        </SelectItem>
                        <SelectItem value="contacts">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-green-500" />
                            Contacts
                          </div>
                        </SelectItem>
                        <SelectItem value="products">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-purple-500" />
                            Products
                          </div>
                        </SelectItem>
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-gray-500" />
                            Custom Entity
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Output Configuration */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                <span className="inline-flex items-center gap-2"><span className="inline-flex h-5 w-5 items-center justify-center text-xs rounded-full bg-primary/10 text-primary">4</span> Output Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure how extracted data should be formatted and saved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="output-format">Output Format</Label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger data-testid="select-output-format">
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4 text-blue-500" />
                        JSON Format
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-500" />
                        CSV Format
                      </div>
                    </SelectItem>
                    <SelectItem value="crm">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-purple-500" />
                        Save to CRM
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {outputFormat === "crm" && (
                <div>
                  <Label>CRM Field Mapping</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <p className="mb-2">Map extracted fields to CRM fields:</p>
                    <div className="space-y-1 text-xs">
                      <div>• Name → Contact Name</div>
                      <div>• Email → Email Address</div>
                      <div>• Company → Company Name</div>
                      <div>• Phone → Phone Number</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label>Preview & Export Options</Label>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" data-testid="button-preview-extraction">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-export-options">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport("json")}>
                        <FileJson className="h-4 w-4 mr-2" />
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("csv")}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section (full width) */}
        {crawlResults.length > 0 && (
          <Card className="mt-6 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Results</CardTitle>
              <CardDescription>Preview extracted content below. Export from the Data tab.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Simple smart table inference */}
              {(() => {
                // Build rows by flattening per-URL content
                const rows: any[] = [];
                let columns: string[] = [];
                crawlResults.forEach((r, idx) => {
                  if (Array.isArray(r?.content) && r.content.length > 0 && typeof r.content[0] === 'object') {
                    const keys = Object.keys(r.content[0]).slice(0, 6);
                    columns = columns.length ? columns : ['url', ...keys];
                    r.content.slice(0, 10).forEach((item: any) => {
                      const row: any = { url: r.url };
                      keys.forEach(k => row[k] = item?.[k] ?? '');
                      rows.push(row);
                    });
                  } else if (typeof r?.content === 'object' && r.content) {
                    const keys = Object.keys(r.content).slice(0, 6);
                    columns = columns.length ? columns : ['url', ...keys];
                    const row: any = { url: r.url };
                    keys.forEach(k => row[k] = typeof r.content[k] === 'string' ? r.content[k] : JSON.stringify(r.content[k]).slice(0,120));
                    rows.push(row);
                  } else {
                    columns = columns.length ? columns : ['url', 'content'];
                    rows.push({ url: r.url, content: (Array.isArray(r?.content) ? r.content.join(', ').slice(0,120) : String(r?.content || '')).slice(0,120) });
                  }
                });
                if (rows.length === 0) return <div className="text-sm text-muted-foreground">No rows to display.</div>;
                return (
                  <div className="rounded-xl border">
                    <DataTable>
                      <TableHeader>
                        <TableRow>
                          {columns.map((c) => (
                            <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row, i) => (
                          <TableRow key={i}>
                            {columns.map((c) => (
                              <TableCell key={c} className="align-top text-sm max-w-[320px] truncate">{String(row[c] ?? '')}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </DataTable>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Custom Field Configuration (when needed) */}
        {extractionType === "custom" && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Custom Field Configuration
              </CardTitle>
              <CardDescription>
                Define specific fields and selectors for custom extraction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {extractionFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2 p-3 border rounded-lg">
                    <Input
                      placeholder="Field name"
                      value={field.name}
                      onChange={(e) => updateExtractionField(field.id, { name: e.target.value })}
                      className="flex-1"
                      data-testid={`input-field-name-${field.id}`}
                    />
                    <Input
                      placeholder="CSS selector"
                      value={field.selector}
                      onChange={(e) => updateExtractionField(field.id, { selector: e.target.value })}
                      className="flex-1"
                      data-testid={`input-field-selector-${field.id}`}
                    />
                    <Select
                      value={field.type}
                      onValueChange={(value: any) => updateExtractionField(field.id, { type: value })}
                    >
                      <SelectTrigger className="w-32" data-testid={`select-field-type-${field.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => removeExtractionField(field.id)}
                      variant="outline"
                      size="sm"
                      data-testid={`button-remove-field-${field.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  onClick={addExtractionField}
                  variant="outline"
                  className="w-full mt-3"
                  data-testid="button-add-extraction-field"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start Extraction Button */}
        <div className="flex justify-center pt-6 w-full">
          <Button
            onClick={handleStartExtraction}
            disabled={isRunning}
            size="lg"
            className="px-8"
            data-testid="button-start-extraction"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Extraction
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right Sidebar (30%) aligned within same visual grid */}
      <div className="w-80 bg-card border-l border flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
              <TabsTrigger value="data" data-testid="tab-data">Data</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} className="h-full">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-4 space-y-4 h-full">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Task Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={isRunning ? "default" : "secondary"}>
                      {isRunning ? "Running" : "Ready"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Agent</span>
                    <Badge variant="outline">{agent}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Extractions</span>
                    <span className="text-sm font-medium">{mockHistory.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Records Extracted</span>
                    <span className="text-sm font-medium">{allExtractionResults.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-medium">100%</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="p-4 h-full">
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {mockHistory.map((task) => (
                    <Card key={task.id} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{task.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                        </div>
                        <Badge
                          variant={task.status === "completed" ? "default" : "secondary"}
                          className="ml-2"
                        >
                          {task.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{task.results?.length || 0} records</span>
                        <span>{task.createdAt.toLocaleDateString()}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Extracted Data Tab */}
            <TabsContent value="data" className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Extracted Data</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-export-menu">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport("json")} data-testid="menu-export-json">
                        <FileJson className="h-4 w-4 mr-2" />
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("csv")} data-testid="menu-export-csv">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="text-xs text-gray-600">
                  {allExtractionResults.length} records across {mockHistory.length} tasks
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {/* Render real extraction results if present */}
                    {Array.isArray((createTaskMutation.data as any)?.results) && (createTaskMutation.data as any).results.length > 0 ? (
                      (createTaskMutation.data as any).results.map((r: any, idx: number) => (
                        <Card key={idx} className="p-3">
                          <div className="text-sm font-semibold mb-2 truncate">{r.title || r.url}</div>
                          {r.metadata && (
                            <div className="text-xs text-gray-500 mb-2">{r.url} • {r.metadata.responseTime} ms</div>
                          )}
                          {Array.isArray(r.content) ? (
                            <div className="text-xs text-gray-700">{r.content.slice(0,5).join(", ")}{r.content.length>5?"…":''}</div>
                          ) : typeof r.content === 'object' && r.content !== null ? (
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-48">{JSON.stringify(r.content, null, 2)}</pre>
                          ) : (
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">{String(r.content || '')}</div>
                          )}
                        </Card>
                      ))
                    ) : (
                      allExtractionResults.map((record, index) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            {Object.entries(record).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-start">
                                <span className="text-xs font-medium text-gray-600 capitalize">
                                  {key}:
                                </span>
                                <span className="text-xs text-right max-w-[60%] break-words">
                                  {String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
      </div>
  );
} 