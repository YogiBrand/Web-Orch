import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompaniesView } from "./companies-view";
import { ContactsView } from "./contacts-view";
import { ListsView } from "./lists-view";
import { CSVUploadWizard } from "./csv-upload-wizard";
import { 
  Users, 
  Building2, 
  List, 
  Plus,
  Database,
  TrendingUp,
  Activity
} from "lucide-react";

export function DataPortal() {
  const [activeTab, setActiveTab] = useState("companies");
  const [showUploadWizard, setShowUploadWizard] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['/api/crm/companies'],
    select: (data) => data?.data || [],
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/crm/contacts'],
    select: (data) => data?.data || [],
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['/api/crm/lists'],
    select: (data) => data?.data || [],
  });

  const statsCards = [
    {
      title: "Total Companies",
      value: companies.length,
      icon: Building2,
      description: "Active companies in CRM",
      color: "text-blue-600"
    },
    {
      title: "Total Contacts",
      value: contacts.length,
      icon: Users,
      description: "Contact records",
      color: "text-green-600"
    },
    {
      title: "Active Lists",
      value: lists.length,
      icon: List,
      description: "Data lists for automation",
      color: "text-purple-600"
    },
    {
      title: "Data Health",
      value: "94%",
      icon: TrendingUp,
      description: "Complete records",
      color: "text-orange-600"
    }
  ];

  return (
    <div className="h-full bg-background">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">CRM Data Portal</h1>
            <p className="text-muted-foreground mt-1">
              Manage companies, contacts, and data lists for automation workflows
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowUploadWizard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-import-csv"
            >
              <Plus className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Badge variant="outline" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Data
            </Badge>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="lists" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Lists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-6">
            <CompaniesView />
          </TabsContent>

          <TabsContent value="contacts" className="mt-6">
            <ContactsView />
          </TabsContent>

          <TabsContent value="lists" className="mt-6">
            <ListsView />
          </TabsContent>
        </Tabs>
      </div>
      
      {showUploadWizard && (
        <CSVUploadWizard onClose={() => setShowUploadWizard(false)} />
      )}
    </div>
  );
}