import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Plus,
  Settings,
  Globe,
  Shield,
  Monitor,
  Clock,
  Edit,
  Trash2
} from "lucide-react";

export function ProfilesManager() {
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDescription, setNewProfileDescription] = useState("");

  const profiles = [
    {
      id: '1',
      name: 'Standard Desktop',
      description: 'Standard desktop browser configuration for general automation',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Chrome/Latest',
      location: 'US',
      proxy: null,
      stealth: true,
      cookies: [],
      lastUsed: '2 hours ago',
      usage: 156
    },
    {
      id: '2',
      name: 'Mobile Simulator',
      description: 'Mobile browser simulation for responsive testing',
      viewport: { width: 375, height: 667 },
      userAgent: 'Mobile Safari/Latest',
      location: 'US',
      proxy: null,
      stealth: true,
      cookies: [],
      lastUsed: '1 day ago',
      usage: 42
    },
    {
      id: '3',
      name: 'E-commerce Bot',
      description: 'Optimized for e-commerce sites with persistent login',
      viewport: { width: 1440, height: 900 },
      userAgent: 'Chrome/Latest',
      location: 'US',
      proxy: null,
      stealth: true,
      cookies: ['auth_token', 'session_id'],
      lastUsed: '30 minutes ago',
      usage: 89
    }
  ];

  const locations = [
    { value: 'US', label: 'United States' },
    { value: 'EU', label: 'Europe' },
    { value: 'ASIA', label: 'Asia Pacific' },
    { value: 'CA', label: 'Canada' },
    { value: 'AU', label: 'Australia' }
  ];

  const userAgents = [
    { value: 'chrome-latest', label: 'Chrome (Latest)' },
    { value: 'firefox-latest', label: 'Firefox (Latest)' },
    { value: 'safari-latest', label: 'Safari (Latest)' },
    { value: 'mobile-chrome', label: 'Mobile Chrome' },
    { value: 'mobile-safari', label: 'Mobile Safari' },
    { value: 'custom', label: 'Custom User Agent' }
  ];

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-6xl px-6 pt-[72px] pb-6 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Browser Profiles</h1>
          <Badge variant="secondary" className="ml-2">Session Management</Badge>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button data-testid="button-create-profile">
              <Plus className="w-4 h-4 mr-2" />
              New Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Browser Profile</DialogTitle>
              <DialogDescription>
                Configure a new browser profile for automation tasks
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="browser">Browser</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label htmlFor="profile-name">Profile Name</Label>
                  <Input
                    id="profile-name"
                    placeholder="My Automation Profile"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="profile-description">Description</Label>
                  <Textarea
                    id="profile-description"
                    placeholder="Describe what this profile will be used for..."
                    value={newProfileDescription}
                    onChange={(e) => setNewProfileDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select defaultValue="US">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.value} value={location.value}>
                          {location.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="browser" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="viewport-width">Viewport Width</Label>
                    <Input
                      id="viewport-width"
                      type="number"
                      defaultValue={1920}
                      placeholder="1920"
                    />
                  </div>
                  <div>
                    <Label htmlFor="viewport-height">Viewport Height</Label>
                    <Input
                      id="viewport-height"
                      type="number"
                      defaultValue={1080}
                      placeholder="1080"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="user-agent">User Agent</Label>
                  <Select defaultValue="chrome-latest">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {userAgents.map((agent) => (
                        <SelectItem key={agent.value} value={agent.value}>
                          {agent.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="proxy">Proxy (optional)</Label>
                  <Input
                    id="proxy"
                    placeholder="http://proxy.example.com:8080"
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Stealth Mode</div>
                      <div className="text-sm text-muted-foreground">
                        Hide automation indicators
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="toggle" />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Block Images</div>
                      <div className="text-sm text-muted-foreground">
                        Improve performance by blocking images
                      </div>
                    </div>
                    <input type="checkbox" className="toggle" />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Persistent Cookies</div>
                      <div className="text-sm text-muted-foreground">
                        Save cookies between sessions
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="toggle" />
                  </div>

                  <div>
                    <Label htmlFor="custom-headers">Custom Headers (JSON)</Label>
                    <Textarea
                      id="custom-headers"
                      placeholder='{"X-Custom-Header": "value"}'
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline">Cancel</Button>
              <Button>Create Profile</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{profile.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {profile.description}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3 h-3 text-gray-500" />
                    <span className="text-muted-foreground">
                      {profile.viewport.width}×{profile.viewport.height}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-gray-500" />
                    <span className="text-muted-foreground">
                      {profile.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-gray-500" />
                    <span className="text-muted-foreground">
                      {profile.stealth ? 'Stealth' : 'Standard'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-muted-foreground">
                      {profile.lastUsed}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Used {profile.usage} times
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Settings className="w-3 h-3 mr-1" />
                      Configure
                    </Button>
                    <Button size="sm">
                      Use Profile
                    </Button>
                  </div>
                </div>

                {profile.cookies.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      Stored Cookies:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {profile.cookies.map((cookie, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {cookie}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}