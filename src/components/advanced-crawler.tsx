import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Globe2, 
  Play, 
  Download, 
  Eye, 
  Settings, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle,
  Brain,
  Image,
  Link,
  Table,
  FileText,
  Code2,
  Loader2
} from "lucide-react";

interface CrawlTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  urlCount: number;
  resultsCount: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface CrawlOptions {
  extractType: 'text' | 'structured' | 'links' | 'forms' | 'tables' | 'images';
  waitFor?: string;
  scrollToBottom?: boolean;
  removeElements?: string[];
  cssSelector?: string;
  extractSchema?: any;
}

interface CrawlResult {
  url: string;
  title: string;
  content: any;
  metadata: {
    crawledAt: string;
    responseTime: number;
    contentLength: number;
    statusCode?: number;
  };
  screenshots?: string[];
  links?: string[];
  images?: string[];
  error?: string;
}

export function AdvancedCrawler() {
  const [singleUrl, setSingleUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [aiUrl, setAiUrl] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [extractType, setExtractType] = useState<CrawlOptions['extractType']>("structured");
  const [waitFor, setWaitFor] = useState("");
  const [scrollToBottom, setScrollToBottom] = useState(false);
  const [removeElements, setRemoveElements] = useState("");
  const [cssSelector, setCssSelector] = useState("");
  const [extractSchema, setExtractSchema] = useState("");
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Fetch crawl tasks
  const { data: tasks = { tasks: [], total: 0 }, refetch: refetchTasks } = useQuery<{ tasks: CrawlTask[], total: number }>({
    queryKey: ['/api/crawl/tasks'],
    refetchInterval: 3000
  });

  // Single URL crawl mutation
  const singleCrawlMutation = useMutation({
    mutationFn: async (data: { url: string; options: CrawlOptions }): Promise<CrawlResult> => {
      return await apiRequest("/api/crawl/single", { method: "POST", data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crawl/tasks'] });
      setSingleUrl("");
    }
  });

  // Batch crawl mutation
  const batchCrawlMutation = useMutation({
    mutationFn: async (data: { urls: string[]; options: CrawlOptions }): Promise<{ taskId: string }> => {
      return await apiRequest("/api/crawl/batch", { method: "POST", data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crawl/tasks'] });
      setBatchUrls("");
    }
  });

  // AI extraction mutation
  const aiExtractMutation = useMutation({
    mutationFn: async (data: { url: string; instruction: string }): Promise<CrawlResult> => {
      return await apiRequest("/api/crawl/extract", { method: "POST", data });
    },
    onSuccess: () => {
      setAiUrl("");
      setAiInstruction("");
    }
  });

  const handleSingleCrawl = () => {
    if (!singleUrl) return;

    const options: CrawlOptions = {
      extractType,
      waitFor: waitFor || undefined,
      scrollToBottom,
      removeElements: removeElements ? removeElements.split(',').map(s => s.trim()) : undefined,
      cssSelector: cssSelector || undefined,
      extractSchema: extractSchema ? JSON.parse(extractSchema) : undefined
    };

    singleCrawlMutation.mutate({ url: singleUrl, options });
  };

  const handleBatchCrawl = () => {
    const urls = batchUrls.split('\n').map(url => url.trim()).filter(url => url);
    if (urls.length === 0) return;

    const options: CrawlOptions = {
      extractType,
      waitFor: waitFor || undefined,
      scrollToBottom,
      removeElements: removeElements ? removeElements.split(',').map(s => s.trim()) : undefined,
      cssSelector: cssSelector || undefined,
      extractSchema: extractSchema ? JSON.parse(extractSchema) : undefined
    };

    batchCrawlMutation.mutate({ urls, options });
  };

  const handleAiExtract = () => {
    if (!aiUrl || !aiInstruction) return;
    aiExtractMutation.mutate({ url: aiUrl, instruction: aiInstruction });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getExtractTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="w-4 h-4" />;
      case 'structured':
        return <Code2 className="w-4 h-4" />;
      case 'links':
        return <Link className="w-4 h-4" />;
      case 'images':
        return <Image className="w-4 h-4" />;
      case 'tables':
        return <Table className="w-4 h-4" />;
      default:
        return <Globe2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Advanced Web Crawler</h1>
        <p className="text-gray-600">
          Powerful web scraping with AI-powered extraction and batch processing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Crawl Interface */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="single" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single" data-testid="tab-single-crawl">Single URL</TabsTrigger>
              <TabsTrigger value="batch" data-testid="tab-batch-crawl">Batch Crawl</TabsTrigger>
              <TabsTrigger value="ai" data-testid="tab-ai-extract">AI Extract</TabsTrigger>
            </TabsList>

            {/* Single URL Crawl */}
            <TabsContent value="single">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe2 className="w-5 h-5" />
                    Single URL Crawl
                  </CardTitle>
                  <CardDescription>
                    Extract data from a single webpage with customizable options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="single-url">Target URL</Label>
                    <Input
                      id="single-url"
                      value={singleUrl}
                      onChange={(e) => setSingleUrl(e.target.value)}
                      placeholder="https://example.com"
                      data-testid="input-single-url"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="extract-type">Extract Type</Label>
                      <Select value={extractType} onValueChange={(value: CrawlOptions['extractType']) => setExtractType(value)}>
                        <SelectTrigger data-testid="select-extract-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="structured">Structured Data</SelectItem>
                          <SelectItem value="text">Plain Text</SelectItem>
                          <SelectItem value="links">Links</SelectItem>
                          <SelectItem value="images">Images</SelectItem>
                          <SelectItem value="tables">Tables</SelectItem>
                          <SelectItem value="forms">Forms</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="wait-for">Wait For Selector</Label>
                      <Input
                        id="wait-for"
                        value={waitFor}
                        onChange={(e) => setWaitFor(e.target.value)}
                        placeholder=".content, [data-loaded]"
                        data-testid="input-wait-for"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="css-selector">CSS Selector (optional)</Label>
                    <Input
                      id="css-selector"
                      value={cssSelector}
                      onChange={(e) => setCssSelector(e.target.value)}
                      placeholder=".main-content, article"
                      data-testid="input-css-selector"
                    />
                  </div>

                  <div>
                    <Label htmlFor="remove-elements">Remove Elements (comma-separated)</Label>
                    <Input
                      id="remove-elements"
                      value={removeElements}
                      onChange={(e) => setRemoveElements(e.target.value)}
                      placeholder=".ads, .sidebar, footer"
                      data-testid="input-remove-elements"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="scroll-to-bottom"
                      checked={scrollToBottom}
                      onCheckedChange={setScrollToBottom}
                      data-testid="switch-scroll-to-bottom"
                    />
                    <Label htmlFor="scroll-to-bottom">Scroll to bottom (for infinite scroll)</Label>
                  </div>

                  <Button 
                    onClick={handleSingleCrawl}
                    disabled={!singleUrl || singleCrawlMutation.isPending}
                    className="w-full"
                    data-testid="button-single-crawl"
                  >
                    {singleCrawlMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {singleCrawlMutation.isPending ? "Crawling..." : "Start Crawl"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Batch Crawl */}
            <TabsContent value="batch">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe2 className="w-5 h-5" />
                    Batch URL Crawl
                  </CardTitle>
                  <CardDescription>
                    Process multiple URLs simultaneously with parallel execution
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="batch-urls">URLs (one per line)</Label>
                    <Textarea
                      id="batch-urls"
                      value={batchUrls}
                      onChange={(e) => setBatchUrls(e.target.value)}
                      placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
                      rows={6}
                      data-testid="textarea-batch-urls"
                    />
                  </div>

                  <Button 
                    onClick={handleBatchCrawl}
                    disabled={!batchUrls.trim() || batchCrawlMutation.isPending}
                    className="w-full"
                    data-testid="button-batch-crawl"
                  >
                    {batchCrawlMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {batchCrawlMutation.isPending ? "Starting Batch..." : "Start Batch Crawl"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI-Powered Extraction */}
            <TabsContent value="ai">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI-Powered Extraction
                  </CardTitle>
                  <CardDescription>
                    Use natural language instructions to extract specific data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ai-url">Target URL</Label>
                    <Input
                      id="ai-url"
                      value={aiUrl}
                      onChange={(e) => setAiUrl(e.target.value)}
                      placeholder="https://example.com"
                      data-testid="input-ai-url"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ai-instruction">Extraction Instruction</Label>
                    <Textarea
                      id="ai-instruction"
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      placeholder="Extract product information including name, price, and description"
                      rows={4}
                      data-testid="textarea-ai-instruction"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Example Instructions:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• "Extract all product information from this e-commerce page"</li>
                      <li>• "Find all contact details including email and phone numbers"</li>
                      <li>• "Get article title, author, and publication date"</li>
                      <li>• "Extract all company information and social media links"</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleAiExtract}
                    disabled={!aiUrl || !aiInstruction || aiExtractMutation.isPending}
                    className="w-full"
                    data-testid="button-ai-extract"
                  >
                    {aiExtractMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="w-4 h-4 mr-2" />
                    )}
                    {aiExtractMutation.isPending ? "Extracting..." : "Extract with AI"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Task Management Panel */}
        <div className="space-y-6">
          {/* Active Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Crawl Tasks</span>
                <Badge variant="secondary">{tasks.tasks?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                {tasks.tasks?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Globe2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No crawl tasks yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.tasks?.map((task) => (
                      <Card key={task.id} className="border-l-4" style={{
                        borderLeftColor: task.status === 'completed' ? '#10b981' : 
                                       task.status === 'failed' ? '#ef4444' : 
                                       task.status === 'running' ? '#3b82f6' : '#6b7280'
                      }}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <Badge variant="outline" className="text-xs">
                                {task.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(task.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">URLs:</span>
                              <span className="font-medium">{task.urlCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Results:</span>
                              <span className="font-medium">{task.resultsCount}</span>
                            </div>
                            {task.status === 'running' && (
                              <Progress value={30} className="mt-2" />
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-task-${task.id}`}>
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            {task.status === 'completed' && (
                              <Button variant="outline" size="sm" data-testid={`button-download-task-${task.id}`}>
                                <Download className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Crawler Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Tasks</span>
                  <span className="font-medium">{tasks.tasks?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-medium text-green-600">
                    {tasks.tasks?.filter(t => t.status === 'completed').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Running</span>
                  <span className="font-medium text-blue-600">
                    {tasks.tasks?.filter(t => t.status === 'running').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Failed</span>
                  <span className="font-medium text-red-600">
                    {tasks.tasks?.filter(t => t.status === 'failed').length || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}