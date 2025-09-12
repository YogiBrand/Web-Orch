import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Building2, 
  List, 
  Upload, 
  Plus, 
  Download,
  Activity,
  TrendingUp,
  Database,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { CompaniesView } from "@/components/crm/companies-view";
import { ContactsView } from "@/components/crm/contacts-view";
import { ListsView } from "@/components/crm/lists-view";
import { ImportDialog } from "@/components/crm/import-dialog";
import { ComprehensiveDataExtraction } from "@/components/comprehensive-data-extraction";
import { DataEnrichmentDashboard } from "@/components/data-enrichment/DataEnrichmentDashboard";
import type { Company, Contact, CrmList } from "@shared/schema";

export function DataPortal() {
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Dashboard metrics queries
  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/crm/companies"],
    select: (data) => data?.data || []
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/crm/contacts"],
    select: (data) => data?.data || []
  });

  const { data: lists } = useQuery<CrmList[]>({
    queryKey: ["/api/crm/lists"],
    select: (data) => data?.data || []
  });

  const totalCompanies = companies?.length || 0;
  const totalContacts = contacts?.length || 0;
  const totalLists = lists?.length || 0;
  const enrichedCompanies = companies?.filter(c => c.enrichmentStatus === 'enriched').length || 0;
  const enrichedContacts = contacts?.filter(c => c.enrichmentStatus === 'enriched').length || 0;

  const recentActivity = [
    { type: "import", description: "Imported 50 companies from CSV", time: "2 hours ago" },
    { type: "enrichment", description: "Enriched 25 company profiles", time: "4 hours ago" },
    { type: "task", description: "Executed outreach task on Tech Companies list", time: "6 hours ago" },
    { type: "contact", description: "Added 15 new contacts", time: "1 day ago" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Page title="Data Portal" subtitle="Manage companies, contacts, and automation workflows" actions={
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowImportDialog(true)} className="gap-2" data-testid="button-import-data">
            <Upload className="h-4 w-4" />
            Import Data
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-export-data">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      }>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="companies" data-testid="tab-companies">Companies</TabsTrigger>
            <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
            <TabsTrigger value="lists" data-testid="tab-lists">Lists</TabsTrigger>
            <TabsTrigger value="enrichment" data-testid="tab-enrichment">
              <Sparkles className="h-4 w-4 mr-1" />
              Enrichment
            </TabsTrigger>
            <TabsTrigger value="extraction" data-testid="tab-extraction">Data Extraction</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-total-companies">
                    {totalCompanies}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {enrichedCompanies} enriched
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-total-contacts">
                    {totalContacts}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {enrichedContacts} enriched
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Lists</CardTitle>
                  <List className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-total-lists">
                    {totalLists}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ready for automation
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Enrichment Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-enrichment-rate">
                    {totalCompanies > 0 ? Math.round((enrichedCompanies / totalCompanies) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Company profiles
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Start common CRM workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setShowImportDialog(true)}
                  data-testid="button-quick-import"
                >
                  <Upload className="h-4 w-4" />
                  Import Data
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setSelectedTab("lists")}
                  data-testid="button-quick-create-list"
                >
                  <Plus className="h-4 w-4" />
                  Create List
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setSelectedTab("companies")}
                  data-testid="button-quick-add-company"
                >
                  <Building2 className="h-4 w-4" />
                  Add Company
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setSelectedTab("contacts")}
                  data-testid="button-quick-add-contact"
                >
                  <Users className="h-4 w-4" />
                  Add Contact
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest CRM and automation events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                        <Activity className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="h-[calc(100vh-200px)]">
            <CompaniesView />
          </TabsContent>

          <TabsContent value="contacts" className="h-[calc(100vh-200px)]">
            <ContactsView />
          </TabsContent>

          <TabsContent value="lists" className="h-[calc(100vh-200px)]">
            <ListsView />
          </TabsContent>

          <TabsContent value="enrichment" className="h-[calc(100vh-200px)]">
            <DataEnrichmentDashboard />
          </TabsContent>

          <TabsContent value="extraction" className="h-[calc(100vh-200px)]">
            <ComprehensiveDataExtraction />
          </TabsContent>
        </Tabs>
      </Page>

      {/* Import Dialog */}
      <ImportDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog}
      />
    </div>
  );
}