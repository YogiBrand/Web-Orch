import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  Database,
  FileSpreadsheet,
  Zap,
  Check,
  X,
  Shuffle,
  Link2,
  Info
} from "lucide-react";
import { EnrichmentJob } from "./DataEnrichmentDashboard";

interface FieldMappingInterfaceProps {
  job: EnrichmentJob;
  onComplete: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

interface FieldMapping {
  source: string;
  target: string;
  required: boolean;
  confidence: number;
}

const STANDARD_FIELDS = {
  company: [
    { key: 'name', label: 'Company Name', required: true },
    { key: 'domain', label: 'Domain', required: false },
    { key: 'website', label: 'Website', required: false },
    { key: 'industry', label: 'Industry', required: false },
    { key: 'size', label: 'Company Size', required: false },
    { key: 'location', label: 'Location', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'linkedinUrl', label: 'LinkedIn URL', required: false },
    { key: 'foundedYear', label: 'Founded Year', required: false },
    { key: 'revenue', label: 'Revenue', required: false },
    { key: 'employees', label: 'Employee Count', required: false },
  ],
  contact: [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'title', label: 'Job Title', required: false },
    { key: 'company', label: 'Company', required: false },
    { key: 'linkedinUrl', label: 'LinkedIn URL', required: false },
    { key: 'location', label: 'Location', required: false },
    { key: 'department', label: 'Department', required: false },
    { key: 'seniority', label: 'Seniority', required: false },
  ]
};

const ENRICHMENT_PROVIDERS = [
  { id: 'clearbit', name: 'Clearbit', fields: ['company', 'contact'], cost: 0.05 },
  { id: 'hunter', name: 'Hunter.io', fields: ['email'], cost: 0.02 },
  { id: 'apollo', name: 'Apollo', fields: ['company', 'contact'], cost: 0.04 },
  { id: 'zoominfo', name: 'ZoomInfo', fields: ['company', 'contact'], cost: 0.08 },
  { id: 'lusha', name: 'Lusha', fields: ['contact'], cost: 0.03 },
];

export function FieldMappingInterface({ job, onComplete, onCancel }: FieldMappingInterfaceProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['clearbit']);
  const [autoMapAttempted, setAutoMapAttempted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [estimatedCost, setEstimatedCost] = useState(0);

  const sourceFields = job.fields || [];
  const targetFields = STANDARD_FIELDS[job.type as keyof typeof STANDARD_FIELDS] || [];

  // Auto-map fields on load
  useEffect(() => {
    if (!autoMapAttempted && sourceFields.length > 0) {
      autoMapFields();
      setAutoMapAttempted(true);
    }
  }, [sourceFields, autoMapAttempted]);

  // Calculate estimated cost
  useEffect(() => {
    const cost = selectedProviders.reduce((sum, providerId) => {
      const provider = ENRICHMENT_PROVIDERS.find(p => p.id === providerId);
      return sum + (provider?.cost || 0) * job.totalRecords;
    }, 0);
    setEstimatedCost(cost);
  }, [selectedProviders, job.totalRecords]);

  const autoMapFields = () => {
    const newMappings: FieldMapping[] = [];
    
    targetFields.forEach((targetField) => {
      // Try to find exact match
      let matchedSource = sourceFields.find(
        sf => sf.toLowerCase() === targetField.label.toLowerCase()
      );
      
      // Try partial match
      if (!matchedSource) {
        matchedSource = sourceFields.find(
          sf => sf.toLowerCase().includes(targetField.key.toLowerCase()) ||
                targetField.key.toLowerCase().includes(sf.toLowerCase())
        );
      }
      
      // Try common variations
      const variations: Record<string, string[]> = {
        'name': ['company', 'companyName', 'company_name', 'business', 'organization'],
        'email': ['emailAddress', 'email_address', 'mail', 'contact_email'],
        'phone': ['phoneNumber', 'phone_number', 'tel', 'telephone', 'mobile'],
        'website': ['url', 'site', 'web', 'homepage'],
        'firstName': ['first_name', 'fname', 'given_name'],
        'lastName': ['last_name', 'lname', 'surname', 'family_name'],
      };
      
      if (!matchedSource && variations[targetField.key]) {
        matchedSource = sourceFields.find(sf => 
          variations[targetField.key].some(v => 
            sf.toLowerCase().includes(v.toLowerCase())
          )
        );
      }
      
      newMappings.push({
        source: matchedSource || '',
        target: targetField.key,
        required: targetField.required,
        confidence: matchedSource ? (
          sourceFields.find(sf => sf.toLowerCase() === targetField.label.toLowerCase()) ? 100 :
          sourceFields.find(sf => sf.toLowerCase().includes(targetField.key.toLowerCase())) ? 80 :
          60
        ) : 0
      });
    });
    
    setMappings(newMappings);
  };

  const updateMapping = (targetKey: string, sourceField: string) => {
    setMappings(prev => prev.map(m => 
      m.target === targetKey ? { ...m, source: sourceField, confidence: 100 } : m
    ));
  };

  const validateMappings = (): boolean => {
    const errors: string[] = [];
    
    // Check required fields
    const unmappedRequired = mappings.filter(m => m.required && !m.source);
    if (unmappedRequired.length > 0) {
      errors.push(`Required fields not mapped: ${unmappedRequired.map(m => {
        const field = targetFields.find(f => f.key === m.target);
        return field?.label || m.target;
      }).join(', ')}`);
    }
    
    // Check duplicate source mappings
    const sourceCounts = mappings.reduce((acc, m) => {
      if (m.source) {
        acc[m.source] = (acc[m.source] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const duplicates = Object.entries(sourceCounts)
      .filter(([_, count]) => count > 1)
      .map(([field]) => field);
    
    if (duplicates.length > 0) {
      errors.push(`Source fields mapped multiple times: ${duplicates.join(', ')}`);
    }
    
    // Check if at least one provider is selected
    if (selectedProviders.length === 0) {
      errors.push('Please select at least one enrichment provider');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleComplete = () => {
    if (validateMappings()) {
      const mappingObject = mappings.reduce((acc, m) => {
        if (m.source) {
          acc[m.target] = m.source;
        }
        return acc;
      }, {} as Record<string, string>);
      
      onComplete(mappingObject);
    }
  };

  const toggleProvider = (providerId: string) => {
    setSelectedProviders(prev => 
      prev.includes(providerId) 
        ? prev.filter(p => p !== providerId)
        : [...prev, providerId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configure Field Mapping</CardTitle>
              <CardDescription>
                Map your source fields to standard enrichment fields
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {job.totalRecords} records
              </Badge>
              <Badge variant="outline">
                {sourceFields.length} source fields
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-hidden h-[calc(100%-8rem)]">
          <div className="grid grid-cols-2 h-full">
            {/* Left Panel - Mapping Interface */}
            <div className="border-r p-6 overflow-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Field Mappings</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={autoMapFields}
                    className="gap-2"
                  >
                    <Shuffle className="h-3 w-3" />
                    Auto-map
                  </Button>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {targetFields.map((targetField) => {
                      const mapping = mappings.find(m => m.target === targetField.key);
                      return (
                        <div key={targetField.key} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">
                              {targetField.label}
                              {targetField.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </Label>
                            {mapping?.confidence && mapping.confidence < 100 && mapping.source && (
                              <Badge variant="outline" className="text-xs">
                                {mapping.confidence}% match
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={mapping?.source || ''}
                              onValueChange={(value) => updateMapping(targetField.key, value)}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select source field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {sourceFields.map((field) => (
                                  <SelectItem key={field} value={field}>
                                    <div className="flex items-center gap-2">
                                      <FileSpreadsheet className="h-3 w-3" />
                                      {field}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {mapping?.source && (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Right Panel - Provider Selection */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Enrichment Providers</h3>
                  <div className="space-y-3">
                    {ENRICHMENT_PROVIDERS.map((provider) => (
                      <div
                        key={provider.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedProviders.includes(provider.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                        onClick={() => toggleProvider(provider.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedProviders.includes(provider.id)}
                              onCheckedChange={() => toggleProvider(provider.id)}
                            />
                            <div>
                              <p className="font-medium">{provider.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {provider.fields.join(', ')} enrichment
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              ${provider.cost}/record
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${(provider.cost * job.totalRecords).toFixed(2)} total
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Estimated Cost:</strong> ${estimatedCost.toFixed(2)}
                      <br />
                      <span className="text-xs">
                        Processing {job.totalRecords} records with {selectedProviders.length} provider(s)
                      </span>
                    </AlertDescription>
                  </Alert>

                  {validationErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside text-sm">
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Enrichment Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox defaultChecked />
                      Skip already enriched records
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox defaultChecked />
                      Validate email addresses
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox />
                      Use cached data (if available)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {mappings.filter(m => m.source).length}/{targetFields.length} fields mapped
            </span>
            <Button
              onClick={handleComplete}
              disabled={validationErrors.length > 0}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Start Enrichment
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}