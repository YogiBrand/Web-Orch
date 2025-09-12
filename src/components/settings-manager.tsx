import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  User,
  Shield,
  Database,
  Zap,
  Bell,
  Globe,
  Monitor,
  Key
} from "lucide-react";

export function SettingsManager() {
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-gray-500" />
        <h2 className="text-2xl font-bold">Settings</h2>
        <Badge variant="secondary">Configuration</Badge>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Preferences</CardTitle>
              <CardDescription>
                Configure your general application preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about task completion and errors
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-save">Auto-save Settings</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save your configuration changes
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme for the interface
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="llm-provider">Default LLM Provider</Label>
                  <select 
                    id="llm-provider" 
                    className="w-full p-2 border rounded-md"
                    defaultValue="deepseek"
                  >
                    <option value="deepseek">DeepSeek Local (Free)</option>
                    <option value="openrouter">OpenRouter (Paid)</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose your preferred AI model provider
                  </p>
                </div>
                <div>
                  <Label htmlFor="max-sessions">Max Parallel Sessions</Label>
                  <Input
                    id="max-sessions"
                    type="number"
                    defaultValue={5}
                    min={1}
                    max={20}
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">DeepSeek Local Model</span>
                  <Badge className="bg-green-100 text-green-800">Running</Badge>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                  Your local DeepSeek R1 model is running on Docker with GPU acceleration
                </p>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-blue-600">Cost:</span> Free
                  </div>
                  <div>
                    <span className="text-blue-600">Speed:</span> ~25-40 tokens/sec
                  </div>
                  <div>
                    <span className="text-blue-600">Privacy:</span> 100% Local
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Manage your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    defaultValue="developer"
                    placeholder="Your username"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue="developer@hyperbrowser.com"
                    placeholder="Your email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    defaultValue="sk-1234567890abcdef"
                    placeholder="Your API key"
                  />
                  <Button variant="outline">Regenerate</Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Keep your API key secure and never share it publicly
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Automation Settings
              </CardTitle>
              <CardDescription>
                Configure automation behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default-timeout">Default Timeout (seconds)</Label>
                  <Input
                    id="default-timeout"
                    type="number"
                    defaultValue={30}
                    min={5}
                    max={300}
                  />
                </div>
                <div>
                  <Label htmlFor="retry-attempts">Retry Attempts</Label>
                  <Input
                    id="retry-attempts"
                    type="number"
                    defaultValue={3}
                    min={0}
                    max={10}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Screenshots</Label>
                    <p className="text-sm text-muted-foreground">
                      Capture screenshots during automation for debugging
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Stealth Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Use stealth techniques to avoid detection
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-cleanup Sessions</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically close idle browser sessions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Privacy
              </CardTitle>
              <CardDescription>
                Manage security settings and data privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all browser sessions for security audit
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Encryption</Label>
                    <p className="text-sm text-muted-foreground">
                      Encrypt stored session data and credentials
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div>
                <Label>Allowed IP Addresses</Label>
                <Input
                  placeholder="0.0.0.0/0 (all IPs)"
                  defaultValue="0.0.0.0/0"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Restrict access to specific IP addresses or ranges
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                External Integrations
              </CardTitle>
              <CardDescription>
                Configure connections to external services and APIs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span className="font-medium">DeepSeek Local</span>
                      <Badge className="bg-green-100 text-green-800">Running</Badge>
                    </div>
                    <Button variant="outline" size="sm">Monitor</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Local DeepSeek R1 model running on Docker with GPU acceleration
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Port: 11434</span>
                    <span>Model: deepseek-r1:latest</span>
                    <span>Cost: Free</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      <span className="font-medium">OpenRouter API</span>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cloud-based LLM model access and API routing (fallback)
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      <span className="font-medium">Selenium Grid</span>
                      <Badge variant="outline">Local</Badge>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Browser session management and orchestration
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <span className="font-medium">Database</span>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    PostgreSQL database for session and task storage
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button>Add New Integration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}