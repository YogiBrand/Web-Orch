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
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone,
  Building2,
  ExternalLink,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  ListPlus,
  Zap
} from "lucide-react";
import { ContactForm } from "./contact-form";
import { apiRequest } from "@/lib/queryClient";
import type { Contact, Company } from "@shared/schema";

export function ContactsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Contact | null>(null);
  
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/crm/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setContactFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/crm/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setEditingContact(null);
      setContactFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/crm/contacts/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setDeleteDialog(null);
    },
  });

  const handleRunTask = (contact: Contact) => {
    console.log('Running task for contact:', contact.firstName, contact.lastName);
  };

  const handleAddToList = (contact: Contact) => {
    console.log('Adding contact to list:', contact.firstName, contact.lastName);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactFormOpen(true);
  };

  const handleDeleteContact = (contact: Contact) => {
    setDeleteDialog(contact);
  };

  const handleEnrichContact = (contact: Contact) => {
    console.log('Enriching contact:', contact.firstName, contact.lastName);
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setContactFormOpen(true);
  };

  const handleContactSubmit = (data: any) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/crm/contacts"],
    select: (data) => data?.data || [],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/crm/companies"],
    select: (data) => data?.data || [],
  });

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "-";
    const company = companies.find(c => c.id === companyId);
    return company?.name || "-";
  };

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.firstName?.toLowerCase().includes(searchLower) ||
      contact.lastName?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.title?.toLowerCase().includes(searchLower) ||
      getCompanyName(contact.companyId).toLowerCase().includes(searchLower)
    );
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contacts</h2>
          <p className="text-muted-foreground">
            Manage your contact database and relationships
          </p>
        </div>
        <Button className="gap-2" onClick={handleAddContact} data-testid="button-add-contact">
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search contacts by name, email, title, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-contacts"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contacts ({filteredContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No contacts found matching your search." : "No contacts yet. Add your first contact to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Enrichment</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id} data-testid={`contact-row-${contact.id}`}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </span>
                        </div>
                        {contact.linkedinUrl && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            <a 
                              href={contact.linkedinUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              LinkedIn
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{getCompanyName(contact.companyId)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{contact.title || "-"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <a href={`mailto:${contact.email}`} className="hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <a href={`tel:${contact.phone}`} className="hover:underline">
                              {contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getEnrichmentBadge(contact.enrichmentStatus)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(contact.createdAt!).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`contact-menu-${contact.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleRunTask(contact)}
                            data-testid={`run-task-contact-${contact.id}`}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Run Task
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Record Management</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleAddToList(contact)}
                            data-testid={`add-to-list-contact-${contact.id}`}
                          >
                            <ListPlus className="h-4 w-4 mr-2" />
                            Add to List
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEditContact(contact)}
                            data-testid={`edit-contact-${contact.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteContact(contact)}
                            className="text-red-600"
                            data-testid={`delete-contact-${contact.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Record
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Data Enhancement</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleEnrichContact(contact)}
                            data-testid={`enrich-contact-${contact.id}`}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Enrich Contact
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

      {/* Contact Form */}
      <ContactForm
        open={contactFormOpen}
        onOpenChange={setContactFormOpen}
        contact={editingContact}
        companies={companies}
        onSubmit={handleContactSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteDialog?.firstName} {deleteDialog?.lastName}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}