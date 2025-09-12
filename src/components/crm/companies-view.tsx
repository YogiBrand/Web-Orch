import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Building2, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Globe, 
  MapPin,
  Users,
  Edit,
  Trash2,
  ExternalLink,
  Zap,
  Settings,
  Play,
  UserPlus,
  ListPlus
} from "lucide-react";
import { CompanyForm } from "./company-form";
import { apiRequest } from "@/lib/queryClient";
import type { Company } from "@shared/schema";

export function CompaniesView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/crm/companies"],
    select: (data) => data?.data || [],
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/crm/companies", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
      setShowCompanyForm(false);
      setSelectedCompany(null);
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/crm/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
      setShowCompanyForm(false);
      setSelectedCompany(null);
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/crm/companies/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
      setShowDeleteDialog(false);
      setCompanyToDelete(null);
    },
  });

  const enrichCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/crm/companies/${id}/enrich`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/companies"] });
    },
  });

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEnrichmentBadge = (status: string | null) => {
    switch (status) {
      case "enriched":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Enriched</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "failed":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="outline">Not Enriched</Badge>;
    }
  };

  const getSizeBadge = (size: string | null) => {
    const sizeColors = {
      small: "bg-blue-100 text-blue-800",
      medium: "bg-purple-100 text-purple-800", 
      large: "bg-orange-100 text-orange-800",
      enterprise: "bg-red-100 text-red-800"
    };
    
    if (!size) return null;
    
    return (
      <Badge variant="secondary" className={sizeColors[size as keyof typeof sizeColors]}>
        {size.charAt(0).toUpperCase() + size.slice(1)}
      </Badge>
    );
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyForm(true);
  };

  const handleDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
    setShowDeleteDialog(true);
  };

  const handleEnrichCompany = (company: Company) => {
    enrichCompanyMutation.mutate(company.id);
  };

  const handleRunTask = (company: Company) => {
    // TODO: Implement run task functionality
    console.log('Running task for company:', company.name);
  };

  const handleAddToList = (company: Company) => {
    // TODO: Implement add to list functionality
    console.log('Adding company to list:', company.name);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Companies</h2>
          <p className="text-muted-foreground">
            Manage your company database and enrichment
          </p>
        </div>
        <Button 
          onClick={() => setShowCompanyForm(true)}
          className="gap-2"
          data-testid="button-add-company"
        >
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search companies by name, domain, or industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-companies"
            />
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Companies ({filteredCompanies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading companies...</div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No companies found matching your search." : "No companies yet. Add your first company to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Enrichment</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id} data-testid={`company-row-${company.id}`}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{company.name}</span>
                        </div>
                        {company.website && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <a 
                              href={company.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {company.domain || company.website}
                            </a>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{company.industry || "-"}</TableCell>
                    <TableCell>{getSizeBadge(company.size)}</TableCell>
                    <TableCell>
                      {company.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{company.location}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getEnrichmentBadge(company.enrichmentStatus)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(company.createdAt!).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`company-menu-${company.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleRunTask(company)}
                            data-testid={`run-task-${company.id}`}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Run Task
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Record Management</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleAddToList(company)}
                            data-testid={`add-to-list-${company.id}`}
                          >
                            <ListPlus className="h-4 w-4 mr-2" />
                            Add to List
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEditCompany(company)}
                            data-testid={`edit-company-${company.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCompany(company)}
                            className="text-red-600"
                            data-testid={`delete-company-${company.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Record
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Data Enhancement</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleEnrichCompany(company)}
                            disabled={enrichCompanyMutation.isPending}
                            data-testid={`enrich-company-${company.id}`}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Enrich Company
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Company Form Dialog */}
      <CompanyForm
        open={showCompanyForm}
        onOpenChange={setShowCompanyForm}
        company={selectedCompany}
        onSubmit={(data) => {
          if (selectedCompany) {
            updateCompanyMutation.mutate({ id: selectedCompany.id, data });
          } else {
            createCompanyMutation.mutate(data);
          }
        }}
        isLoading={createCompanyMutation.isPending || updateCompanyMutation.isPending}
      />

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{companyToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => companyToDelete && deleteCompanyMutation.mutate(companyToDelete.id)}
              disabled={deleteCompanyMutation.isPending}
              data-testid="confirm-delete-company"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}