import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CrmList, Company, Contact } from "@shared/schema";
import { 
  Database, 
  Brain, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Eye, 
  Globe, 
  ArrowRight,
  BarChart3,
  Activity,
  Target,
  Layers,
  Download,
  FileText,
  Image,
  Link,
  Table,
  Settings,
  Play,
  Plus,
  Upload,
  List,
  Building2,
  Users,
  ExternalLink,
  History,
  Filter,
  Search,
  Code2,
  MousePointer,
  Timer,
  Shield,
  Smartphone,
  Monitor,
  Tablet
} from "lucide-react";

interface ExtractionTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  extractionType: string;
  sourceType: 'single' | 'batch' | 'crm' | 'csv';
  urlCount: number;
  recordsExtracted: number;
  fieldsExtracted: string[];
  llmPrompt?: string;
  createdAt: string;
  completedAt?: string;
  results?: any[];
  error?: string;
  metadata: {
    duration: number;
    successRate: number;
    crmFieldsMapped: number;
  };
}

interface ExtractionConfig {
  // Core extraction settings
  extractionType: 'text' | 'structured' | 'links' | 'images' | 'forms' | 'tables' | 'custom';
  agent: 'crawl4ai' | 'browser-use' | 'skyvern' | 'mcp' | 'llm-only';
  
  // Browser & page settings
  waitForSelector?: string;
  waitForTimeout: number;
  scrollToBottom: boolean;
  scrollDelay: number;
  clickElements?: string[];
  fillForms?: Record<string, string>;
  
  // Content filtering
  removeElements: string[];
  allowedDomains?: string[];
  blockedDomains?: string[];
  cssSelectors?: string[];
  xpathSelectors?: string[];
  
  // Advanced settings
  followRedirects: boolean;
  maxRedirects: number;
  userAgent: string;
  viewport: { width: number; height: number };
  deviceEmulation?: 'desktop' | 'mobile' | 'tablet';
  
  // Rate limiting & proxies
  requestDelay: number;
  maxConcurrency: number;
  retryAttempts: number;
  useProxy: boolean;
  proxyRotation: boolean;
  
  // Data processing
  deduplication: boolean;
  dataValidation: boolean;
  outputFormat: 'json' | 'csv' | 'excel' | 'crm';
  
  // Screenshots & media
  takeScreenshots: boolean;
  screenshotQuality: number;
  downloadImages: boolean;
  extractImageText: boolean;
}

export function ComprehensiveDataExtraction() {
  const [activeTab, setActiveTab] = useState("configuration");
  const [extractionName, setExtractionName] = useState("");
  const [config, setConfig] = useState<ExtractionConfig>({
    extractionType: 'structured',
    agent: 'crawl4ai',
    waitForTimeout: 5000,
    scrollToBottom: false,
    scrollDelay: 1000,
    removeElements: [],
    followRedirects: true,
    maxRedirects: 5,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 },
    requestDelay: 1000,
    maxConcurrency: 3,
    retryAttempts: 3,
    useProxy: false,
    proxyRotation: false,
    deduplication: true,
    dataValidation: true,
    outputFormat: 'json',
    takeScreenshots: false,
    screenshotQuality: 80,
    downloadImages: false,
    extractImageText: false
  });

  // Source data configuration
  const [sourceType, setSourceType] = useState<'single' | 'batch' | 'crm' | 'csv'>('single');
  const [singleUrl, setSingleUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [selectedCrmList, setSelectedCrmList] = useState("");
  const [csvData, setCsvData] = useState("");
  
  // CRM field mapping
  const [targetEntity, setTargetEntity] = useState<'companies' | 'contacts'>('companies');
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [llmPrompt, setLlmPrompt] = useState("");
  
  // Queries
  const { data: crmLists = [] } = useQuery<CrmList[]>({
    queryKey: ['/api/crm/lists']
  });
  
  const { data: extractionTasks = [], refetch: refetchTasks } = useQuery<ExtractionTask[]>({
    queryKey: ['/api/extraction/tasks'],
    refetchInterval: 3000
  });

  // Extraction type options with Apify/Octoparse-level features
  const extractionTypes = [
    {
      id: 'text',
      name: 'Text Content',
      icon: FileText,
      description: 'Extract clean text content with AI processing',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      features: ['Natural Language Processing', 'Content Cleaning', 'Text Analytics', 'Language Detection']
    },
    {
      id: 'structured',
      name: 'Structured Data',
      icon: Table,
      description: 'Extract organized data from tables, lists, and forms',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      features: ['Table Detection', 'Schema Inference', 'Data Validation', 'Format Conversion']
    },
    {
      id: 'links',
      name: 'Link Extraction',
      icon: Link,
      description: 'Extract and analyze all links with metadata',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      features: ['URL Analysis', 'Link Classification', 'Broken Link Detection', 'Anchor Text']
    },
    {
      id: 'images',
      name: 'Image & Media',
      icon: Image,
      description: 'Extract images, videos, and media with OCR',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      features: ['OCR Text Extraction', 'Image Classification', 'Metadata Analysis', 'Media Downloads']
    },
    {
      id: 'forms',
      name: 'Form Analysis',
      icon: MousePointer,
      description: 'Analyze forms, inputs, and interactive elements',
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      features: ['Form Structure', 'Input Analysis', 'Validation Rules', 'Submit Simulation']
    },
    {
      id: 'custom',
      name: 'Custom Rules',
      icon: Code2,
      description: 'Define custom extraction rules and patterns',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      features: ['CSS Selectors', 'XPath Queries', 'Regex Patterns', 'Custom Logic']
    }
  ];

  // Agent options with capabilities
  const agentOptions = [
    {
      id: 'crawl4ai',
      name: 'Crawl4AI',
      icon: Brain,
      description: 'AI-powered extraction with advanced content analysis',
      capabilities: ['Natural Language Processing', 'Content Understanding', 'Smart Navigation', 'Auto-pagination']
    },
    {
      id: 'browser-use',
      name: 'Browser-Use',
      icon: Globe,
      description: 'Full browser automation with visual understanding',
      capabilities: ['Visual AI', 'Complex Interactions', 'JavaScript Execution', 'Dynamic Content']
    },
    {
      id: 'skyvern',
      name: 'Skyvern',
      icon: Zap,
      description: 'Workflow automation with computer vision',
      capabilities: ['Computer Vision', 'Workflow Automation', 'Form Filling', 'Multi-step Tasks']
    },
    {
      id: 'mcp',
      name: 'MCP Protocol',
      icon: Shield,
      description: 'Standardized extraction with reliability focus',
      capabilities: ['High Reliability', 'Fast Processing', 'Standard Compliance', 'Error Handling']
    }
  ];

  // Field mapping options for CRM
  const crmFieldOptions = {
    companies: [
      { id: 'name', label: 'Company Name', required: true },
      { id: 'domain', label: 'Domain' },
      { id: 'website', label: 'Website' },
      { id: 'industry', label: 'Industry' },
      { id: 'size', label: 'Company Size' },
      { id: 'location', label: 'Location' },
      { id: 'description', label: 'Description' }
    ],
    contacts: [
      { id: 'firstName', label: 'First Name', required: true },
      { id: 'lastName', label: 'Last Name', required: true },
      { id: 'email', label: 'Email' },
      { id: 'phone', label: 'Phone' },
      { id: 'title', label: 'Job Title' },
      { id: 'linkedinUrl', label: 'LinkedIn URL' },
      { id: 'companyId', label: 'Company' }
    ]
  };

  const executeMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      config: ExtractionConfig;
      sourceType: string;
      sourceData: any;
      fieldMappings?: Record<string, string>;
      llmPrompt?: string;
      targetEntity?: string;
    }) => {
      return await apiRequest("/api/extraction/execute", "POST", data);
    },
    onSuccess: () => {
      refetchTasks();
      setActiveTab("history");
    }
  });

  const generateLLMPrompt = () => {
    const selectedFields = Object.values(fieldMappings).filter(field => field);
    const fieldList = selectedFields.join(', ');
    
    const basePrompt = `Extract the following information from the webpage content: ${fieldList}.

Return the data in JSON format with the following structure:
${selectedFields.map(field => `"${field}": "extracted value"`).join(',\n')}

Instructions:
- Extract accurate information only
- Use null for missing or unavailable data
- Ensure data quality and consistency
- Focus on the most relevant information for each field`;

    setLlmPrompt(basePrompt);
  };

  const handleExecute = () => {
    if (!extractionName.trim()) return;

    let sourceData;
    switch (sourceType) {
      case 'single':
        sourceData = { url: singleUrl };
        break;
      case 'batch':
        sourceData = { urls: batchUrls.split('\n').filter(u => u.trim()) };
        break;
      case 'crm':
        sourceData = { crmListId: selectedCrmList };
        break;
      case 'csv':
        sourceData = { csvData };
        break;
    }

    executeMutation.mutate({
      name: extractionName,
      config,
      sourceType,
      sourceData,
      fieldMappings: Object.keys(fieldMappings).length > 0 ? fieldMappings : undefined,
      llmPrompt: llmPrompt.trim() || undefined,
      targetEntity
    });
  };

  const getStatusIcon = (status: ExtractionTask['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-green-500" />
          <div>
            <h2 className="text-2xl font-bold">Data Extraction</h2>
            <p className="text-muted-foreground">
              Advanced web scraping with AI-powered extraction and CRM integration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Activity className="h-3 w-3" />
            {extractionTasks.filter(t => t.status === 'running').length} Running
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="source-data">Source Data</TabsTrigger>
          <TabsTrigger value="field-mapping">Field Mapping</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Extraction Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Extraction Setup
                </CardTitle>
                <CardDescription>
                  Configure your extraction task name and basic settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="extraction-name">Task Name</Label>
                  <Input
                    id="extraction-name"
                    value={extractionName}
                    onChange={(e) => setExtractionName(e.target.value)}
                    placeholder="e.g., Product Catalog Extraction"
                    data-testid="input-extraction-name"
                  />
                </div>
                
                <div>
                  <Label>Output Format</Label>
                  <Select value={config.outputFormat} onValueChange={(value: any) => setConfig({...config, outputFormat: value})}>
                    <SelectTrigger data-testid="select-output-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="crm">Direct to CRM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Agent Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Agent Selection
                </CardTitle>
                <CardDescription>
                  Choose the best agent for your extraction needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {agentOptions.map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        config.agent === agent.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setConfig({...config, agent: agent.id as any})}
                      data-testid={`select-agent-${agent.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <agent.icon className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground mb-2">{agent.description}</div>
                          <div className="flex flex-wrap gap-1">
                            {agent.capabilities.map((cap) => (
                              <Badge key={cap} variant="outline" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Extraction Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Extraction Types
              </CardTitle>
              <CardDescription>
                Select the type of data you want to extract with advanced capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {extractionTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      config.extractionType === type.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setConfig({...config, extractionType: type.id as any})}
                    data-testid={`extraction-type-${type.id}`}
                  >
                    <div className={`w-12 h-12 rounded-lg ${type.bgColor} flex items-center justify-center mb-3`}>
                      <type.icon className={`h-6 w-6 ${type.color}`} />
                    </div>
                    <h3 className="font-semibold mb-1">{type.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{type.description}</p>
                    <div className="space-y-1">
                      {type.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Configuration
              </CardTitle>
              <CardDescription>
                Fine-tune extraction behavior with professional-grade settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Browser Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Browser Settings
                  </h4>
                  
                  <div>
                    <Label htmlFor="wait-timeout">Wait Timeout (ms)</Label>
                    <Input
                      id="wait-timeout"
                      type="number"
                      value={config.waitForTimeout}
                      onChange={(e) => setConfig({...config, waitForTimeout: parseInt(e.target.value) || 5000})}
                      data-testid="input-wait-timeout"
                    />
                  </div>

                  <div>
                    <Label>Device Emulation</Label>
                    <Select value={config.deviceEmulation || 'desktop'} onValueChange={(value: any) => setConfig({...config, deviceEmulation: value})}>
                      <SelectTrigger data-testid="select-device">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desktop">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Desktop
                          </div>
                        </SelectItem>
                        <SelectItem value="mobile">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Mobile
                          </div>
                        </SelectItem>
                        <SelectItem value="tablet">
                          <div className="flex items-center gap-2">
                            <Tablet className="h-4 w-4" />
                            Tablet
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="scroll-bottom">Scroll to Bottom</Label>
                    <Switch
                      id="scroll-bottom"
                      checked={config.scrollToBottom}
                      onCheckedChange={(checked) => setConfig({...config, scrollToBottom: checked})}
                      data-testid="switch-scroll-bottom"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="take-screenshots">Take Screenshots</Label>
                    <Switch
                      id="take-screenshots"
                      checked={config.takeScreenshots}
                      onCheckedChange={(checked) => setConfig({...config, takeScreenshots: checked})}
                      data-testid="switch-screenshots"
                    />
                  </div>
                </div>

                {/* Performance Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Performance Settings
                  </h4>
                  
                  <div>
                    <Label htmlFor="concurrency">Max Concurrency: {config.maxConcurrency}</Label>
                    <Slider
                      id="concurrency"
                      min={1}
                      max={10}
                      step={1}
                      value={[config.maxConcurrency]}
                      onValueChange={([value]) => setConfig({...config, maxConcurrency: value})}
                      className="mt-2"
                      data-testid="slider-concurrency"
                    />
                  </div>

                  <div>
                    <Label htmlFor="request-delay">Request Delay (ms): {config.requestDelay}</Label>
                    <Slider
                      id="request-delay"
                      min={0}
                      max={5000}
                      step={100}
                      value={[config.requestDelay]}
                      onValueChange={([value]) => setConfig({...config, requestDelay: value})}
                      className="mt-2"
                      data-testid="slider-delay"
                    />
                  </div>

                  <div>
                    <Label htmlFor="retry-attempts">Retry Attempts: {config.retryAttempts}</Label>
                    <Slider
                      id="retry-attempts"
                      min={1}
                      max={5}
                      step={1}
                      value={[config.retryAttempts]}
                      onValueChange={([value]) => setConfig({...config, retryAttempts: value})}
                      className="mt-2"
                      data-testid="slider-retries"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-proxy">Use Proxy</Label>
                    <Switch
                      id="use-proxy"
                      checked={config.useProxy}
                      onCheckedChange={(checked) => setConfig({...config, useProxy: checked})}
                      data-testid="switch-proxy"
                    />
                  </div>
                </div>

                {/* Data Processing */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Data Processing
                  </h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="deduplication">Deduplication</Label>
                    <Switch
                      id="deduplication"
                      checked={config.deduplication}
                      onCheckedChange={(checked) => setConfig({...config, deduplication: checked})}
                      data-testid="switch-dedup"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="data-validation">Data Validation</Label>
                    <Switch
                      id="data-validation"
                      checked={config.dataValidation}
                      onCheckedChange={(checked) => setConfig({...config, dataValidation: checked})}
                      data-testid="switch-validation"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="download-images">Download Images</Label>
                    <Switch
                      id="download-images"
                      checked={config.downloadImages}
                      onCheckedChange={(checked) => setConfig({...config, downloadImages: checked})}
                      data-testid="switch-download-images"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="extract-image-text">Extract Image Text (OCR)</Label>
                    <Switch
                      id="extract-image-text"
                      checked={config.extractImageText}
                      onCheckedChange={(checked) => setConfig({...config, extractImageText: checked})}
                      data-testid="switch-ocr"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Selectors */}
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Custom Selectors & Rules</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="css-selectors">CSS Selectors (comma-separated)</Label>
                    <Textarea
                      id="css-selectors"
                      value={config.cssSelectors?.join(', ') || ''}
                      onChange={(e) => setConfig({...config, cssSelectors: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                      placeholder=".product-card, .price, .title"
                      rows={3}
                      data-testid="textarea-css-selectors"
                    />
                  </div>
                  <div>
                    <Label htmlFor="remove-elements">Remove Elements (comma-separated)</Label>
                    <Textarea
                      id="remove-elements"
                      value={config.removeElements.join(', ')}
                      onChange={(e) => setConfig({...config, removeElements: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                      placeholder="nav, footer, .ads, .popup"
                      rows={3}
                      data-testid="textarea-remove-elements"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Data Tab */}
        <TabsContent value="source-data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Data Sources
              </CardTitle>
              <CardDescription>
                Configure where to extract data from - URLs, CRM lists, or CSV uploads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={sourceType} onValueChange={(value: any) => setSourceType(value)} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="single">Single URL</TabsTrigger>
                  <TabsTrigger value="batch">Batch URLs</TabsTrigger>
                  <TabsTrigger value="crm">CRM List</TabsTrigger>
                  <TabsTrigger value="csv">CSV Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-4 mt-4">
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
                </TabsContent>

                <TabsContent value="batch" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="batch-urls">URLs (one per line)</Label>
                    <Textarea
                      id="batch-urls"
                      value={batchUrls}
                      onChange={(e) => setBatchUrls(e.target.value)}
                      placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                      rows={8}
                      data-testid="textarea-batch-urls"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {batchUrls.split('\n').filter(u => u.trim()).length} URLs configured
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="crm" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="crm-list">Select CRM List</Label>
                    <Select value={selectedCrmList} onValueChange={setSelectedCrmList}>
                      <SelectTrigger data-testid="select-crm-list">
                        <SelectValue placeholder="Choose a CRM list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {crmLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            <div className="flex items-center gap-2">
                              <List className="h-4 w-4" />
                              {list.name} ({list.recordCount} records)
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedCrmList && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        URLs will be extracted from the website fields of records in the selected list.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="csv" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="csv-data">CSV Data</Label>
                    <Textarea
                      id="csv-data"
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="url,name&#10;https://example.com,Example Site&#10;https://test.com,Test Site"
                      rows={8}
                      data-testid="textarea-csv-data"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Expected format: First column should contain URLs
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Mapping Tab */}
        <TabsContent value="field-mapping" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CRM Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  CRM Integration
                </CardTitle>
                <CardDescription>
                  Map extracted data to CRM fields for automatic population
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Target Entity</Label>
                  <Select value={targetEntity} onValueChange={(value: any) => setTargetEntity(value)}>
                    <SelectTrigger data-testid="select-target-entity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="companies">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Companies
                        </div>
                      </SelectItem>
                      <SelectItem value="contacts">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Contacts
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Field Mappings</Label>
                  {crmFieldOptions[targetEntity].map((field) => (
                    <div key={field.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className={field.required ? 'text-red-600' : ''}>
                          {field.label} {field.required && '*'}
                        </Label>
                      </div>
                      <div className="flex-1">
                        <Input
                          value={fieldMappings[field.id] || ''}
                          onChange={(e) => setFieldMappings({...fieldMappings, [field.id]: e.target.value})}
                          placeholder="Data extraction key"
                          data-testid={`input-field-${field.id}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={generateLLMPrompt}
                  variant="outline" 
                  className="w-full"
                  data-testid="button-generate-prompt"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Generate LLM Prompt
                </Button>
              </CardContent>
            </Card>

            {/* LLM Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Extraction Prompt
                </CardTitle>
                <CardDescription>
                  Provide instructions for AI-powered data extraction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="llm-prompt">Extraction Instructions</Label>
                  <Textarea
                    id="llm-prompt"
                    value={llmPrompt}
                    onChange={(e) => setLlmPrompt(e.target.value)}
                    placeholder="Extract company information including name, industry, and contact details..."
                    rows={12}
                    data-testid="textarea-llm-prompt"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    The AI will use these instructions to extract structured data from each page.
                    Be specific about the format and fields you need.
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg text-sm">
                  <strong>Pro Tips:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Be specific about data format requirements</li>
                    <li>Include examples of expected output</li>
                    <li>Mention error handling for missing data</li>
                    <li>Specify validation rules if needed</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Execute Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleExecute}
              disabled={!extractionName.trim() || executeMutation.isPending}
              size="lg"
              className="px-8"
              data-testid="button-execute-extraction"
            >
              {executeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Extraction
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Extraction History
              </CardTitle>
              <CardDescription>
                View and manage your extraction tasks and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {extractionTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No extraction tasks yet. Create your first extraction to see results here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {extractionTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <h3 className="font-medium">{task.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {task.sourceType} • {task.extractionType} • {task.urlCount} URLs
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={task.status === 'completed' ? 'default' : task.status === 'failed' ? 'destructive' : 'secondary'}>
                            {task.status}
                          </Badge>
                          <Button variant="outline" size="sm" data-testid={`view-task-${task.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`download-task-${task.id}`}>
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Records Extracted:</span>
                          <div className="font-medium">{task.recordsExtracted}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Success Rate:</span>
                          <div className="font-medium">{task.metadata.successRate}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-medium">{task.metadata.duration}s</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <div className="font-medium">{new Date(task.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {task.fieldsExtracted.length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Extracted Fields:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {task.fieldsExtracted.map((field) => (
                              <Badge key={field} variant="outline" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}