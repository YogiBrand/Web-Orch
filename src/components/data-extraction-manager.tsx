import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Database, 
  Download, 
  FileText, 
  Image, 
  Link, 
  Table,
  Zap,
  Settings,
  Play,
  Plus
} from "lucide-react";

export function DataExtractionManager() {
  const [extractionType, setExtractionType] = useState("structured");
  const [targetUrl, setTargetUrl] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  const extractionMethods = [
    {
      id: 'crawl4ai',
      name: 'Crawl4AI',
      description: 'Advanced AI-powered content extraction',
      icon: Database,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      features: ['AI Instructions', 'Batch Processing', 'Content Filtering', 'Screenshot Capture']
    },
    {
      id: 'mcp',
      name: 'MCP Protocol',
      description: 'Standardized extraction protocol',
      icon: Zap,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      features: ['Fast Processing', 'Reliable Results', 'Simple Setup', 'Lightweight']
    },
    {
      id: 'custom',
      name: 'Custom Extraction',
      description: 'Define your own extraction rules',
      icon: Settings,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      features: ['CSS Selectors', 'XPath Support', 'Custom Logic', 'Advanced Filtering']
    }
  ];

  const extractionTypes = [
    { id: 'text', name: 'Text Content', icon: FileText, description: 'Extract clean text content' },
    { id: 'structured', name: 'Structured Data', icon: Table, description: 'Extract organized data' },
    { id: 'links', name: 'Links', icon: Link, description: 'Extract all links and URLs' },
    { id: 'images', name: 'Images', icon: Image, description: 'Extract image URLs and metadata' },
    { id: 'forms', name: 'Forms', icon: Database, description: 'Extract form fields and structure' },
    { id: 'custom', name: 'Custom', icon: Settings, description: 'Define custom extraction rules' }
  ];

  const recentExtractions = [
    {
      id: '1',
      url: 'https://news.ycombinator.com',
      type: 'structured',
      status: 'completed',
      itemsExtracted: 30,
      duration: '2.3s',
      timestamp: '2 minutes ago'
    },
    {
      id: '2',
      url: 'https://example.com/products',
      type: 'links',
      status: 'completed',
      itemsExtracted: 156,
      duration: '1.8s',
      timestamp: '5 minutes ago'
    },
    {
      id: '3',
      url: 'https://blog.example.com',
      type: 'text',
      status: 'running',
      itemsExtracted: 0,
      duration: '-',
      timestamp: 'Just now'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-6xl px-6 pt-[72px] pb-6 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-green-600" />
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Data Extraction</h1>
        </div>
        <Badge variant="secondary">AI-Powered Scraping</Badge>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6">
      <Tabs defaultValue="extract" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="extract">Extract Data</TabsTrigger>
          <TabsTrigger value="methods">Methods</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="extract" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Extraction</CardTitle>
                <CardDescription>
                  Extract data from a single URL using AI-powered analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="target-url">Target URL</Label>
                  <Input
                    id="target-url"
                    placeholder="https://example.com"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="extraction-type">Extraction Type</Label>
                  <Select value={extractionType} onValueChange={setExtractionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {extractionTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {type.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ai-instructions">AI Instructions (optional)</Label>
                  <Textarea
                    id="ai-instructions"
                    placeholder="e.g., Extract product names, prices, and descriptions from the listing page"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button className="w-full" data-testid="button-start-extraction">
                  <Play className="w-4 h-4 mr-2" />
                  Start Extraction
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Extraction Types</CardTitle>
                <CardDescription>
                  Choose the type of data you want to extract
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {extractionTypes.map((type) => (
                    <div
                      key={type.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        extractionType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setExtractionType(type.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <type.icon className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-sm">{type.name}</span>
                      </div>
                      <p className="text-xs text-gray-600">{type.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {extractionMethods.map((method) => (
              <Card key={method.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${method.bgColor}`}>
                      <method.icon className={`w-5 h-5 ${method.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{method.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {method.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">Features</span>
                      <div className="space-y-1">
                        {method.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      Configure {method.name}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Extractions</CardTitle>
              <CardDescription>
                View and manage your recent data extraction tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExtractions.map((extraction) => (
                  <div key={extraction.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{extraction.url}</span>
                        <Badge variant="outline">{extraction.type}</Badge>
                        <Badge 
                          variant={extraction.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {extraction.status}
                        </Badge>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>Items: {extraction.itemsExtracted}</div>
                      <div>Duration: {extraction.duration}</div>
                      <div>Time: {extraction.timestamp}</div>
                      <div>Size: 2.3 MB</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Extraction Templates</CardTitle>
                  <CardDescription>
                    Pre-configured templates for common extraction scenarios
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Templates Yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create reusable templates for your most common extraction tasks
                </p>
                <Button variant="outline">
                  Create Your First Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}