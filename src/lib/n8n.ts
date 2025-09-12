// Simple n8n REST client for frontend use
// Requires CORS enabled on n8n or a reverse proxy that adds Access-Control-Allow-Origin

export type N8nWorkflow = {
  id?: string;
  name: string;
  nodes: any[];
  connections: Record<string, any>;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type N8nNodeType = {
  name: string; // e.g., 'n8n-nodes-base.httpRequest'
  displayName: string; // 'HTTP Request'
  group?: string[];
  description?: string;
  icon?: string;
  defaults?: {
    name?: string;
    color?: string;
  };
  properties?: Array<{
    displayName: string;
    name: string;
    type: string;
    default: any;
    description?: string;
    options?: Array<{ name: string; value: any }>;
  }>;
};

function getBase(): string {
  return (import.meta.env.VITE_N8N_URL as string) || "http://localhost:5678";
}

function getHeaders(): HeadersInit {
  const apiKey = (import.meta.env.VITE_N8N_API_KEY as string) || '';
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
}

export async function listWorkflows(): Promise<N8nWorkflow[]> {
  const res = await fetch(`${getBase()}/api/v1/workflows`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`n8n list failed: ${res.status}`);
  return res.json();
}

export async function createWorkflow(payload: N8nWorkflow): Promise<N8nWorkflow> {
  const res = await fetch(`${getBase()}/api/v1/workflows`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`n8n create failed: ${res.status}`);
  return res.json();
}

export async function getWorkflow(id: string): Promise<N8nWorkflow> {
  const res = await fetch(`${getBase()}/api/v1/workflows/${id}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`n8n get failed: ${res.status}`);
  return res.json();
}

export async function updateWorkflow(id: string, payload: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
  const res = await fetch(`${getBase()}/api/v1/workflows/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`n8n update failed: ${res.status}`);
  return res.json();
}

export async function executeWorkflow(id: string, body?: Record<string, unknown>) {
  const res = await fetch(`${getBase()}/api/v1/workflows/${id}/execute`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ runData: body || {} }),
  });
  if (!res.ok) throw new Error(`n8n execute failed: ${res.status}`);
  return res.json();
}

// Try multiple endpoints to retrieve node types from n8n; fall back to a rich static list
export async function fetchNodeTypes(): Promise<N8nNodeType[]> {
  const base = getBase();
  const headers = getHeaders();
  const endpoints = [
    `${base}/api/v1/nodes`, // some deployments
    `${base}/rest/nodes`,   // editor API
    `${base}/api/v1/node-types`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const list: N8nNodeType[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        if (list.length) return list;
      }
    } catch {}
  }
  // Fallback: curated common nodes
  const common: N8nNodeType[] = [
    { name: 'n8n-nodes-base.start', displayName: 'Start', description: 'Start node', properties: [] },
    { name: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request', description: 'Call HTTP endpoints', properties: [
      { displayName: 'Method', name: 'method', type: 'options', default: 'GET', options: [
        { name: 'GET', value: 'GET' }, { name: 'POST', value: 'POST' }, { name: 'PUT', value: 'PUT' }, { name: 'PATCH', value: 'PATCH' }, { name: 'DELETE', value: 'DELETE' }
      ]},
      { displayName: 'URL', name: 'url', type: 'string', default: '' },
    ]},
    { name: 'n8n-nodes-base.set', displayName: 'Set', properties: [ { displayName: 'Keep Only Set', name: 'keepOnlySet', type: 'boolean', default: true } ] },
    { name: 'n8n-nodes-base.code', displayName: 'Code', properties: [ { displayName: 'Language', name: 'language', type: 'options', default: 'javascript', options: [ { name: 'JavaScript', value: 'javascript' } ] }, { displayName: 'Code', name: 'jsCode', type: 'string', default: '// code' } ] },
    { name: 'n8n-nodes-base.if', displayName: 'IF', properties: [ { displayName: 'Conditions', name: 'conditions', type: 'json', default: {} } ] },
    { name: 'n8n-nodes-base.switch', displayName: 'Switch', properties: [ { displayName: 'Property', name: 'property', type: 'string', default: 'data' } ] },
    { name: 'n8n-nodes-base.merge', displayName: 'Merge', properties: [ { displayName: 'Mode', name: 'mode', type: 'options', default: 'append', options: [ { name: 'Append', value: 'append' }, { name: 'Merge by Key', value: 'mergeByKey' } ] } ] },
    { name: 'n8n-nodes-base.delay', displayName: 'Delay', properties: [ { displayName: 'Delay', name: 'delay', type: 'number', default: 5 }, { displayName: 'Unit', name: 'unit', type: 'options', default: 'seconds', options: [ { name: 'Seconds', value: 'seconds' }, { name: 'Minutes', value: 'minutes' } ] } ] },
    { name: 'n8n-nodes-base.webhook', displayName: 'Webhook', properties: [ { displayName: 'Path', name: 'path', type: 'string', default: 'hook' } ] },
    { name: 'n8n-nodes-base.cron', displayName: 'Cron', properties: [ { displayName: 'Hour', name: 'hour', type: 'number', default: 0 }, { displayName: 'Minute', name: 'minute', type: 'number', default: 0 } ] },
  ];
  return common;
}

// Mapping helpers between React Flow graph and n8n format (minimal subset)
export type RFNode = { id: string; type: string; data: any; position: { x: number; y: number } };
export type RFEdge = { id: string; source: string; target: string };

export function rfToN8n(name: string, nodes: RFNode[], edges: RFEdge[]): N8nWorkflow {
  // Basic mapping:
  // - start -> n8n Start node
  // - action -> n8n HTTP Request node (placeholder)
  // - if -> n8n IF node
  const n8nNodes = nodes.map((n) => {
    const n8nTypeFromData = (n as any).data?.n8nType as string | undefined;
    if (n.type === 'start') {
      return {
        id: n.id,
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [n.position.x, n.position.y],
        parameters: {},
      };
    }
    if (n.type === 'if' || n8nTypeFromData === 'n8n-nodes-base.if') {
      return {
        id: n.id,
        name: n.data?.label || 'IF',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [n.position.x, n.position.y],
        parameters: {
          conditions: n.data?.conditions || { string: [{ value1: '', operation: 'contains', value2: '' }] },
        },
      };
    }
    // default or explicit action types
    const type = n8nTypeFromData || 'n8n-nodes-base.httpRequest';
    const defaultParams: Record<string, any> = {
      'n8n-nodes-base.httpRequest': { method: 'GET', url: 'https://example.com' },
      'n8n-nodes-base.set': { keepOnlySet: true, values: { string: [] } },
      'n8n-nodes-base.code': { language: 'javascript', jsCode: '// your code' },
      'n8n-nodes-base.delay': { delay: 5, unit: 'seconds' },
      'n8n-nodes-base.merge': { mode: 'append' },
      'n8n-nodes-base.switch': { property: 'data', rules: [] },
      'n8n-nodes-base.webhook': { path: 'hook', methods: ['GET'] },
      'n8n-nodes-base.cron': { triggerTimes: { item: [{ hour: 0, minute: 0, weekday: 1 }] } },
    };
    return {
      id: n.id,
      name: n.data?.label || (n8nTypeFromData ? n8nTypeFromData.split('.').pop() : 'Action'),
      type,
      typeVersion: 1,
      position: [n.position.x, n.position.y],
      parameters: n.data?.params || defaultParams[type] || {},
    };
  });

  // Build connections map by source node name conventions
  const byId: Record<string, any> = Object.fromEntries(n8nNodes.map((n: any) => [n.id, n]));

  const connections: Record<string, any> = {};
  for (const e of edges) {
    const src = byId[e.source];
    const tgt = byId[e.target];
    if (!src || !tgt) continue;
    const srcKey = src.name;
    connections[srcKey] = connections[srcKey] || { main: [[]] };
    connections[srcKey].main[0].push({ node: tgt.name, type: 'main', index: 0 });
  }

  return {
    name,
    nodes: n8nNodes,
    connections,
    active: false,
  };
}


