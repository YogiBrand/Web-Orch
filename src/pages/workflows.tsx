import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Play, Download, Share2, GitBranch } from "lucide-react";
import { useLocation } from "wouter";
import ReactFlow, { Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState, Connection, Node, Edge, Panel, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import { createWorkflow, executeWorkflow, listWorkflows, rfToN8n, fetchNodeTypes, type N8nNodeType } from "@/lib/n8n";

const initialNodes: Node[] = [
  { id: "start", type: "start", position: { x: 300, y: 100 }, data: { label: "Start" } },
  { id: "step-1", type: "action", position: { x: 300, y: 220 }, data: { label: "Action" } },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "start", target: "step-1" },
];

const nodesCatalog: { label: string; subtitle?: string; n8nType: string; rfType: Node['type'] }[] = [
  { label: 'HTTP Request', subtitle: 'Call external APIs', n8nType: 'n8n-nodes-base.httpRequest', rfType: 'action' },
  { label: 'Code', subtitle: 'Run JS/TS', n8nType: 'n8n-nodes-base.code', rfType: 'action' },
  { label: 'Set', subtitle: 'Set data fields', n8nType: 'n8n-nodes-base.set', rfType: 'action' },
  { label: 'If', subtitle: 'Conditional branching', n8nType: 'n8n-nodes-base.if', rfType: 'if' },
  { label: 'Switch', subtitle: 'Multi-branch', n8nType: 'n8n-nodes-base.switch', rfType: 'action' },
  { label: 'Merge', subtitle: 'Combine data', n8nType: 'n8n-nodes-base.merge', rfType: 'action' },
  { label: 'Delay', subtitle: 'Wait between steps', n8nType: 'n8n-nodes-base.delay', rfType: 'action' },
  { label: 'Webhook', subtitle: 'Inbound trigger', n8nType: 'n8n-nodes-base.webhook', rfType: 'action' },
  { label: 'Cron', subtitle: 'Schedule trigger', n8nType: 'n8n-nodes-base.cron', rfType: 'action' },
];

function Toolbar({ onAddAction, onAddIf, onSave, onRun }: { onAddAction: () => void; onAddIf: () => void; onSave: () => void; onRun: () => void; }) {
  return (
    <div className="flex items-center gap-2 p-2 border-b bg-white/60 dark:bg-neutral-900/60 backdrop-blur sticky top-0 z-10">
      <Button onClick={onAddAction} className="gap-2"><Plus className="w-4 h-4" /> Add Step</Button>
      <Button variant="secondary" onClick={onAddIf} className="gap-2"><GitBranch className="w-4 h-4" /> Add Condition</Button>
      <Separator orientation="vertical" className="mx-2" />
      <Button variant="outline" onClick={onSave} className="gap-2"><Save className="w-4 h-4" /> Save</Button>
      <Button variant="default" onClick={onRun} className="gap-2"><Play className="w-4 h-4" /> Run</Button>
    </div>
  );
}

export default function WorkflowsPage() {
  const [, setLocation] = useLocation();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [name, setName] = useState("New Workflow");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [nodeTypes, setNodeTypes] = useState<N8nNodeType[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    listWorkflows().then(setWorkflows).catch(() => {});
    fetchNodeTypes().then(setNodeTypes).catch(() => {});
  }, []);

  const flowNodeTypes = useMemo(() => ({
    start: ({ data }: any) => (
      <div className="rounded-lg border bg-white dark:bg-neutral-900 px-3 py-2 shadow-sm text-xs gradient-border relative">
        <div className="font-medium">{data.label || 'Start'}</div>
        <button
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow"
          onClick={data.onAddBelow}
          aria-label="Add next"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    ),
    action: ({ data }: any) => (
      <div className="rounded-lg border bg-white dark:bg-neutral-900 px-3 py-2 shadow-sm text-xs glass-card relative">
        <div className="font-medium">{data.label || 'Action'}</div>
        <div className="text-muted-foreground text-[11px]">{data.subtitle || 'HTTP Request'}</div>
        <button
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow"
          onClick={data.onAddBelow}
          aria-label="Add next"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    ),
    if: ({ data }: any) => (
      <div className="rounded-lg border bg-white dark:bg-neutral-900 px-3 py-2 shadow-sm text-xs glass-card relative">
        <div className="font-medium">{data.label || 'IF condition'}</div>
        <div className="text-muted-foreground text-[11px]">Branches: True / False</div>
        <button
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow"
          onClick={data.onAddBelow}
          aria-label="Add next"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    ),
  }), []);

  const onConnect = (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds));

  const addNodeBelow = (type: Node['type'], data?: any) => {
    const last = nodes[nodes.length - 1];
    const id = `${type}-${nodes.length + 1}`;
    const y = last ? last.position.y + 120 : 100;
    const newNode: Node = { id, type, position: { x: 300, y }, data: { label: data?.label || (type === 'if' ? 'Condition' : 'Action'), subtitle: data?.subtitle, n8nType: data?.n8nType, onAddBelow: () => addNodeBelow('action') } } as any;
    setNodes((ns) => [...ns, newNode]);
    if (last) setEdges((es) => [...es, { id: `${last.id}-${id}`, source: last.id, target: id }]);
  };

  // Ensure existing nodes have onAddBelow handlers for the plus button
  useEffect(() => {
    setNodes((ns) => ns.map((n, i) => ({
      ...n,
      data: { ...n.data, onAddBelow: () => addNodeBelow('action') }
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const wf = rfToN8n(name, nodes as any, edges as any);
      await createWorkflow(wf);
      const updated = await listWorkflows();
      setWorkflows(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    try {
      setRunning(true);
      const wf = rfToN8n(name, nodes as any, edges as any);
      const saved = await createWorkflow(wf);
      await executeWorkflow(saved.id!);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeSection="workflows"
        onSectionChange={(section: string) => {
          if (section === "tasks") setLocation("/tasks");
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
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1>Workflows</h1>
            <p className="subheading">Design automation workflows powered by n8n, with a clean vertical layout</p>
          </div>
          <div className="flex items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="w-64" />
            <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> Save</Button>
            <Button onClick={handleRun} disabled={running} className="gap-2"><Play className="w-4 h-4" /> Run</Button>
          </div>
        </div>

        <Card className="glass-card overflow-hidden">
          <Toolbar
            onAddAction={() => addNodeBelow('action')}
            onAddIf={() => addNodeBelow('if')}
            onSave={handleSave}
            onRun={handleRun}
          />
          <CardContent className="p-0 h-[70vh]">
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={flowNodeTypes as any}
                fitView
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  try {
                    const raw = e.dataTransfer.getData('application/reactflow');
                    if (!raw) return;
                    const item = JSON.parse(raw);
                    addNodeBelow(item.rfType as Node['type'], { label: item.label, subtitle: item.subtitle, n8nType: item.n8nType });
                  } catch {}
                }}
              onNodeClick={(_, node) => setSelectedNode(node)}
              >
                <Panel position="top-right" className="m-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => addNodeBelow('action')}>+ Action</Button>
                    <Button size="sm" variant="outline" onClick={() => addNodeBelow('if')}>+ Condition</Button>
                  </div>
                </Panel>
                <Panel position="top-left" className="m-2">
                  <div className="w-72 max-h-80 overflow-auto glass-card rounded-lg p-2 border">
                    <div className="text-xs font-medium mb-2">Nodes</div>
                    <div className="space-y-2">
                      {nodeTypes.length ? nodeTypes.map((t) => (
                        <div
                          key={t.name}
                          className="p-2 rounded-md border hover:bg-muted cursor-move"
                          draggable
                          onDragStart={(e) => {
                            const payload = { label: t.displayName || t.name, subtitle: t.description, n8nType: t.name, rfType: t.name.includes('if') ? 'if' : 'action' };
                            e.dataTransfer.setData('application/reactflow', JSON.stringify(payload));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onClick={() => addNodeBelow('action', { label: t.displayName || t.name, subtitle: t.description, n8nType: t.name })}
                        >
                          <div className="text-xs font-medium">{t.displayName || t.name}</div>
                          {t.description && <div className="text-[11px] text-muted-foreground">{t.description}</div>}
                        </div>
                      )) : nodesCatalog.map((n) => (
                        <div
                          key={n.label}
                          className="p-2 rounded-md border hover:bg-muted cursor-move"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/reactflow', JSON.stringify(n));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onClick={() => addNodeBelow(n.rfType, { label: n.label, subtitle: n.subtitle, n8nType: n.n8nType })}
                        >
                          <div className="text-xs font-medium">{n.label}</div>
                          {n.subtitle && <div className="text-[11px] text-muted-foreground">{n.subtitle}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>
                <Panel position="bottom-right" className="m-2">
                  {selectedNode && (
                    <div className="w-96 max-h-80 overflow-auto glass-card rounded-lg p-3 border">
                      <div className="text-xs font-medium mb-2">Configure: {(selectedNode.data as any)?.label}</div>
                      <div className="space-y-3 text-xs">
                        {(() => {
                          const t = nodeTypes.find(nt => nt.name === (selectedNode.data as any)?.n8nType);
                          const props = t?.properties || [];
                          return props.map((p) => (
                            <div key={p.name} className="space-y-1">
                              <div className="font-medium">{p.displayName}</div>
                              {p.type === 'options' && p.options ? (
                                <select
                                  className="w-full border rounded px-2 py-1 bg-background"
                                  value={(selectedNode.data as any)?.params?.[p.name] ?? p.default}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNodes((ns) => ns.map((n) => n.id === selectedNode.id ? ({
                                      ...n,
                                      data: { ...n.data, params: { ...(n.data as any)?.params, [p.name]: val } }
                                    }) : n));
                                  }}
                                >
                                  {p.options.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
                                </select>
                              ) : p.type === 'boolean' ? (
                                <input
                                  type="checkbox"
                                  checked={Boolean((selectedNode.data as any)?.params?.[p.name] ?? p.default)}
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    setNodes((ns) => ns.map((n) => n.id === selectedNode.id ? ({
                                      ...n,
                                      data: { ...n.data, params: { ...(n.data as any)?.params, [p.name]: val } }
                                    }) : n));
                                  }}
                                />
                              ) : (
                                <input
                                  className="w-full border rounded px-2 py-1 bg-background"
                                  value={(selectedNode.data as any)?.params?.[p.name] ?? ''}
                                  placeholder={String(p.default ?? '')}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNodes((ns) => ns.map((n) => n.id === selectedNode.id ? ({
                                      ...n,
                                      data: { ...n.data, params: { ...(n.data as any)?.params, [p.name]: val } }
                                    }) : n));
                                  }}
                                />
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </Panel>
                <Background gap={16} />
                <MiniMap />
                <Controls />
              </ReactFlow>
            </ReactFlowProvider>
          </CardContent>
        </Card>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="my">My Workflows</TabsTrigger>
          </TabsList>
          <TabsContent value="templates">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["Lead Generation", "Form Submission", "Enrichment"].map((t) => (
                <Card key={t} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{t}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">Use Template</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="my">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map((wf) => (
                <Card key={wf.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{wf.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" /> Export</Button>
                    <Button size="sm" variant="outline" className="gap-2"><Share2 className="w-4 h-4" /> Share</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

