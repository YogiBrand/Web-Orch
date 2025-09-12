import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Square, RotateCcw } from "lucide-react";

export function BrowserTab() {
  const [url, setUrl] = useState("https://example.com");
  const [isRunning, setIsRunning] = useState(false);

  const handleStartSession = () => {
    setIsRunning(true);
    // Simulate session running
    setTimeout(() => setIsRunning(false), 5000);
  };

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Browser Session</h1>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleStartSession}
            disabled={isRunning}
            className={isRunning ? "bg-red-600 hover:bg-red-700" : ""}
            data-testid="button-start-session"
          >
            {isRunning ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop Session
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Browser Control */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Browser Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL to navigate"
                  className="flex-1"
                  data-testid="input-url"
                />
                <Button variant="outline" size="icon" data-testid="button-navigate">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              {/* Browser Preview */}
              <div className="border rounded-lg overflow-hidden">
                {/* Browser Header */}
                <div className="bg-gray-100 border-b p-2 flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 bg-white rounded px-2 py-1 text-sm text-gray-600">
                    🔒 {url}
                  </div>
                </div>

                {/* Browser Content */}
                <div className="bg-white h-96 flex items-center justify-center">
                  {isRunning ? (
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading page...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary mb-4">Google</div>
                      <div className="w-80 bg-gray-100 rounded-full p-3 mb-4">
                        <input
                          type="text"
                          placeholder="Search Google or type a URL"
                          className="w-full bg-transparent outline-none text-sm"
                          data-testid="input-search-google"
                        />
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" data-testid="button-google-search-demo">
                          Google Search
                        </Button>
                        <Button variant="outline" size="sm" data-testid="button-feeling-lucky-demo">
                          I'm Feeling Lucky
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="meta" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="meta" data-testid="tab-meta">Meta</TabsTrigger>
                  <TabsTrigger value="logs" data-testid="tab-logs">Logs</TabsTrigger>
                  <TabsTrigger value="network" data-testid="tab-network">Network</TabsTrigger>
                  <TabsTrigger value="metrics" data-testid="tab-metrics">Metrics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="meta" className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Session ID</label>
                    <p className="text-sm font-mono" data-testid="text-session-id">66505553</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-sm" data-testid="text-status">
                      {isRunning ? "Running" : "Closed"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Credit Usage</label>
                    <p className="text-sm" data-testid="text-credit-usage">0.6588</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm" data-testid="text-created">8/6/2025, 8:07 PM</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <p className="text-sm" data-testid="text-duration">00:00:23</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="logs" className="space-y-2">
                  <div className="text-xs font-mono bg-gray-900 text-gray-100 p-3 rounded space-y-1 max-h-40 overflow-y-auto">
                    <div className="text-blue-400" data-testid="log-session-started">
                      [08:07:12] Session started
                    </div>
                    <div className="text-green-400" data-testid="log-browser-initialized">
                      [08:07:13] Browser initialized
                    </div>
                    <div className="text-yellow-400" data-testid="log-navigation">
                      [08:07:15] Navigating to {url}
                    </div>
                    {isRunning && (
                      <div className="text-blue-400 animate-pulse" data-testid="log-loading">
                        [08:07:16] Loading page...
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="network" className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Network requests will appear here when the session is active.
                  </div>
                </TabsContent>
                
                <TabsContent value="metrics" className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Requests</span>
                      <span className="text-sm font-medium" data-testid="metric-requests">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Data Transfer</span>
                      <span className="text-sm font-medium" data-testid="metric-data-transfer">0 KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Load Time</span>
                      <span className="text-sm font-medium" data-testid="metric-load-time">0ms</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
