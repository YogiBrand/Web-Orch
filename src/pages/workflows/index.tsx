import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FolderOpen } from "lucide-react";
import { useLocation } from "wouter";
import { listWorkflows } from "@/lib/n8n";

export default function WorkflowsHome() {
  const [, setLocation] = useLocation();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    listWorkflows().then(setWorkflows).catch(() => {});
  }, []);

  const filtered = workflows.filter((w) => w.name?.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeSection="workflows"
        onSectionChange={(section: string) => {
          if (section === "workflows") setLocation("/workflows");
          else if (section === "tasks") setLocation("/tasks");
          else if (section === "sessions") setLocation("/sessions");
          else if (section === "events") setLocation("/events");
          else if (section === "data-portal") setLocation("/data-portal");
          else if (section === "agents" || section === 'agents-dashboard') setLocation("/agents");
          else if (section === 'agents-marketplace') setLocation('/agents/marketplace');
          else if (section === 'agents-create') setLocation('/agents/new');
          else if (section === "orchestrator") setLocation("/?section=orchestrator");
          else setLocation(`/?section=${section}`);
        }}
      />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1>Workflows</h1>
            <p className="subheading">Manage, create, and run automation workflows</p>
          </div>
          <div className="flex items-center gap-2">
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search workflows" className="w-64" />
            <Button onClick={() => setLocation('/workflows/new')} className="gap-2"><Plus className="w-4 h-4" /> New Workflow</Button>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Your Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.active ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell>{w.updatedAt ? new Date(w.updatedAt).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => setLocation(`/workflows/${w.id}`)}>
                        <FolderOpen className="w-4 h-4" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-sm">No workflows found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3">Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["Lead Gen Sequence", "Form Submission", "Enrichment"].map((t) => (
              <Card key={t} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">{t}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={() => setLocation('/workflows/new')}>Use Template</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


