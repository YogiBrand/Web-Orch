import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, MapPin, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CSVUploadWizardProps {
  onClose: () => void;
}

interface FieldMapping {
  [csvField: string]: string;
}

interface UploadPreview {
  headers: string[];
  preview: string[][];
  totalRows: number;
  entityType: string;
  availableFields: string[];
}

export function CSVUploadWizard({ onClose }: CSVUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  console.log('CSVUploadWizard render - currentStep:', currentStep);
  const [csvData, setCsvData] = useState('');
  const [entityType, setEntityType] = useState<'companies' | 'contacts'>('companies');
  const [delimiter, setDelimiter] = useState(',');
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping>({});
  const [createList, setCreateList] = useState(false);
  const [listName, setListName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data: { csvData: string; entityType: string; delimiter: string }) => {
      console.log('Making API request to /api/crm/upload with:', data);
      return await apiRequest('/api/crm/upload', 'POST', data);
    },
    onSuccess: (data) => {
      console.log('Upload success, received data:', data);
      try {
        setUploadPreview(data);
        setCurrentStep(2);
        console.log('Successfully set step to 2 and uploadPreview');
      
      // Auto-map fields with similar names
      const autoMappings: FieldMapping = {};
      if (data.headers && data.availableFields) {
        data.headers.forEach((header: string) => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchingField = data.availableFields.find((field: string) => 
            field.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedHeader) ||
            normalizedHeader.includes(field.toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
          if (matchingField) {
            autoMappings[header] = matchingField;
          }
        });
      }
      setFieldMappings(autoMappings);
      console.log('Set field mappings:', autoMappings);
      } catch (error) {
        console.error('Error in onSuccess handler:', error);
      }
    },
    onError: (error) => {
      console.error('Upload mutation error:', error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to process CSV file",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: {
      csvData: string;
      fieldMappings: FieldMapping;
      entityType: string;
      createList: boolean;
      listName?: string;
      delimiter: string;
    }) => {
      return await apiRequest('/api/crm/import', 'POST', data);
    },
    onSuccess: (data) => {
      setImportResult(data);
      setCurrentStep(4);
      
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/crm/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/lists'] });
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.imported} ${entityType}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Error",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(file);
    }
  };

  const handleUploadPreview = () => {
    if (!csvData.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide CSV data",
        variant: "destructive",
      });
      return;
    }

    console.log('Uploading CSV with data:', { csvData: csvData.substring(0, 100) + '...', entityType, delimiter });
    uploadMutation.mutate({ csvData, entityType, delimiter });
  };

  const handleFieldMappingChange = (csvField: string, dbField: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [csvField]: dbField
    }));
  };

  const handleImport = () => {
    if (Object.keys(fieldMappings).length === 0) {
      toast({
        title: "Validation Error",
        description: "Please map at least one field",
        variant: "destructive",
      });
      return;
    }

    if (createList && !listName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a list name",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    importMutation.mutate({
      csvData,
      fieldMappings,
      entityType,
      createList,
      listName: createList ? listName : undefined,
      delimiter
    });
  };

  const StepIndicator = ({ step, label, active, completed }: { 
    step: number; 
    label: string; 
    active: boolean; 
    completed: boolean; 
  }) => (
    <div className={`flex items-center ${step < 4 ? 'flex-1' : ''}`}>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
        completed ? 'bg-green-500 border-green-500 text-white' :
        active ? 'bg-blue-500 border-blue-500 text-white' :
        'bg-gray-100 border-gray-300 text-gray-500'
      }`}>
        {completed ? <CheckCircle className="w-4 h-4" /> : step}
      </div>
      <span className={`ml-2 text-sm font-medium ${
        active ? 'text-blue-600' : completed ? 'text-green-600' : 'text-gray-500'
      }`}>
        {label}
      </span>
      {step < 4 && (
        <div className={`flex-1 h-px mx-4 ${
          completed ? 'bg-green-500' : 'bg-gray-300'
        }`} />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CSV Upload Wizard</CardTitle>
              <CardDescription>
                Import companies or contacts from CSV files with automatic field mapping
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center mt-4">
            <StepIndicator 
              step={1} 
              label="Upload CSV" 
              active={currentStep === 1} 
              completed={currentStep > 1} 
            />
            <StepIndicator 
              step={2} 
              label="Map Fields" 
              active={currentStep === 2} 
              completed={currentStep > 2} 
            />
            <StepIndicator 
              step={3} 
              label="Import" 
              active={currentStep === 3} 
              completed={currentStep > 3} 
            />
            <StepIndicator 
              step={4} 
              label="Complete" 
              active={currentStep === 4} 
              completed={false} 
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="entity-type">Data Type</Label>
                  <Select value={entityType} onValueChange={(value: 'companies' | 'contacts') => setEntityType(value)}>
                    <SelectTrigger data-testid="select-entity-type">
                      <SelectValue placeholder="Select data type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="companies">Companies</SelectItem>
                      <SelectItem value="contacts">Contacts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="delimiter">Delimiter</Label>
                  <Select value={delimiter} onValueChange={setDelimiter}>
                    <SelectTrigger data-testid="select-delimiter">
                      <SelectValue placeholder="Select delimiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">Comma (,)</SelectItem>
                      <SelectItem value=";">Semicolon (;)</SelectItem>
                      <SelectItem value="\t">Tab</SelectItem>
                      <SelectItem value="|">Pipe (|)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="file-upload">Upload CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-2"
                  data-testid="input-file-upload"
                />
              </div>

              <div>
                <Label htmlFor="csv-data">Or Paste CSV Data</Label>
                <Textarea
                  id="csv-data"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder={`Paste your CSV data here...\n\nExample:\nname,email,phone\nJohn Doe,john@example.com,555-1234\nJane Smith,jane@example.com,555-5678`}
                  className="mt-2 h-48 font-mono text-sm"
                  data-testid="textarea-csv-data"
                />
              </div>

              <Button 
                onClick={handleUploadPreview} 
                disabled={!csvData.trim() || uploadMutation.isPending}
                className="w-full"
                data-testid="button-preview-upload"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadMutation.isPending ? 'Processing...' : 'Preview Import'}
              </Button>
            </div>
          )}

          {currentStep === 2 && uploadPreview && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Preview</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Found {uploadPreview.totalRows} rows with {uploadPreview.headers.length} columns
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Field Mapping</h4>
                <div className="grid gap-4">
                  {uploadPreview.headers.map((header) => (
                    <div key={header} className="flex items-center gap-4">
                      <div className="w-48">
                        <Badge variant="outline">{header}</Badge>
                      </div>
                      <div className="flex-1">
                        <Select
                          value={fieldMappings[header] || '__skip__'}
                          onValueChange={(value) => handleFieldMappingChange(header, value === '__skip__' ? '' : value)}
                        >
                          <SelectTrigger data-testid={`select-mapping-${header}`}>
                            <SelectValue placeholder="Select field to map to" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">Don't map</SelectItem>
                            {uploadPreview.availableFields.map((field) => (
                              <SelectItem key={field} value={field}>
                                {field}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Data Preview</h4>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {uploadPreview.headers.map((header) => (
                          <th key={header} className="p-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadPreview.preview.map((row, index) => (
                        <tr key={index} className="border-t">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)}
                  disabled={Object.keys(fieldMappings).length === 0}
                  data-testid="button-continue-mapping"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Import Configuration
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Review your settings before importing {uploadPreview?.totalRows} records
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="create-list" 
                    checked={createList}
                    onCheckedChange={(checked) => setCreateList(!!checked)}
                    data-testid="checkbox-create-list"
                  />
                  <Label htmlFor="create-list">
                    Create a new list from imported data
                  </Label>
                </div>

                {createList && (
                  <div>
                    <Label htmlFor="list-name">List Name</Label>
                    <Input
                      id="list-name"
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      placeholder="Enter list name..."
                      className="mt-2"
                      data-testid="input-list-name"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Import Summary</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Data Type:</strong> {entityType}</p>
                  <p><strong>Total Records:</strong> {uploadPreview?.totalRows}</p>
                  <p><strong>Mapped Fields:</strong> {Object.keys(fieldMappings).length}</p>
                  {createList && <p><strong>List Name:</strong> {listName}</p>}
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importing data...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(2)}
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={isProcessing || importMutation.isPending}
                  data-testid="button-start-import"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isProcessing || importMutation.isPending ? 'Importing...' : 'Start Import'}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 4 && importResult && (
            <div className="space-y-6 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                  Import Completed Successfully!
                </h3>
                <p className="text-green-700 dark:text-green-300 mt-2">
                  {importResult.message}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{importResult.imported}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Imported</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{importResult.failed}</div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">Failed</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-2xl font-bold">{importResult.total}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                </div>
              </div>

              {importResult.list && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                    List Created: {importResult.list.name}
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    {importResult.list.recordCount} records added to the new list
                  </p>
                </div>
              )}

              <Button onClick={onClose} className="w-full" data-testid="button-finish">
                Finish
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}