import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  integer, 
  boolean, 
  jsonb, 
  decimal, 
  bigint,
  uuid,
  pgEnum,
  inet,
  doublePrecision,
  primaryKey,
  unique,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// ==========================================
// ENUMS
// ==========================================

export const recordingStatusEnum = pgEnum("recording_status", [
  "idle", "recording", "paused", "completed", "failed", "processing"
]);

export const nodeStatusEnum = pgEnum("node_status", [
  "online", "offline", "busy", "maintenance", "draining"
]);

export const allocationStatusEnum = pgEnum("allocation_status", [
  "pending", "allocated", "in_use", "releasing", "failed"
]);

export const streamProtocolEnum = pgEnum("stream_protocol", [
  "vnc", "webrtc", "websocket", "rtmp"
]);

export const scalingActionEnum = pgEnum("scaling_action", [
  "scale_up", "scale_down", "rebalance", "emergency_scale"
]);

// ==========================================
// SESSION RECORDINGS
// ==========================================

export const sessionRecordings = pgTable("session_recordings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recordingStatus: recordingStatusEnum("recording_status").notNull().default("idle"),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  durationSeconds: integer("duration_seconds"),
  filePath: text("file_path"),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  storageBackend: varchar("storage_backend", { length: 50 }).default("s3"),
  storageUrl: text("storage_url"),
  videoCodec: varchar("video_codec", { length: 20 }).default("h264"),
  audioCodec: varchar("audio_codec", { length: 20 }),
  resolution: varchar("resolution", { length: 20 }).default("1920x1080"),
  fps: integer("fps").default(30),
  bitrateKbps: integer("bitrate_kbps").default(2000),
  thumbnailUrl: text("thumbnail_url"),
  segmentsCount: integer("segments_count").default(0),
  processingStatus: varchar("processing_status", { length: 50 }),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  retentionDays: integer("retention_days").default(30),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==========================================
// SESSION ACTIONS
// ==========================================

export const sessionActions = pgTable("session_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionSequence: integer("action_sequence").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  elementSelector: text("element_selector"),
  elementText: text("element_text"),
  elementAttributes: jsonb("element_attributes"),
  inputValue: text("input_value"),
  pageUrl: text("page_url"),
  pageTitle: text("page_title"),
  viewportPosition: jsonb("viewport_position"),
  mousePosition: jsonb("mouse_position"),
  keyboardState: jsonb("keyboard_state"),
  screenshotUrl: text("screenshot_url"),
  durationMs: integer("duration_ms"),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  aiConfidence: decimal("ai_confidence", { precision: 3, scale: 2 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==========================================
// SESSION METRICS (TimescaleDB)
// ==========================================

export const sessionMetrics = pgTable("session_metrics", {
  time: timestamp("time").notNull(),
  sessionId: uuid("session_id").notNull(),
  userId: uuid("user_id").notNull(),
  metricType: varchar("metric_type", { length: 50 }).notNull(),
  metricValue: doublePrecision("metric_value").notNull(),
  metricUnit: varchar("metric_unit", { length: 20 }),
  // Performance metrics
  cpuPercent: decimal("cpu_percent", { precision: 5, scale: 2 }),
  memoryMb: integer("memory_mb"),
  memoryPercent: decimal("memory_percent", { precision: 5, scale: 2 }),
  networkRxKbps: integer("network_rx_kbps"),
  networkTxKbps: integer("network_tx_kbps"),
  // Browser metrics
  domNodes: integer("dom_nodes"),
  jsHeapMb: integer("js_heap_mb"),
  pageLoadMs: integer("page_load_ms"),
  // Streaming metrics
  streamFps: integer("stream_fps"),
  streamBitrateKbps: integer("stream_bitrate_kbps"),
  streamLatencyMs: integer("stream_latency_ms"),
  droppedFrames: integer("dropped_frames"),
  // Resource metrics
  openTabs: integer("open_tabs"),
  activeDownloads: integer("active_downloads"),
  websocketConnections: integer("websocket_connections"),
  tags: jsonb("tags").default({}),
  metadata: jsonb("metadata").default({}),
});

// ==========================================
// SESSION ERRORS
// ==========================================

export const sessionErrors = pgTable("session_errors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  errorType: varchar("error_type", { length: 100 }).notNull(),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  severity: varchar("severity", { length: 20 }).default("error"),
  source: varchar("source", { length: 50 }),
  pageUrl: text("page_url"),
  userAction: text("user_action"),
  browserConsole: jsonb("browser_console"),
  networkTrace: jsonb("network_trace"),
  screenshotUrl: text("screenshot_url"),
  recoveryAttempted: boolean("recovery_attempted").default(false),
  recoverySuccessful: boolean("recovery_successful"),
  recoveryMethod: text("recovery_method"),
  impactScore: integer("impact_score"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==========================================
// GRID NODES
// ==========================================

export const gridNodes = pgTable("grid_nodes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nodeId: varchar("node_id", { length: 100 }).unique().notNull(),
  nodeName: varchar("node_name", { length: 255 }).notNull(),
  nodeType: varchar("node_type", { length: 50 }).notNull(),
  status: nodeStatusEnum("status").notNull().default("offline"),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  maxSessions: integer("max_sessions").default(10),
  activeSessions: integer("active_sessions").default(0),
  // Resource specifications
  cpuCores: integer("cpu_cores"),
  memoryGb: integer("memory_gb"),
  diskGb: integer("disk_gb"),
  gpuAvailable: boolean("gpu_available").default(false),
  gpuModel: varchar("gpu_model", { length: 100 }),
  // Network information
  ipAddress: inet("ip_address"),
  datacenter: varchar("datacenter", { length: 50 }),
  region: varchar("region", { length: 50 }),
  availabilityZone: varchar("availability_zone", { length: 50 }),
  // Capabilities
  supportedBrowsers: jsonb("supported_browsers").default(["chrome", "firefox", "edge"]),
  browserVersions: jsonb("browser_versions").default({}),
  platform: varchar("platform", { length: 50 }),
  architecture: varchar("architecture", { length: 20 }),
  // Health and performance
  healthCheckUrl: varchar("health_check_url", { length: 500 }),
  lastHealthCheck: timestamp("last_health_check"),
  healthScore: integer("health_score").default(100),
  cpuUsagePercent: decimal("cpu_usage_percent", { precision: 5, scale: 2 }),
  memoryUsagePercent: decimal("memory_usage_percent", { precision: 5, scale: 2 }),
  diskUsagePercent: decimal("disk_usage_percent", { precision: 5, scale: 2 }),
  networkLatencyMs: integer("network_latency_ms"),
  // Scheduling
  weight: integer("weight").default(100),
  labels: jsonb("labels").default({}),
  taints: jsonb("taints").default([]),
  // Statistics
  totalSessionsHandled: bigint("total_sessions_handled", { mode: "number" }).default(0),
  totalErrors: integer("total_errors").default(0),
  averageSessionDurationSeconds: integer("average_session_duration_seconds"),
  uptimeSeconds: bigint("uptime_seconds", { mode: "number" }).default(0),
  lastError: jsonb("last_error"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==========================================
// NODE METRICS (TimescaleDB)
// ==========================================

export const nodeMetrics = pgTable("node_metrics", {
  time: timestamp("time").notNull(),
  nodeId: varchar("node_id", { length: 100 }).notNull(),
  // Resource metrics
  cpuUsagePercent: decimal("cpu_usage_percent", { precision: 5, scale: 2 }),
  cpuLoad1min: decimal("cpu_load_1min", { precision: 6, scale: 2 }),
  cpuLoad5min: decimal("cpu_load_5min", { precision: 6, scale: 2 }),
  cpuLoad15min: decimal("cpu_load_15min", { precision: 6, scale: 2 }),
  memoryUsedGb: decimal("memory_used_gb", { precision: 6, scale: 2 }),
  memoryAvailableGb: decimal("memory_available_gb", { precision: 6, scale: 2 }),
  memoryPercent: decimal("memory_percent", { precision: 5, scale: 2 }),
  diskUsedGb: decimal("disk_used_gb", { precision: 8, scale: 2 }),
  diskAvailableGb: decimal("disk_available_gb", { precision: 8, scale: 2 }),
  diskPercent: decimal("disk_percent", { precision: 5, scale: 2 }),
  diskIoReadMbps: decimal("disk_io_read_mbps", { precision: 6, scale: 2 }),
  diskIoWriteMbps: decimal("disk_io_write_mbps", { precision: 6, scale: 2 }),
  // Network metrics
  networkRxMbps: decimal("network_rx_mbps", { precision: 6, scale: 2 }),
  networkTxMbps: decimal("network_tx_mbps", { precision: 6, scale: 2 }),
  networkConnections: integer("network_connections"),
  networkErrors: integer("network_errors"),
  // Session metrics
  activeSessions: integer("active_sessions"),
  idleSessions: integer("idle_sessions"),
  pendingSessions: integer("pending_sessions"),
  failedSessions: integer("failed_sessions"),
  // Browser metrics
  browserProcesses: integer("browser_processes"),
  browserMemoryMb: integer("browser_memory_mb"),
  crashedBrowsers: integer("crashed_browsers"),
  // Container metrics
  containerCount: integer("container_count"),
  containerRestarts: integer("container_restarts"),
  tags: jsonb("tags").default({}),
  metadata: jsonb("metadata").default({}),
});

// ==========================================
// NODE SCALING EVENTS
// ==========================================

export const nodeScalingEvents = pgTable("node_scaling_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clusterName: varchar("cluster_name", { length: 100 }),
  action: scalingActionEnum("action").notNull(),
  triggerReason: text("trigger_reason").notNull(),
  // Scaling details
  nodesBefore: integer("nodes_before").notNull(),
  nodesAfter: integer("nodes_after").notNull(),
  nodesAdded: integer("nodes_added"),
  nodesRemoved: integer("nodes_removed"),
  nodeIdsAffected: text("node_ids_affected").array(),
  // Metrics that triggered scaling
  avgCpuPercent: decimal("avg_cpu_percent", { precision: 5, scale: 2 }),
  avgMemoryPercent: decimal("avg_memory_percent", { precision: 5, scale: 2 }),
  avgSessionLoad: decimal("avg_session_load", { precision: 5, scale: 2 }),
  pendingSessions: integer("pending_sessions"),
  // Cost impact
  estimatedCostChange: decimal("estimated_cost_change", { precision: 10, scale: 2 }),
  actualCostChange: decimal("actual_cost_change", { precision: 10, scale: 2 }),
  // Timing
  decisionTime: timestamp("decision_time").notNull(),
  executionStartedAt: timestamp("execution_started_at"),
  executionCompletedAt: timestamp("execution_completed_at"),
  executionDurationSeconds: integer("execution_duration_seconds"),
  // Results
  success: boolean("success"),
  errorMessage: text("error_message"),
  rollbackPerformed: boolean("rollback_performed"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// SESSION ALLOCATIONS
// ==========================================

export const sessionAllocations = pgTable("session_allocations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull(),
  nodeId: varchar("node_id", { length: 100 }).notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  allocationStatus: allocationStatusEnum("allocation_status").notNull().default("pending"),
  allocationStrategy: varchar("allocation_strategy", { length: 50 }).default("least_loaded"),
  // Allocation constraints
  requiredBrowser: varchar("required_browser", { length: 50 }),
  requiredBrowserVersion: varchar("required_browser_version", { length: 20 }),
  requiredPlatform: varchar("required_platform", { length: 50 }),
  requiredRegion: varchar("required_region", { length: 50 }),
  requiredLabels: jsonb("required_labels"),
  antiAffinitySessions: uuid("anti_affinity_sessions").array(),
  // Allocation results
  allocatedAt: timestamp("allocated_at"),
  allocationAttempts: integer("allocation_attempts").default(0),
  allocationDurationMs: integer("allocation_duration_ms"),
  nodeScore: decimal("node_score", { precision: 5, scale: 2 }),
  fallbackUsed: boolean("fallback_used").default(false),
  // Session lifecycle
  sessionStartedAt: timestamp("session_started_at"),
  sessionEndedAt: timestamp("session_ended_at"),
  sessionDurationSeconds: integer("session_duration_seconds"),
  // Resource usage
  peakCpuPercent: decimal("peak_cpu_percent", { precision: 5, scale: 2 }),
  peakMemoryMb: integer("peak_memory_mb"),
  totalNetworkBytes: bigint("total_network_bytes", { mode: "number" }),
  // Termination
  terminationReason: varchar("termination_reason", { length: 100 }),
  cleanupPerformed: boolean("cleanup_performed").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==========================================
// ALLOCATION QUEUE
// ==========================================

export const allocationQueue = pgTable("allocation_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  priority: integer("priority").default(50),
  queuePosition: integer("queue_position"),
  // Requirements
  requiredResources: jsonb("required_resources").notNull(),
  constraints: jsonb("constraints").default({}),
  preferredNodes: text("preferred_nodes").array(),
  excludedNodes: text("excluded_nodes").array(),
  // Queue management
  queuedAt: timestamp("queued_at").defaultNow(),
  estimatedWaitSeconds: integer("estimated_wait_seconds"),
  maxWaitSeconds: integer("max_wait_seconds").default(300),
  attempts: integer("attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  lastAttemptError: text("last_attempt_error"),
  // Results
  allocatedAt: timestamp("allocated_at"),
  allocationId: uuid("allocation_id").references(() => sessionAllocations.id),
  dequeuedAt: timestamp("dequeued_at"),
  dequeueReason: varchar("dequeue_reason", { length: 50 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// ALLOCATION HISTORY
// ==========================================

export const allocationHistory = pgTable("allocation_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  allocationId: uuid("allocation_id").notNull(),
  sessionId: uuid("session_id").notNull(),
  nodeId: varchar("node_id", { length: 100 }).notNull(),
  userId: uuid("user_id").notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// ==========================================
// VNC CONNECTIONS
// ==========================================

export const vncConnections = pgTable("vnc_connections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectionId: varchar("connection_id", { length: 100 }).unique().notNull(),
  protocol: streamProtocolEnum("protocol").notNull().default("vnc"),
  // Connection details
  vncHost: varchar("vnc_host", { length: 255 }),
  vncPort: integer("vnc_port"),
  vncPassword: varchar("vnc_password", { length: 100 }),
  websocketUrl: text("websocket_url"),
  proxyUrl: text("proxy_url"),
  // Stream configuration
  quality: varchar("quality", { length: 20 }).default("high"),
  resolution: varchar("resolution", { length: 20 }).default("1920x1080"),
  colorDepth: integer("color_depth").default(24),
  compressionLevel: integer("compression_level").default(6),
  frameRate: integer("frame_rate").default(30),
  // Connection state
  connected: boolean("connected").default(false),
  connectedAt: timestamp("connected_at"),
  disconnectedAt: timestamp("disconnected_at"),
  connectionDurationSeconds: integer("connection_duration_seconds"),
  reconnectCount: integer("reconnect_count").default(0),
  lastActivityAt: timestamp("last_activity_at"),
  // Performance metrics
  bandwidthKbps: integer("bandwidth_kbps"),
  latencyMs: integer("latency_ms"),
  framesSent: bigint("frames_sent", { mode: "number" }).default(0),
  framesDropped: bigint("frames_dropped", { mode: "number" }).default(0),
  bytesSent: bigint("bytes_sent", { mode: "number" }).default(0),
  bytesReceived: bigint("bytes_received", { mode: "number" }).default(0),
  // Client information
  clientIp: inet("client_ip"),
  clientUserAgent: text("client_user_agent"),
  clientViewport: jsonb("client_viewport"),
  // Security
  authToken: varchar("auth_token", { length: 255 }),
  tokenExpiresAt: timestamp("token_expires_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==========================================
// RECORDING SEGMENTS
// ==========================================

export const recordingSegments = pgTable("recording_segments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  recordingId: uuid("recording_id").notNull(),
  sessionId: uuid("session_id").notNull(),
  segmentNumber: integer("segment_number").notNull(),
  // Segment details
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationSeconds: decimal("duration_seconds", { precision: 10, scale: 3 }),
  // File information
  filePath: text("file_path").notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  mimeType: varchar("mime_type", { length: 50 }).default("video/webm"),
  // Encoding details
  codec: varchar("codec", { length: 20 }),
  bitrateKbps: integer("bitrate_kbps"),
  resolution: varchar("resolution", { length: 20 }),
  fps: integer("fps"),
  keyframeInterval: integer("keyframe_interval"),
  // Processing
  processed: boolean("processed").default(false),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingDurationMs: integer("processing_duration_ms"),
  // Quality metrics
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }),
  compressionRatio: decimal("compression_ratio", { precision: 5, scale: 2 }),
  // Storage
  storageTier: varchar("storage_tier", { length: 20 }).default("hot"),
  archived: boolean("archived").default(false),
  archivedAt: timestamp("archived_at"),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueRecordingSegment: unique().on(table.recordingId, table.segmentNumber),
}));

// ==========================================
// PREVIEW SESSIONS
// ==========================================

export const previewSessions = pgTable("preview_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  previewType: varchar("preview_type", { length: 50 }).notNull(),
  // Stream configuration
  streamProtocol: streamProtocolEnum("stream_protocol").notNull(),
  streamUrl: text("stream_url"),
  streamKey: varchar("stream_key", { length: 100 }),
  // Preview settings
  quality: varchar("quality", { length: 20 }).default("medium"),
  maxViewers: integer("max_viewers").default(10),
  currentViewers: integer("current_viewers").default(0),
  // Viewer tracking
  viewerIps: inet("viewer_ips").array(),
  viewerSessions: jsonb("viewer_sessions").default([]),
  totalViewTimeSeconds: bigint("total_view_time_seconds", { mode: "number" }).default(0),
  // Performance
  avgLatencyMs: integer("avg_latency_ms"),
  avgBandwidthKbps: integer("avg_bandwidth_kbps"),
  bufferHealth: decimal("buffer_health", { precision: 3, scale: 2 }),
  // State
  active: boolean("active").default(true),
  startedAt: timestamp("started_at").defaultNow(),
  lastViewedAt: timestamp("last_viewed_at"),
  endedAt: timestamp("ended_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// INSERT SCHEMAS FOR VALIDATION
// ==========================================

export const insertSessionRecordingSchema = createInsertSchema(sessionRecordings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionActionSchema = createInsertSchema(sessionActions).omit({
  id: true,
  createdAt: true,
});

export const insertSessionMetricSchema = createInsertSchema(sessionMetrics);

export const insertSessionErrorSchema = createInsertSchema(sessionErrors).omit({
  id: true,
  createdAt: true,
});

export const insertGridNodeSchema = createInsertSchema(gridNodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNodeMetricSchema = createInsertSchema(nodeMetrics);

export const insertNodeScalingEventSchema = createInsertSchema(nodeScalingEvents).omit({
  id: true,
  createdAt: true,
});

export const insertSessionAllocationSchema = createInsertSchema(sessionAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAllocationQueueSchema = createInsertSchema(allocationQueue).omit({
  id: true,
  createdAt: true,
});

export const insertAllocationHistorySchema = createInsertSchema(allocationHistory).omit({
  id: true,
});

export const insertVncConnectionSchema = createInsertSchema(vncConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecordingSegmentSchema = createInsertSchema(recordingSegments).omit({
  id: true,
  createdAt: true,
});

export const insertPreviewSessionSchema = createInsertSchema(previewSessions).omit({
  id: true,
  createdAt: true,
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type InsertSessionRecording = z.infer<typeof insertSessionRecordingSchema>;
export type SessionRecording = typeof sessionRecordings.$inferSelect;

export type InsertSessionAction = z.infer<typeof insertSessionActionSchema>;
export type SessionAction = typeof sessionActions.$inferSelect;

export type InsertSessionMetric = z.infer<typeof insertSessionMetricSchema>;
export type SessionMetric = typeof sessionMetrics.$inferSelect;

export type InsertSessionError = z.infer<typeof insertSessionErrorSchema>;
export type SessionError = typeof sessionErrors.$inferSelect;

export type InsertGridNode = z.infer<typeof insertGridNodeSchema>;
export type GridNode = typeof gridNodes.$inferSelect;

export type InsertNodeMetric = z.infer<typeof insertNodeMetricSchema>;
export type NodeMetric = typeof nodeMetrics.$inferSelect;

export type InsertNodeScalingEvent = z.infer<typeof insertNodeScalingEventSchema>;
export type NodeScalingEvent = typeof nodeScalingEvents.$inferSelect;

export type InsertSessionAllocation = z.infer<typeof insertSessionAllocationSchema>;
export type SessionAllocation = typeof sessionAllocations.$inferSelect;

export type InsertAllocationQueue = z.infer<typeof insertAllocationQueueSchema>;
export type AllocationQueue = typeof allocationQueue.$inferSelect;

export type InsertAllocationHistory = z.infer<typeof insertAllocationHistorySchema>;
export type AllocationHistory = typeof allocationHistory.$inferSelect;

export type InsertVncConnection = z.infer<typeof insertVncConnectionSchema>;
export type VncConnection = typeof vncConnections.$inferSelect;

export type InsertRecordingSegment = z.infer<typeof insertRecordingSegmentSchema>;
export type RecordingSegment = typeof recordingSegments.$inferSelect;

export type InsertPreviewSession = z.infer<typeof insertPreviewSessionSchema>;
export type PreviewSession = typeof previewSessions.$inferSelect;