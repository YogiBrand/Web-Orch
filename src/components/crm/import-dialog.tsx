import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, 
  FileText, 
  Building2, 
  Users,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [step, setStep] = useState<'select' | 'upload' | 'mapping' | 'complete'>('select');
  const [selectedType, setSelectedType] = useState<'companies' | 'contacts' | null>(null);

  const handleTypeSelect = (type: 'companies' | 'contacts') => {
    setSelectedType(type);
    setStep('upload');
  };

  const reset = () => {
    setStep('select');
    setSelectedType(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300); // Reset after dialog closes
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import companies or contacts from CSV, Excel, or JSON files
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">What would you like to import?</h3>
              <p className="text-sm text-muted-foreground">
                Choose the type of data you want to import
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTypeSelect('companies')}
                data-testid="import-type-companies"
              >
                <CardContent className="p-6 text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <h4 className="font-medium mb-2">Companies</h4>
                  <p className="text-sm text-muted-foreground">
                    Import company data including name, domain, industry, and size
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTypeSelect('contacts')}
                data-testid="import-type-contacts"
              >
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h4 className="font-medium mb-2">Contacts</h4>
                  <p className="text-sm text-muted-foreground">
                    Import contact data including names, emails, phones, and titles
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                Import {selectedType === 'companies' ? 'Companies' : 'Contacts'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload your file and we'll automatically detect the columns
              </p>
            </div>

            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h4 className="text-lg font-medium mb-2">Drag and drop your file here</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Or click to browse for CSV, Excel, or JSON files
                </p>
                <Button variant="outline" data-testid="button-browse-file">
                  <FileText className="h-4 w-4 mr-2" />
                  Browse Files
                </Button>
              </div>
            </div>

            {/* Sample Data Format */}
            <Card>
              <CardContent className="p-4">
                <h5 className="font-medium mb-2">Expected Format:</h5>
                {selectedType === 'companies' ? (
                  <div className="text-sm text-muted-foreground">
                    <p>Company Name, Domain, Website, Industry, Size, Location</p>
                    <p className="text-xs mt-1">Example: "Acme Inc", "acme.com", "https://acme.com", "Technology", "medium", "San Francisco, CA"</p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p>First Name, Last Name, Email, Phone, Title, Company, LinkedIn</p>
                    <p className="text-xs mt-1">Example: "John", "Doe", "john@acme.com", "+1234567890", "CEO", "Acme Inc", "linkedin.com/in/johndoe"</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={reset}>
                Back
              </Button>
              <Button disabled data-testid="button-continue-upload">
                Continue (Upload a file first)
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Map Your Columns</h3>
              <p className="text-sm text-muted-foreground">
                Verify that your columns are mapped correctly
              </p>
            </div>

            {/* Column Mapping Preview */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                    <span className="font-medium">Company Name</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                    <span className="font-medium">Domain</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                    <span className="font-medium">Industry</span>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={() => setStep('complete')} data-testid="button-start-import">
                Start Import
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <div>
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium mb-2">Import Complete!</h3>
              <p className="text-sm text-muted-foreground">
                Successfully imported 50 {selectedType} with 3 duplicates skipped
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleClose} data-testid="button-view-imported">
                View Imported Data
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}