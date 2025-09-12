# Data Enrichment Dashboard Components

A comprehensive data enrichment pipeline for WebOrchestrator that allows users to upload CSV/Excel files, map fields, and enrich data using multiple AI-powered providers.

## Components Overview

### 1. DataEnrichmentDashboard.tsx
**Main dashboard component** - Central hub for all enrichment activities

**Features:**
- Upload CSV/Excel files 
- Real-time job monitoring with WebSocket connections
- Cost tracking and analytics
- Provider management
- Integration with existing CRM data

**Key Sections:**
- Overview with quick start options
- Active job monitoring with progress indicators  
- Data preview for completed jobs
- Historical job management

### 2. FieldMappingInterface.tsx  
**Visual field mapping component** - Interactive drag-and-drop field mapper

**Features:**
- Auto-mapping with confidence scoring
- Visual source-to-target field mapping
- Provider selection with cost estimation
- Validation and error handling
- Enrichment options configuration

**UI Elements:**
- Dual-panel layout (mapping + providers)
- Real-time cost calculations
- Field validation with error messages
- Provider comparison grid

### 3. EnrichmentProgress.tsx
**Real-time progress monitoring** - Live tracking of enrichment jobs

**Features:**
- Multi-job progress tracking
- Real-time metrics and statistics
- Provider performance monitoring
- Pause/resume job controls
- Live logging and debugging

**Metrics Tracked:**
- Processing rate (records/minute)
- Success rates per provider
- Cost per record
- Estimated completion time

### 4. DataPreview.tsx
**Results preview and export** - Interactive data viewer

**Features:**
- Table and JSON view modes
- Advanced filtering and search
- Pagination with large datasets
- Individual record detail modals
- Export to CSV/JSON formats

**Table Features:**
- Sortable columns
- Status filtering (success/partial/failed)
- Provider badges
- Direct website links
- Cost tracking per record

### 5. EnrichmentHistory.tsx
**Historical job management** - Complete audit trail

**Features:**
- Comprehensive job filtering
- Time-based analytics
- Batch operations (export, delete)
- Job duplication
- Performance statistics

**Analytics:**
- Success rate trends
- Cost analysis over time  
- Provider performance comparison
- Resource utilization metrics

## Integration Points

### CRM Integration
- Connects to existing `crm-manager.tsx` components
- Uses shared `Company` and `Contact` types from `@shared/schema`
- Leverages existing CRM lists for enrichment sources

### WebSocket Integration  
- Real-time progress updates via WebSocket connections
- Live job status synchronization
- Instant error notifications
- Browser preview streaming capabilities

### API Integration
- RESTful API endpoints for all CRUD operations
- File upload handling with FormData
- Pagination and filtering support
- Export functionality

## File Structure
```
/data-enrichment/
├── DataEnrichmentDashboard.tsx    # Main dashboard
├── FieldMappingInterface.tsx      # Field mapping UI
├── EnrichmentProgress.tsx         # Progress monitoring  
├── DataPreview.tsx               # Results viewer
├── EnrichmentHistory.tsx         # Historical jobs
├── index.ts                      # Component exports
└── README.md                     # Documentation
```

## Usage Example

```tsx
import { DataEnrichmentDashboard } from "@/components/data-enrichment";

export function DataPortal() {
  return (
    <div>
      {/* Other portal components */}
      <TabsContent value="enrichment">
        <DataEnrichmentDashboard />
      </TabsContent>
    </div>
  );
}
```

## TypeScript Types

### EnrichmentJob
```typescript
interface EnrichmentJob {
  id: string;
  name: string;
  status: "pending" | "mapping" | "running" | "completed" | "failed" | "paused";
  type: "company" | "contact" | "both";
  source: "csv" | "excel" | "api" | "crm_list";
  totalRecords: number;
  processedRecords: number;
  enrichedRecords: number;
  failedRecords: number;
  fields: string[];
  enrichmentProviders: string[];
  estimatedCost: number;
  actualCost: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  error?: string;
  results?: any[];
  mapping?: Record<string, string>;
}
```

## API Endpoints Expected

```
GET    /api/enrichment/jobs          # List all jobs
POST   /api/enrichment/jobs          # Create new job
GET    /api/enrichment/stats         # Get statistics  
GET    /api/enrichment/providers     # List providers
POST   /api/enrichment/jobs/:id/start    # Start job
POST   /api/enrichment/jobs/:id/pause    # Pause job  
POST   /api/enrichment/jobs/:id/resume   # Resume job
GET    /api/enrichment/jobs/:id/export   # Export results
WS     /ws/enrichment               # Real-time updates
```

## Styling & Theme

- Uses Tailwind CSS for styling
- Supports dark/light theme switching
- Responsive design for mobile/tablet/desktop
- Consistent with existing WebOrchestrator design system
- Uses shadcn/ui components throughout

## Performance Considerations

- Virtual scrolling for large datasets
- Debounced search and filters
- Lazy loading of preview data
- Memoized expensive calculations
- WebSocket connection management
- Efficient pagination strategies

## Error Handling

- Comprehensive input validation
- User-friendly error messages
- Graceful degradation for API failures
- Retry mechanisms with exponential backoff
- Loading states and skeleton screens
- Toast notifications for user feedback