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
  List, 
  Search, 
  Plus, 
  Users,
  Building2,
  Play,
  Settings,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  UserMinus
} from "lucide-react";
import { ListForm } from "./list-form";
import { apiRequest } from "@/lib/queryClient";
import type { CrmList } from "@shared/schema";

export function ListsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [listFormOpen, setListFormOpen] = useState(false);
  const [editingList, setEditingList] = useState<CrmList | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<CrmList | null>(null);
  
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/crm/lists", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/lists"] });
      setListFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/crm/lists/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/lists"] });
      setEditingList(null);
      setListFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/crm/lists/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/lists"] });
      setDeleteDialog(null);
    },
  });

  const handleRunTask = (list: CrmList) => {
    // TODO: Implement task creation with list selection
    console.log('Running task for list:', list.name, 'with', list.count, 'contacts');
    // This should open a task creation dialog with the list pre-selected
  };

  const handleAddRecords = (list: CrmList) => {
    // TODO: Implement CSV upload or contact selection for adding records
    console.log('Adding records to list:', list.name);
    // This should open a contact import/selection dialog
  };

  const handleRemoveRecords = (list: CrmList) => {
    // TODO: Implement record removal functionality
    console.log('Removing records from list:', list.name);
    // This should open a dialog to select which records to remove
  };

  const handleEditList = (list: CrmList) => {
    setEditingList(list);
    setListFormOpen(true);
  };

  const handleDeleteList = (list: CrmList) => {
    setDeleteDialog(list);
  };

  const handleCreateList = () => {
    setEditingList(null);
    setListFormOpen(true);
  };

  const handleListSubmit = (data: any) => {
    if (editingList) {
      updateMutation.mutate({ id: editingList.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const { data: lists = [], isLoading } = useQuery<CrmList[]>({
    queryKey: ["/api/crm/lists"],
    select: (data) => data?.data || [],
  });

  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    return type === "companies" ? (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        <Building2 className="h-3 w-3 mr-1" />
        Companies
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        <Users className="h-3 w-3 mr-1" />
        Contacts
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lists</h2>
          <p className="text-muted-foreground">
            Create and manage lists for targeted automation
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreateList} data-testid="button-create-list">
          <Plus className="h-4 w-4" />
          Create List
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search lists by name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-lists"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lists ({filteredLists.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading lists...</div>
          ) : filteredLists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No lists found matching your search." : "No lists yet. Create your first list to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>List Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Task Compatible</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLists.map((list) => (
                  <TableRow key={list.id} data-testid={`list-row-${list.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <List className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{list.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(list.type)}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{list.count}</span>
                    </TableCell>
                    <TableCell>
                      {list.taskCompatible ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Compatible
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Compatible</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(list.createdAt!).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1"
                          onClick={() => handleRunTask(list)}
                          data-testid={`run-task-${list.id}`}
                        >
                          <Play className="h-3 w-3" />
                          Run Task
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              data-testid={`configure-list-${list.id}`}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>List Management</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => handleAddRecords(list)}
                              data-testid={`add-records-${list.id}`}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Records
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRemoveRecords(list)}
                              data-testid={`remove-records-${list.id}`}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove Records
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleEditList(list)}
                              data-testid={`edit-list-${list.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit List
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteList(list)}
                              className="text-red-600"
                              data-testid={`delete-list-${list.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete List
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* List Form */}
      <ListForm
        open={listFormOpen}
        onOpenChange={setListFormOpen}
        list={editingList}
        onSubmit={handleListSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the list "{deleteDialog?.name}"? 
              This action cannot be undone and will affect all associated records.
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