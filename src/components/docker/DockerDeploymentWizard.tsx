import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Container,
  Play,
  Settings,
  Cloud,
  Monitor,
  Shield,
  HardDrive,
  Network,
  Cpu,
  Memory,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Download,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';

const deploymentSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  name: z.string().min(1, 'Name is required'),
  imageId: z.string().min(1, 'Image ID is required'),
  version: z.string().default('latest'),
  environmentType: z.enum(['local', 'cloud', 'kubernetes']),
  
  // Basic Configuration
  ports: z.array(z.object({
    internal: z.number().min(1).max(65535),
    external: z.number().min(1).max(65535).optional()
  })).min(1),
  environment: z.record(z.string()).default({}),
  volumes: z.array(z.object({
    host: z.string(),
    container: z.string(),
    mode: z.enum(['ro', 'rw']).default('rw')
  })).default([]),
  
  // Resource Configuration
  resources: z.object({
    cpuLimit: z.string().optional(),
    memoryLimit: z.string().optional(),
    cpuReservation: z.string().optional(),
    memoryReservation: z.string().optional()
  }).optional(),
  
  // Health Check
  healthCheck: z.object({
    test: z.array(z.string()).min(1),
    interval: z.string().default('30s'),
    timeout: z.string().default('10s'),
    retries: z.number().default(3)
  }).optional(),
  
  // Security & Runtime
  restartPolicy: z.enum(['no', 'always', 'unless-stopped', 'on-failure']).default('unless-stopped'),
  user: z.string().optional(),
  workingDir: z.string().optional(),
  
  // Deployment Options
  cloudConfig: z.object({
    provider: z.enum(['aws', 'gcp', 'azure']),
    region: z.string(),
    cluster: z.string().optional(),
    namespace: z.string().optional()
  }).optional(),
  
  scaling: z.object({
    min: z.number().default(1),
    max: z.number().default(3),
    targetCpu: z.number().optional(),
    targetMemory: z.number().optional()
  }).optional(),
  
  monitoring: z.object({
    enabled: z.boolean().default(true),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info')
  }).default({ enabled: true, logLevel: 'info' }),
  
  security: z.object({
    enableFirewall: z.boolean().default(true),
    allowedPorts: z.array(z.number()).optional(),
    secretsMode: z.enum(['env', 'file', 'vault']).default('env'),
    runAsNonRoot: z.boolean().default(true)
  }).default({
    enableFirewall: true,
    secretsMode: 'env',
    runAsNonRoot: true
  })
});

interface DeploymentStatus {
  id: string;
  status: 'initializing' | 'pulling' | 'building' | 'deploying' | 'running' | 'stopping' | 'stopped' | 'failed' | 'healthy' | 'unhealthy';
  progress: number;
  message: string;
  containerId?: string;
  containerName?: string;
  ports?: { internal: number; external: number }[];
  logs?: string[];
  error?: string;
  startedAt?: Date;
  updatedAt: Date;
}

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  imageId: string;
  version: string;
  category: string;
  tags: string[];
  defaultPorts: { internal: number; external?: number }[];
  defaultEnvironment: Record<string, string>;
  requiredVolumes?: { host: string; container: string; mode?: 'ro' | 'rw' }[];
  verified: boolean;
  downloads: number;
  rating: number;
  lastUpdated: string;
}

interface DockerDeploymentWizardProps {
  marketplaceItem?: MarketplaceItem;
  onDeploymentComplete?: (deployment: DeploymentStatus) => void;
  trigger?: React.ReactNode;
}

export const DockerDeploymentWizard: React.FC<DockerDeploymentWizardProps> = ({
  marketplaceItem,
  onDeploymentComplete,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [deployment, setDeployment] = useState<DeploymentStatus | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [environmentVars, setEnvironmentVars] = useState<Array<{ key: string; value: string; isSecret?: boolean }>>([]);
  const [portMappings, setPortMappings] = useState<Array<{ internal: number; external?: number }>>([]);
  const [volumeMappings, setVolumeMappings] = useState<Array<{ host: string; container: string; mode: 'ro' | 'rw' }>>([]);

  const form = useForm<z.infer<typeof deploymentSchema>>({
    resolver: zodResolver(deploymentSchema),
    defaultValues: {
      agentId: marketplaceItem?.id || '',
      name: marketplaceItem?.name || '',
      imageId: marketplaceItem?.imageId || '',
      version: marketplaceItem?.version || 'latest',
      environmentType: 'local',
      ports: marketplaceItem?.defaultPorts || [{ internal: 3000, external: 3000 }],
      environment: marketplaceItem?.defaultEnvironment || {},
      volumes: marketplaceItem?.requiredVolumes || [],
      restartPolicy: 'unless-stopped',
      monitoring: { enabled: true, logLevel: 'info' },
      security: { enableFirewall: true, secretsMode: 'env', runAsNonRoot: true }
    }
  });

  const steps = [
    { id: 'basic', title: 'Basic Configuration', icon: Settings },
    { id: 'environment', title: 'Environment & Ports', icon: Network },
    { id: 'resources', title: 'Resources & Health', icon: Cpu },
    { id: 'deployment', title: 'Deployment Options', icon: Cloud },
    { id: 'security', title: 'Security & Monitoring', icon: Shield },
    { id: 'review', title: 'Review & Deploy', icon: Play }
  ];

  // Initialize form values when marketplace item changes
  useEffect(() => {
    if (marketplaceItem) {
      setEnvironmentVars(
        Object.entries(marketplaceItem.defaultEnvironment || {}).map(([key, value]) => ({
          key,
          value,
          isSecret: key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
        }))
      );
      setPortMappings(marketplaceItem.defaultPorts || []);
      setVolumeMappings(marketplaceItem.requiredVolumes || []);
    }
  }, [marketplaceItem]);

  const handleDeploy = async (values: z.infer<typeof deploymentSchema>) => {
    setIsDeploying(true);
    
    try {
      // Convert form data to deployment payload
      const deploymentPayload = {
        ...values,
        environment: Object.fromEntries(
          environmentVars.map(env => [env.key, env.value])
        ),
        ports: portMappings,
        volumes: volumeMappings
      };

      // Mock deployment API call
      const response = await fetch('/api/docker/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentPayload),
      });

      if (!response.ok) {
        throw new Error(`Deployment failed: ${response.statusText}`);
      }

      const deploymentResult = await response.json();
      setDeployment(deploymentResult);
      
      // Start polling for deployment status
      pollDeploymentStatus(deploymentResult.id);
      
      onDeploymentComplete?.(deploymentResult);
      
    } catch (error) {
      console.error('Deployment failed:', error);
      // Handle error state
    } finally {
      setIsDeploying(false);
    }
  };

  const pollDeploymentStatus = async (deploymentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/docker/deployments/${deploymentId}`);
        if (response.ok) {
          const status = await response.json();
          setDeployment(status);
          
          if (status.status === 'healthy' || status.status === 'failed') {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Failed to poll deployment status:', error);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const addEnvironmentVar = () => {
    setEnvironmentVars([...environmentVars, { key: '', value: '', isSecret: false }]);
  };

  const updateEnvironmentVar = (index: number, field: string, value: string | boolean) => {
    const updated = [...environmentVars];
    updated[index] = { ...updated[index], [field]: value };
    setEnvironmentVars(updated);
  };

  const removeEnvironmentVar = (index: number) => {
    setEnvironmentVars(environmentVars.filter((_, i) => i !== index));
  };

  const addPortMapping = () => {
    setPortMappings([...portMappings, { internal: 3000, external: 3000 }]);
  };

  const updatePortMapping = (index: number, field: string, value: number) => {
    const updated = [...portMappings];
    updated[index] = { ...updated[index], [field]: value };
    setPortMappings(updated);
  };

  const removePortMapping = (index: number) => {
    setPortMappings(portMappings.filter((_, i) => i !== index));
  };

  const addVolumeMapping = () => {
    setVolumeMappings([...volumeMappings, { host: '', container: '', mode: 'rw' }]);
  };

  const updateVolumeMapping = (index: number, field: string, value: string) => {
    const updated = [...volumeMappings];
    updated[index] = { ...updated[index], [field]: value };
    setVolumeMappings(updated);
  };

  const removeVolumeMapping = (index: number) => {
    setVolumeMappings(volumeMappings.filter((_, i) => i !== index));
  };

  const renderStepContent = () => {
    const currentStepId = steps[currentStep]?.id;
    
    switch (currentStepId) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Installation Name</FormLabel>
                    <FormControl>
                      <Input placeholder="my-agent-instance" {...field} />
                    </FormControl>
                    <FormDescription>
                      A unique name for this agent installation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Version</FormLabel>
                    <FormControl>
                      <Input placeholder="latest" {...field} />
                    </FormControl>
                    <FormDescription>
                      Container image version tag
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Container Image</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="registry.example.com/agent-name:latest" 
                      {...field} 
                      readOnly={!!marketplaceItem}
                    />
                  </FormControl>
                  <FormDescription>
                    Docker image repository and tag
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="environmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deployment Environment</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select deployment environment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="local">
                        <div className="flex items-center space-x-2">
                          <Container className="h-4 w-4" />
                          <span>Local Docker</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cloud">
                        <div className="flex items-center space-x-2">
                          <Cloud className="h-4 w-4" />
                          <span>Cloud (AWS/GCP/Azure)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="kubernetes">
                        <div className="flex items-center space-x-2">
                          <Network className="h-4 w-4" />
                          <span>Kubernetes</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose where to deploy this agent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 'environment':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Environment Variables</h4>
              <div className="space-y-2">
                {environmentVars.map((env, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder="Variable name"
                      value={env.key}
                      onChange={(e) => updateEnvironmentVar(index, 'key', e.target.value)}
                      className="w-1/3"
                    />
                    <Input
                      placeholder="Value"
                      type={env.isSecret ? 'password' : 'text'}
                      value={env.value}
                      onChange={(e) => updateEnvironmentVar(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateEnvironmentVar(index, 'isSecret', !env.isSecret)}
                    >
                      {env.isSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeEnvironmentVar(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addEnvironmentVar} className="w-full">
                  + Add Environment Variable
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-3">Port Mappings</h4>
              <div className="space-y-2">
                {portMappings.map((port, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 w-1/2">
                      <Input
                        type="number"
                        placeholder="Host port"
                        value={port.external || ''}
                        onChange={(e) => updatePortMapping(index, 'external', parseInt(e.target.value) || undefined)}
                      />
                      <span className="text-sm text-muted-foreground">:</span>
                      <Input
                        type="number"
                        placeholder="Container port"
                        value={port.internal}
                        onChange={(e) => updatePortMapping(index, 'internal', parseInt(e.target.value) || 3000)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removePortMapping(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addPortMapping} className="w-full">
                  + Add Port Mapping
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-3">Volume Mounts</h4>
              <div className="space-y-2">
                {volumeMappings.map((volume, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder="Host path"
                      value={volume.host}
                      onChange={(e) => updateVolumeMapping(index, 'host', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">:</span>
                    <Input
                      placeholder="Container path"
                      value={volume.container}
                      onChange={(e) => updateVolumeMapping(index, 'container', e.target.value)}
                      className="flex-1"
                    />
                    <Select
                      value={volume.mode}
                      onValueChange={(value) => updateVolumeMapping(index, 'mode', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rw">rw</SelectItem>
                        <SelectItem value="ro">ro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeVolumeMapping(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addVolumeMapping} className="w-full">
                  + Add Volume Mount
                </Button>
              </div>
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="resources.cpuLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPU Limit</FormLabel>
                    <FormControl>
                      <Input placeholder="1000m (1 CPU)" {...field} />
                    </FormControl>
                    <FormDescription>
                      Maximum CPU usage (e.g., 500m, 1.5)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resources.memoryLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memory Limit</FormLabel>
                    <FormControl>
                      <Input placeholder="512MB" {...field} />
                    </FormControl>
                    <FormDescription>
                      Maximum memory usage (e.g., 512MB, 1GB)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resources.cpuReservation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPU Reservation</FormLabel>
                    <FormControl>
                      <Input placeholder="100m" {...field} />
                    </FormControl>
                    <FormDescription>
                      Guaranteed CPU allocation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resources.memoryReservation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memory Reservation</FormLabel>
                    <FormControl>
                      <Input placeholder="256MB" {...field} />
                    </FormControl>
                    <FormDescription>
                      Guaranteed memory allocation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Health Check Configuration</h4>
                <Switch
                  checked={!!form.watch('healthCheck')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      form.setValue('healthCheck', {
                        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
                        interval: '30s',
                        timeout: '10s',
                        retries: 3
                      });
                    } else {
                      form.setValue('healthCheck', undefined);
                    }
                  }}
                />
              </div>

              {form.watch('healthCheck') && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="healthCheck.test"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Health Check Command</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="curl -f http://localhost:3000/health"
                            value={field.value?.join(' ') || ''}
                            onChange={(e) => field.onChange(e.target.value.split(' '))}
                          />
                        </FormControl>
                        <FormDescription>
                          Command to check container health
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="healthCheck.interval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval</FormLabel>
                          <FormControl>
                            <Input placeholder="30s" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="healthCheck.timeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeout</FormLabel>
                          <FormControl>
                            <Input placeholder="10s" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="healthCheck.retries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retries</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="3"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="restartPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restart Policy</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no">No restart</SelectItem>
                      <SelectItem value="always">Always restart</SelectItem>
                      <SelectItem value="unless-stopped">Unless stopped</SelectItem>
                      <SelectItem value="on-failure">On failure only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    When to automatically restart the container
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 'deployment':
        const environmentType = form.watch('environmentType');
        
        return (
          <div className="space-y-6">
            {environmentType === 'cloud' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Cloud Configuration</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cloudConfig.provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cloud Provider</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="aws">Amazon Web Services</SelectItem>
                            <SelectItem value="gcp">Google Cloud Platform</SelectItem>
                            <SelectItem value="azure">Microsoft Azure</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cloudConfig.region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl>
                          <Input placeholder="us-east-1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {environmentType === 'kubernetes' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Kubernetes Configuration</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cloudConfig.cluster"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cluster</FormLabel>
                        <FormControl>
                          <Input placeholder="my-k8s-cluster" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cloudConfig.namespace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Namespace</FormLabel>
                        <FormControl>
                          <Input placeholder="default" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {(environmentType === 'cloud' || environmentType === 'kubernetes') && (
              <>
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-3">Auto-Scaling</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="scaling.min"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Replicas</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scaling.max"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Replicas</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scaling.targetCpu"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target CPU %</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              placeholder="70"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scaling.targetMemory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Memory %</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              placeholder="80"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Security Options</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Run as non-root user</Label>
                    <p className="text-sm text-muted-foreground">
                      Run container with a non-root user for security
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="security.runAsNonRoot"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable firewall</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict network access to specified ports
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="security.enableFirewall"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="security.secretsMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secrets Management</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="env">Environment variables</SelectItem>
                          <SelectItem value="file">Mounted files</SelectItem>
                          <SelectItem value="vault">External vault</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How to manage sensitive configuration data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="1000:1000 or username" {...field} />
                      </FormControl>
                      <FormDescription>
                        User and group to run the container as
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-3">Monitoring</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable monitoring</Label>
                    <p className="text-sm text-muted-foreground">
                      Collect metrics and health status
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="monitoring.enabled"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="monitoring.logLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Log Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="debug">Debug</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warn">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Minimum log level to capture
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 'review':
        const values = form.getValues();
        
        return (
          <div className="space-y-6">
            {/* Deployment Progress */}
            {deployment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Monitor className="h-5 w-5" />
                    <span>Deployment Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{deployment.message}</span>
                    <Badge 
                      variant={
                        deployment.status === 'healthy' ? 'default' :
                        deployment.status === 'failed' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {deployment.status}
                    </Badge>
                  </div>
                  
                  <Progress value={deployment.progress} className="h-2" />
                  
                  {deployment.error && (
                    <div className="flex items-start space-x-2 p-3 bg-destructive/10 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="text-sm text-destructive">
                        <strong>Error:</strong> {deployment.error}
                      </div>
                    </div>
                  )}

                  {deployment.status === 'healthy' && deployment.ports && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Deployment Successful
                        </span>
                      </div>
                      <div className="text-sm text-green-700">
                        <strong>Access URLs:</strong>
                        <div className="mt-1 space-y-1">
                          {deployment.ports.map((port, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <code className="px-2 py-1 bg-white rounded text-xs">
                                http://localhost:{port.external}
                              </code>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`http://localhost:${port.external}`, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {deployment.logs && deployment.logs.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Recent Logs</h5>
                      <ScrollArea className="h-32 w-full border rounded-md p-2 text-xs font-mono">
                        {deployment.logs.slice(-10).map((log, index) => (
                          <div key={index} className="mb-1">
                            {log}
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Configuration Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration Summary</CardTitle>
                <CardDescription>
                  Review your deployment configuration before proceeding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-muted-foreground">{values.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Environment</Label>
                    <p className="text-sm text-muted-foreground">{values.environmentType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Image</Label>
                    <p className="text-sm text-muted-foreground">{values.imageId}:{values.version}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Restart Policy</Label>
                    <p className="text-sm text-muted-foreground">{values.restartPolicy}</p>
                  </div>
                </div>

                {portMappings.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Port Mappings</Label>
                    <div className="mt-1 space-y-1">
                      {portMappings.map((port, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {port.external || port.internal}:{port.internal}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {environmentVars.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Environment Variables</Label>
                    <div className="mt-1 space-y-1">
                      {environmentVars.map((env, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {env.key}={env.isSecret ? '***' : env.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {values.resources && (
                  <div>
                    <Label className="text-sm font-medium">Resources</Label>
                    <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {values.resources.cpuLimit && (
                        <div>CPU Limit: {values.resources.cpuLimit}</div>
                      )}
                      {values.resources.memoryLimit && (
                        <div>Memory Limit: {values.resources.memoryLimit}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Deploy Agent
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Container className="h-5 w-5" />
            <span>Deploy {marketplaceItem?.name || 'Agent'}</span>
          </DialogTitle>
          <DialogDescription>
            Configure and deploy your agent container with comprehensive options
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={steps[currentStep]?.id} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-6">
              {steps.map((step, index) => (
                <TabsTrigger
                  key={step.id}
                  value={step.id}
                  disabled={index > currentStep}
                  className="flex items-center space-x-1 text-xs"
                >
                  <step.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{step.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleDeploy)} className="flex-1 overflow-hidden">
                <ScrollArea className="h-full px-1">
                  <div className="p-6">
                    {renderStepContent()}
                  </div>
                </ScrollArea>

                <DialogFooter className="mt-4">
                  <div className="flex justify-between w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                      disabled={currentStep === 0}
                    >
                      Previous
                    </Button>

                    <div className="flex space-x-2">
                      {currentStep < steps.length - 1 ? (
                        <Button
                          type="button"
                          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                        >
                          Next
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={isDeploying}
                          className="min-w-[120px]"
                        >
                          {isDeploying ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deploying...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Deploy
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};