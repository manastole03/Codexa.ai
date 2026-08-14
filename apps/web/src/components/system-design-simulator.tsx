"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Socket } from "socket.io-client";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  Cloud,
  Copy,
  Cpu,
  Database,
  Download,
  FileText,
  Flame,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Layers,
  Link2,
  Lock,
  MessageSquare,
  MousePointer2,
  Network,
  Play,
  Plus,
  Radio,
  RefreshCcw,
  Route,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Timer,
  Trash2,
  Workflow,
  XCircle,
  Zap,
  type LucideIcon
} from "lucide-react";

type Tone = "cyan" | "emerald" | "violet" | "amber" | "rose" | "blue" | "slate";
type ToolMode = "select" | "connect";
type PanelTab = "inspect" | "simulate" | "chaos" | "ai" | "concepts" | "challenge";
type NodeHealth = "healthy" | "degraded" | "failed";
type ChaosType = "kill" | "throttle" | "partition" | "overload" | "cache-miss";
type ConceptCategory =
  | "Foundations"
  | "Scaling"
  | "Data"
  | "Async"
  | "Reliability"
  | "Algorithms"
  | "Security"
  | "Operations";
type TemplateProfile =
  | "media"
  | "realtime"
  | "geo"
  | "feed"
  | "collaboration"
  | "file"
  | "commerce"
  | "search"
  | "payments"
  | "video-call"
  | "analytics"
  | "flash-sale";

type ComponentKind = {
  id: string;
  label: string;
  group: string;
  Icon: LucideIcon;
  tone: Tone;
  defaultCapacity: number;
  defaultLatency: number;
  defaultReplicas?: number;
  description: string;
};

type DiagramNode = {
  id: string;
  kindId: string;
  label: string;
  x: number;
  y: number;
  capacity: number;
  latency: number;
  replicas: number;
  health: NodeHealth;
  notes?: string;
};

type DiagramEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  traffic: number;
  latency: number;
  status: NodeHealth;
};

type Workload = {
  rps: number;
  readPercent: number;
  burstiness: number;
  regions: number;
};

type ChaosEvent = {
  id: string;
  type: ChaosType;
  targetId: string;
  label: string;
  createdAt: number;
};

type ChallengeState = {
  startedAt?: number;
  durationMin: number;
};

type SystemDesignScene = {
  templateId: string;
  templateName: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  workload: Workload;
  simulationRunning: boolean;
  chaosEvents: ChaosEvent[];
  notes: string;
  challenge: ChallengeState;
  updatedAt: number;
};

type NodeMetric = {
  rps: number;
  load: number;
  p99: number;
  errorRate: number;
  status: NodeHealth;
};

type EdgeMetric = {
  rps: number;
  p99: number;
  status: NodeHealth;
};

type TemplateDefinition = {
  id: string;
  name: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  profile: TemplateProfile;
  workload: Workload;
  prompt: string;
  requirements: string[];
};

type ConceptLesson = {
  id: string;
  category: ConceptCategory;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  stages: string[];
  mentalModel: string;
  algorithm: string[];
  deepDive: string[];
  tradeoffs: string[];
  interview: string;
  patternKindIds: string[];
};

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 760;
const NODE_WIDTH = 154;
const NODE_HEIGHT = 74;

const DEFAULT_WORKLOAD: Workload = {
  rps: 1800,
  readPercent: 85,
  burstiness: 35,
  regions: 3
};

const toneStyles: Record<
  Tone,
  {
    node: string;
    icon: string;
    badge: string;
    text: string;
    stroke: string;
    fill: string;
  }
> = {
  cyan: {
    node: "border-signal-cyan/35 bg-signal-cyan/[0.08]",
    icon: "text-signal-cyan",
    badge: "border-signal-cyan/25 bg-signal-cyan/10 text-signal-cyan",
    text: "text-signal-cyan",
    stroke: "#19d3da",
    fill: "rgba(25, 211, 218, 0.11)"
  },
  emerald: {
    node: "border-emerald-400/35 bg-emerald-400/[0.08]",
    icon: "text-emerald-300",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    text: "text-emerald-300",
    stroke: "#34d399",
    fill: "rgba(52, 211, 153, 0.11)"
  },
  violet: {
    node: "border-violet-300/35 bg-violet-300/[0.08]",
    icon: "text-violet-300",
    badge: "border-violet-300/25 bg-violet-300/10 text-violet-200",
    text: "text-violet-300",
    stroke: "#a78bfa",
    fill: "rgba(167, 139, 250, 0.11)"
  },
  amber: {
    node: "border-amber-300/35 bg-amber-300/[0.08]",
    icon: "text-amber-300",
    badge: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    text: "text-amber-300",
    stroke: "#fbbf24",
    fill: "rgba(251, 191, 36, 0.11)"
  },
  rose: {
    node: "border-signal-rose/35 bg-signal-rose/[0.08]",
    icon: "text-signal-rose",
    badge: "border-signal-rose/25 bg-signal-rose/10 text-signal-rose",
    text: "text-signal-rose",
    stroke: "#fb7185",
    fill: "rgba(251, 113, 133, 0.11)"
  },
  blue: {
    node: "border-sky-300/35 bg-sky-300/[0.08]",
    icon: "text-sky-300",
    badge: "border-sky-300/25 bg-sky-300/10 text-sky-200",
    text: "text-sky-300",
    stroke: "#7dd3fc",
    fill: "rgba(125, 211, 252, 0.11)"
  },
  slate: {
    node: "border-white/18 bg-white/[0.055]",
    icon: "text-white/70",
    badge: "border-white/15 bg-white/[0.06] text-white/70",
    text: "text-white/70",
    stroke: "#cbd5e1",
    fill: "rgba(203, 213, 225, 0.09)"
  }
};

const componentCatalog: ComponentKind[] = [
  { id: "browser", label: "Browser", group: "Clients", Icon: Globe, tone: "cyan", defaultCapacity: 9000, defaultLatency: 12, description: "Web traffic source" },
  { id: "mobile", label: "Mobile App", group: "Clients", Icon: Globe, tone: "cyan", defaultCapacity: 7500, defaultLatency: 35, description: "Mobile traffic source" },
  { id: "desktop", label: "Desktop Sync", group: "Clients", Icon: HardDrive, tone: "cyan", defaultCapacity: 5000, defaultLatency: 24, description: "Desktop client" },
  { id: "dns", label: "DNS", group: "Edge", Icon: Route, tone: "blue", defaultCapacity: 20000, defaultLatency: 18, description: "Name resolution" },
  { id: "cdn", label: "CDN", group: "Edge", Icon: Cloud, tone: "violet", defaultCapacity: 40000, defaultLatency: 26, defaultReplicas: 8, description: "Edge cache" },
  { id: "waf", label: "WAF", group: "Edge", Icon: ShieldCheck, tone: "amber", defaultCapacity: 12000, defaultLatency: 18, defaultReplicas: 2, description: "Bot and abuse filter" },
  { id: "api_gateway", label: "API Gateway", group: "Traffic", Icon: Network, tone: "emerald", defaultCapacity: 9000, defaultLatency: 35, defaultReplicas: 3, description: "Public request entry" },
  { id: "load_balancer", label: "Load Balancer", group: "Traffic", Icon: GitBranch, tone: "emerald", defaultCapacity: 16000, defaultLatency: 14, defaultReplicas: 2, description: "Distributes traffic" },
  { id: "rate_limiter", label: "Rate Limiter", group: "Traffic", Icon: Gauge, tone: "amber", defaultCapacity: 11000, defaultLatency: 20, defaultReplicas: 2, description: "Quota enforcement" },
  { id: "websocket_gateway", label: "WebSocket Gateway", group: "Realtime", Icon: Radio, tone: "cyan", defaultCapacity: 4500, defaultLatency: 42, defaultReplicas: 4, description: "Persistent connections" },
  { id: "service", label: "Service", group: "Compute", Icon: Server, tone: "emerald", defaultCapacity: 3000, defaultLatency: 70, defaultReplicas: 3, description: "Application service" },
  { id: "microservice", label: "Microservice", group: "Compute", Icon: Layers, tone: "emerald", defaultCapacity: 2500, defaultLatency: 60, defaultReplicas: 3, description: "Domain service" },
  { id: "worker", label: "Worker Pool", group: "Compute", Icon: Cpu, tone: "violet", defaultCapacity: 1800, defaultLatency: 120, defaultReplicas: 6, description: "Async jobs" },
  { id: "scheduler", label: "Scheduler", group: "Compute", Icon: Timer, tone: "slate", defaultCapacity: 700, defaultLatency: 140, description: "Scheduled jobs" },
  { id: "auth", label: "Auth Service", group: "Compute", Icon: Lock, tone: "amber", defaultCapacity: 2600, defaultLatency: 62, defaultReplicas: 3, description: "Identity and sessions" },
  { id: "search_service", label: "Search Service", group: "Compute", Icon: Search, tone: "blue", defaultCapacity: 2200, defaultLatency: 95, defaultReplicas: 4, description: "Search API" },
  { id: "ranking", label: "Ranking Service", group: "Compute", Icon: Sparkles, tone: "violet", defaultCapacity: 1500, defaultLatency: 150, defaultReplicas: 5, description: "Personalization" },
  { id: "ml_inference", label: "ML Inference", group: "Compute", Icon: Bot, tone: "violet", defaultCapacity: 900, defaultLatency: 180, defaultReplicas: 6, description: "Model serving" },
  { id: "media_transcoder", label: "Transcoder", group: "Compute", Icon: Workflow, tone: "rose", defaultCapacity: 500, defaultLatency: 650, defaultReplicas: 8, description: "Media conversion" },
  { id: "payment", label: "Payment Service", group: "Product", Icon: ShieldCheck, tone: "rose", defaultCapacity: 1200, defaultLatency: 180, defaultReplicas: 3, description: "Payment orchestration" },
  { id: "notification", label: "Notification", group: "Product", Icon: MessageSquare, tone: "amber", defaultCapacity: 3000, defaultLatency: 75, defaultReplicas: 4, description: "Push delivery" },
  { id: "email", label: "Email/SMS", group: "Product", Icon: MessageSquare, tone: "slate", defaultCapacity: 1500, defaultLatency: 250, defaultReplicas: 2, description: "Outbound messaging" },
  { id: "cache", label: "Cache", group: "Data", Icon: Boxes, tone: "amber", defaultCapacity: 18000, defaultLatency: 10, defaultReplicas: 3, description: "Hot data" },
  { id: "kv_store", label: "KV Store", group: "Data", Icon: Boxes, tone: "amber", defaultCapacity: 13000, defaultLatency: 16, defaultReplicas: 3, description: "Key/value data" },
  { id: "sql", label: "SQL Database", group: "Data", Icon: Database, tone: "violet", defaultCapacity: 2200, defaultLatency: 85, defaultReplicas: 2, description: "Relational store" },
  { id: "nosql", label: "NoSQL Database", group: "Data", Icon: Database, tone: "violet", defaultCapacity: 6500, defaultLatency: 55, defaultReplicas: 5, description: "Wide-column data" },
  { id: "graph_db", label: "Graph DB", group: "Data", Icon: GitBranch, tone: "violet", defaultCapacity: 1800, defaultLatency: 125, defaultReplicas: 3, description: "Relationship graph" },
  { id: "timeseries", label: "Time-series DB", group: "Data", Icon: Activity, tone: "blue", defaultCapacity: 9000, defaultLatency: 42, defaultReplicas: 4, description: "Metrics store" },
  { id: "search_index", label: "Search Index", group: "Data", Icon: Search, tone: "blue", defaultCapacity: 4200, defaultLatency: 70, defaultReplicas: 5, description: "Inverted index" },
  { id: "object_storage", label: "Object Storage", group: "Data", Icon: HardDrive, tone: "slate", defaultCapacity: 26000, defaultLatency: 95, defaultReplicas: 6, description: "Blob/object data" },
  { id: "blob_storage", label: "Blob Storage", group: "Data", Icon: HardDrive, tone: "slate", defaultCapacity: 22000, defaultLatency: 90, defaultReplicas: 6, description: "Large binary assets" },
  { id: "queue", label: "Queue", group: "Messaging", Icon: Workflow, tone: "rose", defaultCapacity: 7000, defaultLatency: 55, defaultReplicas: 3, description: "Async queue" },
  { id: "pubsub", label: "Pub/Sub", group: "Messaging", Icon: Radio, tone: "cyan", defaultCapacity: 8500, defaultLatency: 48, defaultReplicas: 4, description: "Fanout messaging" },
  { id: "stream", label: "Event Stream", group: "Messaging", Icon: Activity, tone: "rose", defaultCapacity: 12000, defaultLatency: 38, defaultReplicas: 5, description: "Ordered events" },
  { id: "event_bus", label: "Event Bus", group: "Messaging", Icon: Zap, tone: "rose", defaultCapacity: 10000, defaultLatency: 44, defaultReplicas: 4, description: "Event routing" },
  { id: "service_mesh", label: "Service Mesh", group: "Reliability", Icon: Network, tone: "blue", defaultCapacity: 14000, defaultLatency: 12, defaultReplicas: 3, description: "Internal routing" },
  { id: "monitoring", label: "Monitoring", group: "Reliability", Icon: Gauge, tone: "emerald", defaultCapacity: 12000, defaultLatency: 35, defaultReplicas: 2, description: "Metrics and alerts" },
  { id: "logging", label: "Logging", group: "Reliability", Icon: FileText, tone: "slate", defaultCapacity: 9000, defaultLatency: 65, defaultReplicas: 3, description: "Log pipeline" },
  { id: "backup", label: "Backup Store", group: "Reliability", Icon: Copy, tone: "slate", defaultCapacity: 3000, defaultLatency: 220, defaultReplicas: 2, description: "Snapshots" },
  { id: "feature_flags", label: "Feature Flags", group: "Reliability", Icon: SlidersHorizontal, tone: "amber", defaultCapacity: 8000, defaultLatency: 18, defaultReplicas: 3, description: "Runtime controls" },
  { id: "external_api", label: "External API", group: "External", Icon: Link2, tone: "slate", defaultCapacity: 1200, defaultLatency: 260, defaultReplicas: 1, description: "Third-party dependency" }
];

const kindById = Object.fromEntries(componentCatalog.map((kind) => [kind.id, kind] as const));

const templates: TemplateDefinition[] = [
  {
    id: "youtube_video_upload_streaming",
    name: "YouTube Video Upload & Streaming",
    difficulty: "HARD",
    profile: "media",
    workload: { rps: 3200, readPercent: 92, burstiness: 55, regions: 6 },
    prompt: "Design upload, transcode, metadata, and global playback for a video platform.",
    requirements: ["Large object uploads", "Async transcoding", "Metadata search", "CDN playback", "Backpressure"]
  },
  {
    id: "whatsapp_realtime_messaging",
    name: "WhatsApp Realtime Messaging",
    difficulty: "HARD",
    profile: "realtime",
    workload: { rps: 7800, readPercent: 55, burstiness: 72, regions: 8 },
    prompt: "Design ordered realtime chat with presence, receipts, reconnects, and push notifications.",
    requirements: ["WebSocket fanout", "Per-conversation ordering", "Offline delivery", "Presence", "Reconnect storms"]
  },
  {
    id: "uber_ride_matching",
    name: "Uber Ride Matching",
    difficulty: "HARD",
    profile: "geo",
    workload: { rps: 5200, readPercent: 68, burstiness: 64, regions: 12 },
    prompt: "Design rider-driver matching, live location ingestion, surge, and trip state.",
    requirements: ["Geo index", "Live location stream", "Matching latency", "Trip consistency", "Regional failover"]
  },
  {
    id: "instagram_home_feed",
    name: "Instagram Home Feed",
    difficulty: "MEDIUM",
    profile: "feed",
    workload: { rps: 6200, readPercent: 95, burstiness: 48, regions: 7 },
    prompt: "Design a ranked media feed with celebrity hot spots and freshness tradeoffs.",
    requirements: ["Hybrid fanout", "Ranking", "Media CDN", "Graph lookup", "Feed cache"]
  },
  {
    id: "x_twitter_timeline",
    name: "X / Twitter Timeline",
    difficulty: "MEDIUM",
    profile: "feed",
    workload: { rps: 5800, readPercent: 93, burstiness: 70, regions: 7 },
    prompt: "Design timelines, fanout, hot accounts, and freshness during world events.",
    requirements: ["Write fanout", "Timeline cache", "Celebrity path", "Graph service", "Search"]
  },
  {
    id: "google_docs_collaborative_editing",
    name: "Google Docs Collaborative Editing",
    difficulty: "HARD",
    profile: "collaboration",
    workload: { rps: 3600, readPercent: 52, burstiness: 38, regions: 5 },
    prompt: "Design realtime collaborative editing with convergence, snapshots, and replay.",
    requirements: ["Operation log", "Conflict resolution", "Presence", "Snapshots", "Offline replay"]
  },
  {
    id: "dropbox_file_sync",
    name: "Dropbox File Sync",
    difficulty: "HARD",
    profile: "file",
    workload: { rps: 4100, readPercent: 62, burstiness: 44, regions: 7 },
    prompt: "Design block sync, dedupe, metadata commits, and shared-folder updates.",
    requirements: ["Block upload", "Dedupe", "Metadata transactions", "Change notifications", "Conflict handling"]
  },
  {
    id: "amazon_cart_checkout",
    name: "Amazon Cart & Checkout",
    difficulty: "HARD",
    profile: "commerce",
    workload: { rps: 6800, readPercent: 74, burstiness: 76, regions: 9 },
    prompt: "Design cart, inventory reservations, checkout orchestration, and payment correctness.",
    requirements: ["Idempotency", "Reservation expiry", "Inventory consistency", "Payment retries", "Order events"]
  },
  {
    id: "airbnb_search_booking",
    name: "Airbnb Search & Booking",
    difficulty: "HARD",
    profile: "commerce",
    workload: { rps: 4600, readPercent: 88, burstiness: 50, regions: 7 },
    prompt: "Design marketplace search, date-range availability, booking locks, and stale inventory.",
    requirements: ["Search index", "Availability lock", "Booking workflow", "Geo filtering", "Cache invalidation"]
  },
  {
    id: "spotify_music_streaming",
    name: "Spotify Music Streaming",
    difficulty: "MEDIUM",
    profile: "media",
    workload: { rps: 5000, readPercent: 96, burstiness: 42, regions: 8 },
    prompt: "Design playlist metadata, audio manifests, CDN delivery, and playback continuity.",
    requirements: ["Manifest service", "CDN cache", "Metadata store", "Recommendations", "Offline mode"]
  },
  {
    id: "tiktok_for_you_feed",
    name: "TikTok For You Feed",
    difficulty: "HARD",
    profile: "feed",
    workload: { rps: 8400, readPercent: 97, burstiness: 63, regions: 10 },
    prompt: "Design multi-stage retrieval and ranking for a short-video recommendation feed.",
    requirements: ["Candidate retrieval", "ML ranking", "Prefetch", "Video CDN", "Experiment controls"]
  },
  {
    id: "zoom_group_video_calls",
    name: "Zoom Group Video Calls",
    difficulty: "HARD",
    profile: "video-call",
    workload: { rps: 3900, readPercent: 48, burstiness: 68, regions: 9 },
    prompt: "Design signaling, media routing, TURN fallback, and adaptive bitrate group calls.",
    requirements: ["Signaling", "SFU media", "TURN fallback", "Session state", "Metrics"]
  },
  {
    id: "slack_realtime_channels",
    name: "Slack Realtime Channels",
    difficulty: "MEDIUM",
    profile: "realtime",
    workload: { rps: 5400, readPercent: 61, burstiness: 57, regions: 7 },
    prompt: "Design realtime channels, unread sync, replay, and hot-room partition pressure.",
    requirements: ["WebSockets", "Replay log", "Channel partitioning", "Presence", "Search"]
  },
  {
    id: "reddit_front_page",
    name: "Reddit Front Page",
    difficulty: "MEDIUM",
    profile: "feed",
    workload: { rps: 4800, readPercent: 92, burstiness: 45, regions: 6 },
    prompt: "Design vote-heavy ranking, subreddit hot paths, and append-friendly write flows.",
    requirements: ["Vote ingestion", "Ranking", "Feed cache", "Moderation signals", "Search"]
  },
  {
    id: "stripe_payments_platform",
    name: "Stripe Payments Platform",
    difficulty: "HARD",
    profile: "payments",
    workload: { rps: 3100, readPercent: 42, burstiness: 66, regions: 5 },
    prompt: "Design payment intents, ledgers, PSP ambiguity, webhooks, and financial correctness.",
    requirements: ["Idempotency", "Ledger", "Webhook retries", "External PSP", "Audit trail"]
  },
  {
    id: "doordash_delivery_dispatch",
    name: "DoorDash Delivery Dispatch",
    difficulty: "HARD",
    profile: "geo",
    workload: { rps: 5900, readPercent: 70, burstiness: 78, regions: 10 },
    prompt: "Design courier assignment, prep-time prediction, routing, and dinner-rush volatility.",
    requirements: ["Courier location", "Assignment", "ETA", "Dispatch events", "Regional isolation"]
  },
  {
    id: "gmail_inbox_search",
    name: "Gmail Inbox Search",
    difficulty: "MEDIUM",
    profile: "search",
    workload: { rps: 4500, readPercent: 87, burstiness: 40, regions: 8 },
    prompt: "Design mail delivery, indexing lag, spam filtering, and sync token correctness.",
    requirements: ["Ingestion", "Search index", "Spam filter", "Mailbox store", "Sync tokens"]
  },
  {
    id: "google_maps_eta_routing",
    name: "Google Maps ETA & Routing",
    difficulty: "HARD",
    profile: "geo",
    workload: { rps: 7200, readPercent: 81, burstiness: 58, regions: 12 },
    prompt: "Design dynamic road graph routing with live traffic, closures, and ETA quality.",
    requirements: ["Road graph", "Traffic stream", "Route cache", "ETA service", "Incident handling"]
  },
  {
    id: "linkedin_news_feed",
    name: "LinkedIn News Feed",
    difficulty: "MEDIUM",
    profile: "feed",
    workload: { rps: 4300, readPercent: 91, burstiness: 36, regions: 6 },
    prompt: "Design professional feed ranking, hybrid fanout, and delayed engagement signals.",
    requirements: ["Graph service", "Feed fanout", "Ranking", "Engagement stream", "Notifications"]
  },
  {
    id: "ticketmaster_flash_sale",
    name: "Ticketmaster Flash Sale",
    difficulty: "HARD",
    profile: "flash-sale",
    workload: { rps: 12000, readPercent: 64, burstiness: 95, regions: 5 },
    prompt: "Design queue fairness, reservation expiry, bot pressure, and oversell prevention.",
    requirements: ["Waiting room", "Fair queue", "Reservation TTL", "Bot defense", "Inventory correctness"]
  }
];

const templateById = Object.fromEntries(templates.map((template) => [template.id, template] as const));

const conceptCategories: ConceptCategory[] = [
  "Foundations",
  "Scaling",
  "Data",
  "Async",
  "Reliability",
  "Algorithms",
  "Security",
  "Operations"
];

const conceptLessons: ConceptLesson[] = [
  {
    id: "request-lifecycle",
    category: "Foundations",
    title: "Request Lifecycle",
    subtitle: "How one click becomes DNS, edge, service, data, and response work.",
    Icon: Route,
    stages: ["Client", "DNS", "CDN", "Gateway", "Service", "Data", "Response"],
    mentalModel: "Every system design starts by tracing one request. If you cannot narrate this path, scaling choices become random.",
    algorithm: [
      "Resolve domain through DNS and route to the nearest edge.",
      "Serve cached/static assets from CDN when possible.",
      "Authenticate, rate limit, and route through gateway or load balancer.",
      "Execute business logic in stateless services.",
      "Read or write data, then return a bounded response."
    ],
    deepDive: [
      "The lifecycle gives you natural places to add latency budgets, failure handling, and observability.",
      "Draw read and write paths separately because their bottlenecks are usually different.",
      "A strong interview answer names which steps are synchronous and which are async."
    ],
    tradeoffs: [
      "More layers improve control but add latency and operational overhead.",
      "Bypassing layers can improve speed but makes policy and monitoring inconsistent."
    ],
    interview: "I will first trace the critical read and write paths, then attach scale, consistency, and failure requirements to each step.",
    patternKindIds: ["browser", "dns", "cdn", "api_gateway", "service", "sql"]
  },
  {
    id: "latency-throughput-capacity",
    category: "Foundations",
    title: "Latency, Throughput, Capacity",
    subtitle: "The three numbers behind every design decision.",
    Icon: Gauge,
    stages: ["RPS", "Queue", "Service Time", "Concurrency", "P99"],
    mentalModel: "Throughput is how many requests you finish. Latency is how long one request waits. Capacity is the point where queues start to explode.",
    algorithm: [
      "Estimate peak RPS and average service time.",
      "Approximate concurrency as RPS times latency in seconds.",
      "Compare load against service capacity and replicas.",
      "Protect p99 by keeping utilization below the danger zone.",
      "Add queueing only when delayed work is acceptable."
    ],
    deepDive: [
      "P99 is usually what users feel during incidents, not the average.",
      "A component at 90 percent utilization can look fine until burstiness arrives.",
      "Capacity planning should include read/write mix, regional fanout, and background jobs."
    ],
    tradeoffs: [
      "Overprovisioning costs money but buys headroom.",
      "Running close to capacity saves money but makes tail latency fragile."
    ],
    interview: "I will budget p99 per hop and keep critical-path services below high utilization so burst traffic does not create queue collapse.",
    patternKindIds: ["api_gateway", "service", "queue", "worker", "monitoring"]
  },
  {
    id: "load-balancing",
    category: "Scaling",
    title: "Load Balancing Algorithms",
    subtitle: "Round robin, weighted routing, least connections, hashing, and power of two choices.",
    Icon: GitBranch,
    stages: ["Client", "Balancer", "Pick", "Replica A", "Replica B", "Replica C"],
    mentalModel: "A load balancer is a decision function. The algorithm chooses fairness, locality, or stability.",
    algorithm: [
      "Round robin: cycle through replicas; simple but blind to load.",
      "Weighted round robin: send more traffic to stronger replicas.",
      "Least connections: favor replicas with fewer active requests.",
      "Consistent hashing: keep a key stuck to a stable replica shard.",
      "Power of two choices: sample two replicas and choose the lighter one."
    ],
    deepDive: [
      "Use least-connections when request durations vary.",
      "Use consistent hashing for sticky cache or shard ownership.",
      "Use health checks so dead replicas leave the rotation quickly."
    ],
    tradeoffs: [
      "Sticky routing improves cache locality but can create hot spots.",
      "Least-connections is adaptive but requires accurate runtime state."
    ],
    interview: "For uneven workloads, I would use health-aware least-connections or power-of-two choices, then add consistent hashing only where key affinity matters.",
    patternKindIds: ["browser", "load_balancer", "service", "service", "service", "monitoring"]
  },
  {
    id: "horizontal-scaling",
    category: "Scaling",
    title: "Horizontal Scaling",
    subtitle: "Make services stateless so replicas can multiply safely.",
    Icon: Server,
    stages: ["Stateless API", "N Replicas", "Shared Cache", "Shared DB", "Autoscale"],
    mentalModel: "Horizontal scaling means any replica can handle any request because durable state lives elsewhere.",
    algorithm: [
      "Move session state to cache or token-based auth.",
      "Run multiple identical service replicas.",
      "Route traffic through a health-aware load balancer.",
      "Scale replicas using CPU, queue depth, RPS, or p99 signals.",
      "Keep deployment units small enough to roll safely."
    ],
    deepDive: [
      "Stateless services scale easier than stateful systems, but still depend on shared data bottlenecks.",
      "Autoscaling should use leading indicators like queue depth, not only CPU.",
      "Cold starts and connection pools can make sudden scale-outs slower than expected."
    ],
    tradeoffs: [
      "More replicas improve availability but increase coordination and database connections.",
      "Autoscaling reacts after demand appears unless predictive scaling is used."
    ],
    interview: "I will make compute stateless, scale it horizontally, and then check whether the data layer became the new bottleneck.",
    patternKindIds: ["load_balancer", "service", "service", "cache", "sql"]
  },
  {
    id: "caching",
    category: "Scaling",
    title: "Caching Strategies",
    subtitle: "Cache-aside, write-through, write-back, TTL, LRU, LFU, and invalidation.",
    Icon: Boxes,
    stages: ["Read", "Cache Hit", "Cache Miss", "DB", "Fill", "TTL"],
    mentalModel: "A cache is a memory of expensive work. The hard part is deciding when that memory becomes a lie.",
    algorithm: [
      "Cache-aside: app checks cache, falls back to DB, then fills cache.",
      "Write-through: write cache and database together.",
      "Write-back: write cache first, flush to database later.",
      "TTL: expire entries after a time window.",
      "LRU/LFU: evict least recently or least frequently used keys."
    ],
    deepDive: [
      "Cache stampede happens when many requests miss the same key at once.",
      "Negative caching stores misses to avoid repeated expensive lookups.",
      "Use jittered TTLs so many keys do not expire at the same instant."
    ],
    tradeoffs: [
      "Cache-aside is simple but can serve stale data.",
      "Write-through improves consistency but increases write latency.",
      "Write-back is fast but risks data loss during cache failure."
    ],
    interview: "For read-heavy hot data I would start with cache-aside plus TTL jitter, then add request coalescing for stampede protection.",
    patternKindIds: ["api_gateway", "service", "cache", "sql", "monitoring"]
  },
  {
    id: "cdn-edge",
    category: "Scaling",
    title: "CDN and Edge Design",
    subtitle: "Move bytes closer to users and protect origin services.",
    Icon: Cloud,
    stages: ["User", "Nearest Edge", "Cached Asset", "Origin Miss", "Origin Fill"],
    mentalModel: "The CDN is a global cache in front of origin. It turns distance into locality.",
    algorithm: [
      "Route the user to a nearby point of presence.",
      "Return cached content if fresh and authorized.",
      "On miss, fetch from origin and store by cache key.",
      "Invalidate or version objects when content changes.",
      "Protect origin with shield caches and request collapsing."
    ],
    deepDive: [
      "Cache keys must include the dimensions that change content, like language or device.",
      "Signed URLs protect private media without making origin handle every request.",
      "Origin shielding reduces duplicate misses from many edge locations."
    ],
    tradeoffs: [
      "Long TTL improves hit rate but slows content freshness.",
      "Fine-grained cache keys improve correctness but reduce hit rate."
    ],
    interview: "I would cache immutable media aggressively with versioned URLs and use signed URLs or short TTLs for private content.",
    patternKindIds: ["browser", "cdn", "api_gateway", "object_storage", "monitoring"]
  },
  {
    id: "sharding",
    category: "Data",
    title: "Sharding Algorithms",
    subtitle: "Hash, range, geo, directory, and consistent hashing partitions.",
    Icon: Database,
    stages: ["Key", "Router", "Shard 1", "Shard 2", "Shard 3", "Rebalance"],
    mentalModel: "Sharding chooses where data lives. The shard key decides your future bottlenecks.",
    algorithm: [
      "Hash sharding: hash key modulo shard count.",
      "Range sharding: ordered key ranges per shard.",
      "Geo sharding: partition by region or locality.",
      "Directory sharding: lookup table maps key to shard.",
      "Consistent hashing: minimizes movement when shards change."
    ],
    deepDive: [
      "Bad shard keys create hot partitions even when total capacity looks fine.",
      "Cross-shard transactions and joins become expensive.",
      "Rebalancing needs throttling, dual writes, or background migration."
    ],
    tradeoffs: [
      "Hashing spreads load but destroys range locality.",
      "Range sharding supports scans but can hot spot on monotonic keys.",
      "Directory sharding is flexible but adds a metadata dependency."
    ],
    interview: "I would pick the shard key from the dominant access pattern, then call out hot-key mitigation and rebalancing.",
    patternKindIds: ["api_gateway", "service", "kv_store", "sql", "sql", "sql"]
  },
  {
    id: "replication-quorum",
    category: "Data",
    title: "Replication and Quorums",
    subtitle: "Leader/follower, multi-leader, leaderless, read quorum, write quorum.",
    Icon: Copy,
    stages: ["Write", "Leader", "Replica A", "Replica B", "Quorum", "Read"],
    mentalModel: "Replication copies data for availability. Quorums decide how many copies must agree before you trust the answer.",
    algorithm: [
      "Leader/follower: one primary accepts writes, replicas serve reads.",
      "Multi-leader: multiple regions accept writes, conflicts must be resolved.",
      "Leaderless quorum: write to W replicas and read from R replicas.",
      "For N replicas, choose R + W > N for strong overlap.",
      "Repair stale replicas through read repair or anti-entropy jobs."
    ],
    deepDive: [
      "Replication lag means a user can write then read stale data from a follower.",
      "Quorum reads improve correctness but cost latency.",
      "Multi-region writes trade correctness simplicity for availability and low local latency."
    ],
    tradeoffs: [
      "Strong reads increase latency and reduce availability during partitions.",
      "Eventual consistency improves availability but needs conflict handling."
    ],
    interview: "If correctness is critical, I will route read-after-write to the leader or require quorum overlap; otherwise I will define acceptable staleness.",
    patternKindIds: ["service", "sql", "sql", "sql", "backup"]
  },
  {
    id: "indexes",
    category: "Data",
    title: "Indexing: B-Tree, LSM, Inverted Index",
    subtitle: "How databases find data without scanning everything.",
    Icon: Search,
    stages: ["Query", "Index", "Pointers", "Rows", "Merge", "Result"],
    mentalModel: "An index is a precomputed map from question shape to data location.",
    algorithm: [
      "B-tree: balanced sorted tree for point lookups and range scans.",
      "LSM tree: writes append to memory/log, flush to sorted files, compact later.",
      "Inverted index: token maps to documents for text search.",
      "Composite index order matters: leftmost prefixes are easiest to use.",
      "Covering index can answer a query without touching the main table."
    ],
    deepDive: [
      "Indexes speed reads but slow writes because every write updates extra structures.",
      "High-cardinality fields usually make better selective indexes.",
      "Search systems need ranking, analyzers, tokenization, and refresh-lag thinking."
    ],
    tradeoffs: [
      "Too few indexes create slow reads.",
      "Too many indexes create slow writes and storage bloat."
    ],
    interview: "I will index the exact access patterns, measure write amplification, and separate search use cases into a search index if needed.",
    patternKindIds: ["search_service", "search_index", "nosql", "stream"]
  },
  {
    id: "transactions-idempotency",
    category: "Data",
    title: "Transactions and Idempotency",
    subtitle: "Correctness under retries, duplicate requests, and partial failure.",
    Icon: ShieldCheck,
    stages: ["Request ID", "Check Key", "Write", "Commit", "Return Same Result"],
    mentalModel: "Idempotency makes repeating the same command safe. Transactions make related changes succeed or fail together.",
    algorithm: [
      "Accept an idempotency key from the caller.",
      "Check if the key already has a completed result.",
      "Run the transaction with uniqueness constraints.",
      "Store the result against the key.",
      "Return the same result for retried requests."
    ],
    deepDive: [
      "Payment, checkout, booking, and inventory flows need duplicate suppression.",
      "Isolation levels decide what concurrent transactions are allowed to see.",
      "Outbox pattern pairs database commit with reliable event publication."
    ],
    tradeoffs: [
      "Serializable isolation is easier to reason about but can reduce throughput.",
      "Lower isolation is faster but requires careful anomaly handling."
    ],
    interview: "For side-effecting APIs I will make the endpoint idempotent and use transactional constraints to prevent duplicate commits.",
    patternKindIds: ["api_gateway", "rate_limiter", "kv_store", "service", "sql", "stream"]
  },
  {
    id: "cap-pacelc",
    category: "Data",
    title: "CAP and PACELC",
    subtitle: "What you sacrifice during partitions and normal operation.",
    Icon: GitBranch,
    stages: ["Partition", "Consistency", "Availability", "Else", "Latency"],
    mentalModel: "CAP is about partition moments. PACELC reminds you there is also a latency vs consistency tradeoff when the network is healthy.",
    algorithm: [
      "During partition, choose consistency or availability for that operation.",
      "Outside partition, choose latency or consistency pressure.",
      "Classify each feature separately rather than labeling the whole system.",
      "Use stronger guarantees for money, inventory, permissions, and identity.",
      "Use weaker guarantees for feeds, counters, analytics, and recommendations."
    ],
    deepDive: [
      "CAP is not a menu for whole databases; it is a lens for operations under network failure.",
      "PACELC helps explain why multi-region strong reads are slower even without failure.",
      "Most real systems mix consistency levels by endpoint."
    ],
    tradeoffs: [
      "Strong consistency simplifies correctness but can reduce regional availability.",
      "Availability-first systems need conflict resolution and user-facing reconciliation."
    ],
    interview: "I will state consistency per workflow: checkout needs strong constraints, feeds can tolerate eventual consistency.",
    patternKindIds: ["api_gateway", "service", "sql", "nosql", "monitoring"]
  },
  {
    id: "queues-streams-pubsub",
    category: "Async",
    title: "Queues, Streams, Pub/Sub",
    subtitle: "Three async tools that solve different messaging problems.",
    Icon: Workflow,
    stages: ["Producer", "Buffer", "Consumer Group", "Retry", "DLQ"],
    mentalModel: "Async messaging decouples when work is accepted from when work is completed.",
    algorithm: [
      "Queue: each message is processed by one worker.",
      "Pub/Sub: each subscriber receives a copy.",
      "Stream: ordered log with offsets and replay.",
      "Use retry with exponential backoff for transient failures.",
      "Send poison messages to a dead-letter queue."
    ],
    deepDive: [
      "Queue depth is a leading signal of overload.",
      "Ordering often reduces parallelism because related messages must share a partition.",
      "Exactly-once delivery is usually achieved through idempotent consumers and dedupe keys."
    ],
    tradeoffs: [
      "Async improves resilience but delays user-visible completion.",
      "More partitions improve throughput but complicate ordering."
    ],
    interview: "I will put non-critical or retryable work behind a queue, and use streams when replay or ordering matters.",
    patternKindIds: ["service", "queue", "worker", "stream", "monitoring"]
  },
  {
    id: "backpressure",
    category: "Async",
    title: "Backpressure",
    subtitle: "Make overload visible and controllable before the system melts.",
    Icon: Activity,
    stages: ["Spike", "Queue Depth", "Throttle", "Shed", "Recover"],
    mentalModel: "Backpressure is the system saying: I can accept work only as fast as I can safely finish it.",
    algorithm: [
      "Measure queue depth, consumer lag, p99, and error rate.",
      "Throttle callers when downstream is saturated.",
      "Prefer bounded queues so overload is visible.",
      "Shed low-priority work before critical work.",
      "Scale consumers only if the bottleneck is actually compute."
    ],
    deepDive: [
      "Unbounded queues hide incidents until delay becomes unacceptable.",
      "Backpressure should propagate toward the caller with clear status codes or retry-after hints.",
      "Priority queues protect critical paths during overload."
    ],
    tradeoffs: [
      "Rejecting work hurts availability but protects latency and correctness.",
      "Buffering work preserves acceptance but can violate freshness requirements."
    ],
    interview: "I will bound queues, expose consumer lag, and shed low-priority work before critical-path latency collapses.",
    patternKindIds: ["api_gateway", "rate_limiter", "queue", "worker", "monitoring"]
  },
  {
    id: "rate-limiting",
    category: "Reliability",
    title: "Rate Limiting Algorithms",
    subtitle: "Token bucket, leaky bucket, fixed window, sliding window, distributed limits.",
    Icon: Gauge,
    stages: ["Request", "Key", "Counter", "Decision", "Allow/429"],
    mentalModel: "Rate limiting protects shared capacity by turning vague fairness into a concrete admission decision.",
    algorithm: [
      "Token bucket: refill tokens over time; burst allowed if tokens exist.",
      "Leaky bucket: drain at constant rate; smooths bursts.",
      "Fixed window: count requests per time bucket; simple but boundary bursts.",
      "Sliding window log: precise but memory heavy.",
      "Sliding window counter: approximate and cheaper."
    ],
    deepDive: [
      "Choose the key carefully: user, IP, API token, org, route, or resource.",
      "Distributed rate limits need shared counters or local limits with reconciliation.",
      "Return retry-after and useful error semantics so clients can behave well."
    ],
    tradeoffs: [
      "Strict global limits are accurate but add latency and a dependency.",
      "Local limits are fast but can exceed the global target during bursts."
    ],
    interview: "I would use token bucket for burst tolerance, sliding counters for fairness, and route high-risk keys through a shared store.",
    patternKindIds: ["api_gateway", "rate_limiter", "kv_store", "service", "monitoring"]
  },
  {
    id: "circuit-breaker",
    category: "Reliability",
    title: "Circuit Breaker and Bulkhead",
    subtitle: "Stop one broken dependency from breaking everything else.",
    Icon: ShieldCheck,
    stages: ["Calls", "Failures", "Open", "Fallback", "Half-open", "Recover"],
    mentalModel: "A circuit breaker stops calling a dependency that is already failing; a bulkhead isolates blast radius.",
    algorithm: [
      "Closed: send calls normally and count failures.",
      "Open: fail fast or use fallback after threshold is crossed.",
      "Half-open: probe with limited traffic.",
      "Close again if probes succeed.",
      "Separate pools per dependency or tenant to create bulkheads."
    ],
    deepDive: [
      "Fail-fast is better than letting threads pile up on a dead dependency.",
      "Fallbacks should be honest: stale cache, degraded UI, or explicit unavailable state.",
      "Bulkheads matter when one slow dependency can exhaust all worker threads."
    ],
    tradeoffs: [
      "Breakers protect the system but can temporarily reject valid work.",
      "Fallbacks improve UX but can hide correctness problems if overused."
    ],
    interview: "For unreliable dependencies I will add timeouts, circuit breakers, and separate pools so failure remains contained.",
    patternKindIds: ["service", "external_api", "cache", "monitoring"]
  },
  {
    id: "slo-observability",
    category: "Reliability",
    title: "SLOs and Observability",
    subtitle: "Metrics, logs, traces, alerts, and error budgets.",
    Icon: Activity,
    stages: ["Signal", "Metric", "Trace", "Log", "Alert", "Budget"],
    mentalModel: "Observability is how the system explains itself while it is failing.",
    algorithm: [
      "Define SLIs: availability, latency, freshness, correctness, durability.",
      "Set SLO targets and error budgets.",
      "Instrument RED: rate, errors, duration.",
      "Use traces to connect slow user requests to internal hops.",
      "Alert on symptoms users feel, not every internal warning."
    ],
    deepDive: [
      "Logs explain single events; metrics show trends; traces show causal paths.",
      "High-cardinality labels can make metrics expensive or unusable.",
      "Good dashboards follow the request path and show saturation first."
    ],
    tradeoffs: [
      "More telemetry improves diagnosis but costs storage and attention.",
      "Noisy alerts train teams to ignore real incidents."
    ],
    interview: "I will define user-facing SLOs first, then instrument each critical hop with rate, error, latency, and saturation signals.",
    patternKindIds: ["service", "logging", "timeseries", "monitoring", "notification"]
  },
  {
    id: "raft-consensus",
    category: "Algorithms",
    title: "Consensus: Raft/Paxos Mental Model",
    subtitle: "How distributed nodes agree on one ordered history.",
    Icon: Network,
    stages: ["Followers", "Election", "Leader", "Log Append", "Majority", "Commit"],
    mentalModel: "Consensus turns many unreliable nodes into one reliable decision log, as long as a majority can communicate.",
    algorithm: [
      "Nodes start as followers with randomized election timers.",
      "A timeout triggers candidate mode and vote requests.",
      "A majority elects one leader for a term.",
      "Leader appends commands to its log and replicates entries.",
      "An entry commits once stored by a majority."
    ],
    deepDive: [
      "Consensus is used for metadata, locks, config, and leadership, not every high-volume data path.",
      "Majority requirement means a minority partition becomes unavailable.",
      "Leader changes must preserve log safety so committed entries are not lost."
    ],
    tradeoffs: [
      "Consensus gives strong coordination but adds latency and availability limits.",
      "Avoid putting high-throughput user events directly through consensus unless required."
    ],
    interview: "I would use consensus for small, critical coordination state, not for the entire data plane.",
    patternKindIds: ["service", "service", "service", "kv_store", "monitoring"]
  },
  {
    id: "leader-election",
    category: "Algorithms",
    title: "Leader Election",
    subtitle: "Pick exactly one coordinator without trusting any single machine forever.",
    Icon: Radio,
    stages: ["Candidates", "Lease", "Heartbeat", "Fail", "Re-elect"],
    mentalModel: "Leader election is temporary authority guarded by heartbeats, leases, or consensus.",
    algorithm: [
      "All candidates try to acquire a lease or win a consensus election.",
      "The leader sends heartbeats while its lease remains valid.",
      "Followers stop trusting the leader after timeout.",
      "A new election starts after failure detection.",
      "Fencing tokens prevent old leaders from writing after lease loss."
    ],
    deepDive: [
      "Clock skew makes lease-based leadership tricky unless the storage layer enforces fencing.",
      "Split brain happens when two leaders believe they are active.",
      "Leader election is common for schedulers, compaction jobs, and shard owners."
    ],
    tradeoffs: [
      "Short timeouts recover faster but create false failovers.",
      "Long timeouts are stable but slow recovery."
    ],
    interview: "I will use a proven coordination store with fencing tokens so stale leaders cannot keep mutating state.",
    patternKindIds: ["scheduler", "kv_store", "service", "service", "monitoring"]
  },
  {
    id: "consistent-hashing",
    category: "Algorithms",
    title: "Consistent Hashing",
    subtitle: "Move only a small slice of keys when nodes join or leave.",
    Icon: GitBranch,
    stages: ["Hash Ring", "Virtual Nodes", "Key", "Next Node", "Minimal Move"],
    mentalModel: "Keys and nodes live on the same ring; each key belongs to the next node clockwise.",
    algorithm: [
      "Hash each node onto a ring, often many times as virtual nodes.",
      "Hash each key onto the same ring.",
      "Assign the key to the first node clockwise.",
      "When a node joins, it takes only nearby key ranges.",
      "When a node leaves, its ranges move to neighbors."
    ],
    deepDive: [
      "Virtual nodes smooth uneven distribution.",
      "Replication can store each key on the next N distinct nodes.",
      "Hot keys still need special handling because hashing spreads keys, not traffic."
    ],
    tradeoffs: [
      "Consistent hashing reduces remapping but makes range scans harder.",
      "More virtual nodes improve balance but increase metadata."
    ],
    interview: "For cache or shard membership changes, consistent hashing limits key movement and keeps most cache locality intact.",
    patternKindIds: ["api_gateway", "cache", "cache", "cache", "monitoring"]
  },
  {
    id: "gossip",
    category: "Algorithms",
    title: "Gossip Protocol",
    subtitle: "Spread membership and health information without a central coordinator.",
    Icon: Radio,
    stages: ["Node A", "Random Peer", "State Merge", "Fanout", "Converge"],
    mentalModel: "Gossip is rumor with math: random peer exchange makes state eventually spread everywhere.",
    algorithm: [
      "Each node periodically chooses random peers.",
      "It sends known membership and versioned state.",
      "Peers merge newer information.",
      "Suspicion increases when heartbeats are missed.",
      "The cluster eventually converges without a central source."
    ],
    deepDive: [
      "Gossip scales well because each node talks to a small number of peers.",
      "It is eventually consistent, so it is not a fit for strict decisions.",
      "Used by cluster membership, service discovery, and anti-entropy repair."
    ],
    tradeoffs: [
      "Decentralized and resilient, but convergence takes time.",
      "Failure detection can produce false positives under network jitter."
    ],
    interview: "I would use gossip for scalable membership/health propagation, then use consensus only where decisions must be exact.",
    patternKindIds: ["service", "service", "service", "service_mesh", "monitoring"]
  },
  {
    id: "crdt-vector-clocks",
    category: "Algorithms",
    title: "Vector Clocks and CRDTs",
    subtitle: "Resolve concurrent writes when no single leader owns truth.",
    Icon: Workflow,
    stages: ["Replica A", "Replica B", "Concurrent Writes", "Merge", "Converge"],
    mentalModel: "Vector clocks detect concurrency; CRDTs define merge rules that always converge.",
    algorithm: [
      "Track a version counter per replica or actor.",
      "Compare vectors to see happened-before vs concurrent updates.",
      "If concurrent, use deterministic merge or expose conflict.",
      "CRDTs design operations so merge is commutative, associative, and idempotent.",
      "Replicas exchange state until they converge."
    ],
    deepDive: [
      "Great for collaborative editing, counters, sets, presence, and offline-first apps.",
      "Some business rules cannot be solved by automatic merge and need user or domain resolution.",
      "Metadata can grow and must be compacted."
    ],
    tradeoffs: [
      "High availability and offline writes, but more complex data models.",
      "Automatic convergence may not match business correctness."
    ],
    interview: "For collaborative or offline data I will use operation logs or CRDTs, but for financial correctness I will keep stronger central constraints.",
    patternKindIds: ["websocket_gateway", "stream", "nosql", "worker", "monitoring"]
  },
  {
    id: "saga-two-phase-commit",
    category: "Algorithms",
    title: "Saga vs Two-Phase Commit",
    subtitle: "Coordinate multi-service writes with either locks or compensations.",
    Icon: Workflow,
    stages: ["Step 1", "Step 2", "Step 3", "Commit", "Compensate"],
    mentalModel: "2PC asks everyone to promise before commit. Saga accepts partial progress and defines how to undo.",
    algorithm: [
      "2PC prepare: coordinator asks participants to lock and promise commit.",
      "2PC commit: coordinator tells all participants to commit.",
      "Saga: execute local transaction then publish next command/event.",
      "On failure, run compensating actions in reverse.",
      "Use idempotent steps and durable state machine records."
    ],
    deepDive: [
      "2PC can block when coordinator or participants fail.",
      "Sagas are more available but require business-specific compensation.",
      "Orchestration centralizes control; choreography uses events between services."
    ],
    tradeoffs: [
      "2PC gives atomicity but harms availability and coupling.",
      "Saga scales across services but exposes intermediate states."
    ],
    interview: "Across microservices, I would prefer a saga with idempotent steps unless the domain absolutely requires atomic cross-service commit.",
    patternKindIds: ["service", "stream", "payment", "sql", "queue", "worker"]
  },
  {
    id: "auth-security",
    category: "Security",
    title: "Auth, Authorization, and Trust Boundaries",
    subtitle: "Identity, permissions, tokens, secrets, and abuse protection.",
    Icon: Lock,
    stages: ["Login", "Token", "Gateway", "Policy", "Service", "Audit"],
    mentalModel: "Authentication answers who you are. Authorization answers what you can do. Trust boundaries decide where checks must happen.",
    algorithm: [
      "Authenticate users or services with a trusted identity provider.",
      "Issue short-lived tokens with scoped claims.",
      "Validate tokens at gateway and enforce fine-grained policy in services.",
      "Store secrets in managed secret storage, not code.",
      "Audit sensitive decisions and administrative actions."
    ],
    deepDive: [
      "Never rely only on UI checks; APIs need server-side authorization.",
      "Service-to-service auth prevents lateral movement after one service is compromised.",
      "Rate limiting and WAF rules are part of security, not just reliability."
    ],
    tradeoffs: [
      "Central policy is consistent but can become a bottleneck.",
      "Distributed policy is fast but needs strong rollout discipline."
    ],
    interview: "I will place coarse auth at the edge and enforce resource-level authorization inside the owning service.",
    patternKindIds: ["waf", "api_gateway", "auth", "service", "logging"]
  },
  {
    id: "deployment-rollout",
    category: "Operations",
    title: "Deployments, Canary, Blue/Green",
    subtitle: "Ship changes while keeping rollback boring.",
    Icon: SlidersHorizontal,
    stages: ["Build", "Canary 1%", "Metrics", "Ramp", "Rollback"],
    mentalModel: "A rollout is a controlled experiment where the blast radius starts tiny and grows only if signals are healthy.",
    algorithm: [
      "Deploy new version to a small canary slice.",
      "Compare error rate, p99, saturation, and business metrics.",
      "Ramp traffic gradually if healthy.",
      "Rollback automatically or pause on regression.",
      "Use feature flags to decouple deploy from release."
    ],
    deepDive: [
      "Blue/green swaps all traffic between two full environments.",
      "Canary gives finer blast-radius control but needs good telemetry.",
      "Database migrations need backwards-compatible expand/contract steps."
    ],
    tradeoffs: [
      "Canary is safer but operationally more complex.",
      "Blue/green is clean but costs more capacity."
    ],
    interview: "I will use canaries plus feature flags, and keep schema migrations backward compatible during rolling deploys.",
    patternKindIds: ["feature_flags", "load_balancer", "service", "service", "monitoring"]
  },
  {
    id: "multi-region",
    category: "Operations",
    title: "Multi-Region Architecture",
    subtitle: "Active-passive, active-active, failover, data residency, and latency.",
    Icon: Globe,
    stages: ["Region A", "Region B", "Route", "Replicate", "Failover"],
    mentalModel: "Multi-region design is a triangle of latency, availability, and consistency.",
    algorithm: [
      "Decide active-passive or active-active per workflow.",
      "Route users by latency, residency, or ownership.",
      "Replicate data with clear consistency expectations.",
      "Test failover and failback, not only failover.",
      "Keep regional dependencies isolated where possible."
    ],
    deepDive: [
      "Active-passive is simpler but may waste capacity and have slower failover.",
      "Active-active lowers latency but creates conflict and coordination problems.",
      "Global databases still face physics: cross-region strong consistency costs latency."
    ],
    tradeoffs: [
      "More regions improve availability and latency but multiply operational complexity.",
      "Strong global consistency can turn a regional issue into a global user-visible delay."
    ],
    interview: "I will choose active-active only for workflows that can handle conflict or tolerate eventual consistency; critical writes may stay region-owned.",
    patternKindIds: ["dns", "cdn", "api_gateway", "api_gateway", "nosql", "monitoring"]
  }
];

const profileBlueprints: Record<
  TemplateProfile,
  {
    nodes: Array<{ key: string; kindId: string; label: string; x: number; y: number; replicas?: number }>;
    edges: Array<[string, string, string?]>;
  }
> = {
  media: {
    nodes: [
      { key: "client", kindId: "browser", label: "Clients", x: 46, y: 92 },
      { key: "cdn", kindId: "cdn", label: "CDN / Edge", x: 238, y: 92 },
      { key: "api", kindId: "api_gateway", label: "API Gateway", x: 430, y: 92 },
      { key: "metadata", kindId: "service", label: "Metadata Service", x: 626, y: 48 },
      { key: "upload", kindId: "service", label: "Upload Service", x: 626, y: 144 },
      { key: "cache", kindId: "cache", label: "Hot Metadata Cache", x: 824, y: 42 },
      { key: "db", kindId: "sql", label: "Metadata DB", x: 1026, y: 42 },
      { key: "object", kindId: "object_storage", label: "Object Storage", x: 824, y: 146 },
      { key: "queue", kindId: "queue", label: "Transcode Queue", x: 626, y: 300 },
      { key: "transcoder", kindId: "media_transcoder", label: "Transcoder Pool", x: 824, y: 300, replicas: 10 },
      { key: "search", kindId: "search_index", label: "Search Index", x: 1026, y: 300 },
      { key: "monitoring", kindId: "monitoring", label: "Observability", x: 824, y: 492 }
    ],
    edges: [
      ["client", "cdn"],
      ["cdn", "api"],
      ["api", "metadata"],
      ["api", "upload"],
      ["metadata", "cache"],
      ["metadata", "db"],
      ["upload", "object"],
      ["upload", "queue"],
      ["queue", "transcoder"],
      ["transcoder", "object"],
      ["transcoder", "search"],
      ["metadata", "monitoring"],
      ["upload", "monitoring"]
    ]
  },
  realtime: {
    nodes: [
      { key: "client", kindId: "mobile", label: "Mobile Clients", x: 46, y: 96 },
      { key: "gateway", kindId: "websocket_gateway", label: "Socket Gateway", x: 248, y: 96, replicas: 8 },
      { key: "presence", kindId: "cache", label: "Presence Cache", x: 462, y: 34 },
      { key: "message", kindId: "service", label: "Message Service", x: 462, y: 146 },
      { key: "stream", kindId: "stream", label: "Ordered Event Stream", x: 672, y: 146 },
      { key: "db", kindId: "nosql", label: "Message Store", x: 888, y: 146 },
      { key: "fanout", kindId: "pubsub", label: "Fanout Pub/Sub", x: 672, y: 300 },
      { key: "notification", kindId: "notification", label: "Push Notification", x: 888, y: 300 },
      { key: "search", kindId: "search_index", label: "Message Search", x: 1080, y: 146 },
      { key: "monitoring", kindId: "monitoring", label: "Realtime Metrics", x: 888, y: 492 }
    ],
    edges: [
      ["client", "gateway"],
      ["gateway", "presence"],
      ["gateway", "message"],
      ["message", "stream"],
      ["stream", "db"],
      ["stream", "fanout"],
      ["fanout", "notification"],
      ["db", "search"],
      ["gateway", "monitoring"],
      ["message", "monitoring"]
    ]
  },
  geo: {
    nodes: [
      { key: "client", kindId: "mobile", label: "Riders / Couriers", x: 46, y: 94 },
      { key: "edge", kindId: "api_gateway", label: "Regional Gateway", x: 238, y: 94 },
      { key: "location", kindId: "stream", label: "Location Stream", x: 430, y: 40 },
      { key: "geo", kindId: "service", label: "Geo Service", x: 430, y: 148 },
      { key: "index", kindId: "kv_store", label: "Geo Index", x: 630, y: 40 },
      { key: "match", kindId: "microservice", label: "Matching Service", x: 630, y: 148, replicas: 6 },
      { key: "route", kindId: "external_api", label: "Routing Provider", x: 830, y: 40 },
      { key: "trip", kindId: "sql", label: "Trip State DB", x: 830, y: 148 },
      { key: "events", kindId: "pubsub", label: "Dispatch Events", x: 630, y: 302 },
      { key: "notify", kindId: "notification", label: "Notifications", x: 830, y: 302 },
      { key: "monitoring", kindId: "monitoring", label: "Regional SLOs", x: 1028, y: 148 }
    ],
    edges: [
      ["client", "edge"],
      ["edge", "location"],
      ["edge", "geo"],
      ["location", "index"],
      ["geo", "match"],
      ["match", "route"],
      ["match", "trip"],
      ["match", "events"],
      ["events", "notify"],
      ["match", "monitoring"],
      ["geo", "monitoring"]
    ]
  },
  feed: {
    nodes: [
      { key: "client", kindId: "mobile", label: "Clients", x: 46, y: 94 },
      { key: "cdn", kindId: "cdn", label: "Media CDN", x: 238, y: 94 },
      { key: "api", kindId: "api_gateway", label: "Feed API", x: 430, y: 94 },
      { key: "feed", kindId: "service", label: "Feed Service", x: 626, y: 48, replicas: 5 },
      { key: "ranking", kindId: "ranking", label: "Ranking Service", x: 626, y: 154, replicas: 7 },
      { key: "cache", kindId: "cache", label: "Timeline Cache", x: 824, y: 48 },
      { key: "graph", kindId: "graph_db", label: "Social Graph", x: 1028, y: 48 },
      { key: "fanout", kindId: "queue", label: "Fanout Queue", x: 626, y: 304 },
      { key: "worker", kindId: "worker", label: "Fanout Workers", x: 824, y: 304 },
      { key: "object", kindId: "object_storage", label: "Media Store", x: 1028, y: 304 },
      { key: "search", kindId: "search_index", label: "Search Index", x: 824, y: 488 },
      { key: "monitoring", kindId: "monitoring", label: "Feed SLOs", x: 1028, y: 488 }
    ],
    edges: [
      ["client", "cdn"],
      ["cdn", "api"],
      ["api", "feed"],
      ["api", "ranking"],
      ["feed", "cache"],
      ["feed", "graph"],
      ["ranking", "cache"],
      ["api", "fanout"],
      ["fanout", "worker"],
      ["worker", "cache"],
      ["worker", "object"],
      ["worker", "search"],
      ["feed", "monitoring"]
    ]
  },
  collaboration: {
    nodes: [
      { key: "client", kindId: "browser", label: "Editors", x: 46, y: 96 },
      { key: "gateway", kindId: "websocket_gateway", label: "Collab Gateway", x: 248, y: 96, replicas: 5 },
      { key: "sync", kindId: "service", label: "Sync Service", x: 456, y: 56, replicas: 5 },
      { key: "presence", kindId: "cache", label: "Presence Cache", x: 456, y: 168 },
      { key: "ops", kindId: "stream", label: "Operation Log", x: 664, y: 56 },
      { key: "resolver", kindId: "worker", label: "Conflict Resolver", x: 664, y: 168 },
      { key: "doc", kindId: "nosql", label: "Document Store", x: 872, y: 56 },
      { key: "snapshot", kindId: "object_storage", label: "Snapshots", x: 872, y: 168 },
      { key: "search", kindId: "search_index", label: "Document Search", x: 1080, y: 56 },
      { key: "monitoring", kindId: "monitoring", label: "Convergence SLOs", x: 872, y: 326 }
    ],
    edges: [
      ["client", "gateway"],
      ["gateway", "sync"],
      ["gateway", "presence"],
      ["sync", "ops"],
      ["ops", "resolver"],
      ["resolver", "doc"],
      ["resolver", "snapshot"],
      ["doc", "search"],
      ["sync", "monitoring"],
      ["resolver", "monitoring"]
    ]
  },
  file: {
    nodes: [
      { key: "client", kindId: "desktop", label: "Sync Clients", x: 46, y: 92 },
      { key: "api", kindId: "api_gateway", label: "Sync API", x: 238, y: 92 },
      { key: "metadata", kindId: "service", label: "Metadata Service", x: 436, y: 42 },
      { key: "upload", kindId: "service", label: "Block Upload", x: 436, y: 154 },
      { key: "dedupe", kindId: "worker", label: "Dedupe Workers", x: 632, y: 154 },
      { key: "object", kindId: "object_storage", label: "Block Store", x: 828, y: 154 },
      { key: "db", kindId: "sql", label: "Metadata DB", x: 632, y: 42 },
      { key: "events", kindId: "pubsub", label: "Change Pub/Sub", x: 828, y: 42 },
      { key: "search", kindId: "search_index", label: "File Search", x: 1028, y: 42 },
      { key: "backup", kindId: "backup", label: "Backup Store", x: 1028, y: 154 },
      { key: "monitoring", kindId: "monitoring", label: "Sync Metrics", x: 828, y: 326 }
    ],
    edges: [
      ["client", "api"],
      ["api", "metadata"],
      ["api", "upload"],
      ["metadata", "db"],
      ["metadata", "events"],
      ["upload", "dedupe"],
      ["dedupe", "object"],
      ["object", "backup"],
      ["db", "search"],
      ["events", "monitoring"],
      ["upload", "monitoring"]
    ]
  },
  commerce: {
    nodes: [
      { key: "client", kindId: "browser", label: "Customers", x: 46, y: 94 },
      { key: "cdn", kindId: "cdn", label: "CDN", x: 226, y: 94 },
      { key: "api", kindId: "api_gateway", label: "Commerce API", x: 408, y: 94 },
      { key: "cart", kindId: "service", label: "Cart Service", x: 598, y: 44 },
      { key: "inventory", kindId: "microservice", label: "Inventory Service", x: 598, y: 154 },
      { key: "checkout", kindId: "service", label: "Checkout Orchestrator", x: 790, y: 94, replicas: 4 },
      { key: "payment", kindId: "payment", label: "Payment Service", x: 984, y: 44 },
      { key: "db", kindId: "sql", label: "Orders / Inventory DB", x: 984, y: 154 },
      { key: "queue", kindId: "queue", label: "Order Events", x: 790, y: 304 },
      { key: "worker", kindId: "worker", label: "Fulfillment Workers", x: 984, y: 304 },
      { key: "cache", kindId: "cache", label: "Catalog Cache", x: 598, y: 304 },
      { key: "monitoring", kindId: "monitoring", label: "Checkout SLOs", x: 984, y: 488 }
    ],
    edges: [
      ["client", "cdn"],
      ["cdn", "api"],
      ["api", "cart"],
      ["api", "inventory"],
      ["cart", "checkout"],
      ["inventory", "checkout"],
      ["checkout", "payment"],
      ["checkout", "db"],
      ["checkout", "queue"],
      ["queue", "worker"],
      ["inventory", "cache"],
      ["checkout", "monitoring"]
    ]
  },
  search: {
    nodes: [
      { key: "client", kindId: "browser", label: "Mail Clients", x: 46, y: 94 },
      { key: "api", kindId: "api_gateway", label: "Inbox API", x: 238, y: 94 },
      { key: "delivery", kindId: "service", label: "Mail Delivery", x: 436, y: 42 },
      { key: "search", kindId: "search_service", label: "Search Service", x: 436, y: 154 },
      { key: "spam", kindId: "ml_inference", label: "Spam Filter", x: 632, y: 42 },
      { key: "mailbox", kindId: "nosql", label: "Mailbox Store", x: 828, y: 42 },
      { key: "queue", kindId: "queue", label: "Index Queue", x: 632, y: 154 },
      { key: "index", kindId: "search_index", label: "Search Index", x: 828, y: 154 },
      { key: "cache", kindId: "cache", label: "Inbox Cache", x: 1028, y: 154 },
      { key: "monitoring", kindId: "monitoring", label: "Index Lag SLOs", x: 828, y: 326 }
    ],
    edges: [
      ["client", "api"],
      ["api", "delivery"],
      ["api", "search"],
      ["delivery", "spam"],
      ["spam", "mailbox"],
      ["delivery", "queue"],
      ["queue", "index"],
      ["search", "index"],
      ["search", "cache"],
      ["index", "monitoring"]
    ]
  },
  payments: {
    nodes: [
      { key: "client", kindId: "browser", label: "Merchants", x: 46, y: 94 },
      { key: "api", kindId: "api_gateway", label: "Payments API", x: 238, y: 94 },
      { key: "limiter", kindId: "rate_limiter", label: "Idempotency Guard", x: 430, y: 42 },
      { key: "intent", kindId: "service", label: "Payment Intents", x: 430, y: 154 },
      { key: "ledger", kindId: "microservice", label: "Ledger Service", x: 632, y: 154 },
      { key: "kv", kindId: "kv_store", label: "Idempotency Store", x: 632, y: 42 },
      { key: "psp", kindId: "external_api", label: "Processor / Bank", x: 836, y: 154 },
      { key: "db", kindId: "sql", label: "Ledger DB", x: 836, y: 42 },
      { key: "webhooks", kindId: "queue", label: "Webhook Queue", x: 632, y: 320 },
      { key: "worker", kindId: "worker", label: "Retry Workers", x: 836, y: 320 },
      { key: "monitoring", kindId: "monitoring", label: "Financial Audit", x: 1038, y: 154 }
    ],
    edges: [
      ["client", "api"],
      ["api", "limiter"],
      ["api", "intent"],
      ["limiter", "kv"],
      ["intent", "ledger"],
      ["ledger", "db"],
      ["ledger", "psp"],
      ["ledger", "webhooks"],
      ["webhooks", "worker"],
      ["worker", "psp"],
      ["ledger", "monitoring"]
    ]
  },
  "video-call": {
    nodes: [
      { key: "client", kindId: "browser", label: "Call Clients", x: 46, y: 94 },
      { key: "signal", kindId: "websocket_gateway", label: "Signaling Gateway", x: 244, y: 94, replicas: 6 },
      { key: "session", kindId: "service", label: "Session Service", x: 444, y: 42 },
      { key: "presence", kindId: "cache", label: "Participant State", x: 444, y: 154 },
      { key: "sfu", kindId: "service", label: "SFU Media Routers", x: 646, y: 94, replicas: 12 },
      { key: "turn", kindId: "external_api", label: "TURN Fallback", x: 850, y: 42 },
      { key: "pubsub", kindId: "pubsub", label: "Control Pub/Sub", x: 850, y: 154 },
      { key: "db", kindId: "nosql", label: "Session Store", x: 1052, y: 42 },
      { key: "metrics", kindId: "timeseries", label: "Media Metrics", x: 1052, y: 154 },
      { key: "monitoring", kindId: "monitoring", label: "QoS Alarms", x: 850, y: 324 }
    ],
    edges: [
      ["client", "signal"],
      ["signal", "session"],
      ["signal", "presence"],
      ["session", "sfu"],
      ["sfu", "turn"],
      ["sfu", "pubsub"],
      ["session", "db"],
      ["sfu", "metrics"],
      ["metrics", "monitoring"],
      ["signal", "monitoring"]
    ]
  },
  analytics: {
    nodes: [
      { key: "client", kindId: "browser", label: "Event Sources", x: 46, y: 94 },
      { key: "collector", kindId: "api_gateway", label: "Collectors", x: 238, y: 94, replicas: 8 },
      { key: "stream", kindId: "stream", label: "Event Stream", x: 436, y: 94 },
      { key: "processor", kindId: "worker", label: "Stream Processors", x: 636, y: 42 },
      { key: "warehouse", kindId: "object_storage", label: "Data Lake", x: 836, y: 42 },
      { key: "timeseries", kindId: "timeseries", label: "Realtime Metrics", x: 636, y: 154 },
      { key: "dashboard", kindId: "service", label: "Dashboard API", x: 836, y: 154 },
      { key: "alerts", kindId: "notification", label: "Alerts", x: 1036, y: 154 },
      { key: "monitoring", kindId: "monitoring", label: "Pipeline Health", x: 836, y: 326 }
    ],
    edges: [
      ["client", "collector"],
      ["collector", "stream"],
      ["stream", "processor"],
      ["processor", "warehouse"],
      ["processor", "timeseries"],
      ["timeseries", "dashboard"],
      ["dashboard", "alerts"],
      ["stream", "monitoring"],
      ["processor", "monitoring"]
    ]
  },
  "flash-sale": {
    nodes: [
      { key: "client", kindId: "browser", label: "Buyers", x: 46, y: 94 },
      { key: "waf", kindId: "waf", label: "Bot Defense", x: 230, y: 94 },
      { key: "waiting", kindId: "queue", label: "Waiting Room", x: 422, y: 94 },
      { key: "api", kindId: "api_gateway", label: "Sale API", x: 622, y: 94 },
      { key: "reservation", kindId: "service", label: "Reservation Service", x: 822, y: 42 },
      { key: "inventory", kindId: "sql", label: "Inventory DB", x: 1022, y: 42 },
      { key: "cache", kindId: "cache", label: "Seat Cache", x: 822, y: 154 },
      { key: "payment", kindId: "payment", label: "Payment Service", x: 1022, y: 154 },
      { key: "events", kindId: "stream", label: "Sale Events", x: 822, y: 322 },
      { key: "monitoring", kindId: "monitoring", label: "Fairness SLOs", x: 1022, y: 322 }
    ],
    edges: [
      ["client", "waf"],
      ["waf", "waiting"],
      ["waiting", "api"],
      ["api", "reservation"],
      ["reservation", "inventory"],
      ["reservation", "cache"],
      ["reservation", "payment"],
      ["reservation", "events"],
      ["events", "monitoring"],
      ["payment", "monitoring"]
    ]
  }
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createNode(kindId: string, x: number, y: number, label?: string): DiagramNode {
  const kind = kindById[kindId] ?? componentCatalog[0]!;
  return {
    id: makeId("node"),
    kindId: kind.id,
    label: label ?? kind.label,
    x: clamp(Math.round(x), 16, CANVAS_WIDTH - NODE_WIDTH - 16),
    y: clamp(Math.round(y), 16, CANVAS_HEIGHT - NODE_HEIGHT - 16),
    capacity: kind.defaultCapacity,
    latency: kind.defaultLatency,
    replicas: kind.defaultReplicas ?? 1,
    health: "healthy"
  };
}

function createEdge(from: string, to: string, nodes: DiagramNode[], label?: string): DiagramEdge {
  const fromNode = nodes.find((node) => node.id === from);
  const toNode = nodes.find((node) => node.id === to);
  return {
    id: makeId("edge"),
    from,
    to,
    label: label ?? `${fromNode?.label ?? "Source"} to ${toNode?.label ?? "Target"}`,
    traffic: 0,
    latency: 0,
    status: "healthy"
  };
}

function createTemplateScene(templateId = "x_twitter_timeline"): SystemDesignScene {
  const template = templateById[templateId] ?? templates[4]!;
  const blueprint = profileBlueprints[template.profile];
  const idByKey = new Map<string, string>();
  const nodes = blueprint.nodes.map((raw) => {
    const node = createNode(raw.kindId, raw.x, raw.y, raw.label);
    node.id = `${template.id}_${raw.key}`;
    node.replicas = raw.replicas ?? node.replicas;
    idByKey.set(raw.key, node.id);
    return node;
  });
  const edges = blueprint.edges.flatMap(([fromKey, toKey, label]) => {
    const from = idByKey.get(fromKey);
    const to = idByKey.get(toKey);
    if (!from || !to) return [];
    const edge = createEdge(from, to, nodes, label);
    edge.id = `${template.id}_${fromKey}_${toKey}`;
    return [edge];
  });

  return {
    templateId: template.id,
    templateName: template.name,
    nodes,
    edges,
    workload: template.workload,
    simulationRunning: true,
    chaosEvents: [],
    notes: "",
    challenge: { durationMin: 45 },
    updatedAt: Date.now()
  };
}

function normalizeScene(input: unknown): SystemDesignScene | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SystemDesignScene>;
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return null;
  const template = templateById[String(raw.templateId ?? "")] ?? templates[4]!;

  return {
    templateId: String(raw.templateId ?? template.id),
    templateName: String(raw.templateName ?? template.name),
    nodes: raw.nodes
      .filter((node): node is DiagramNode => Boolean(node && typeof node === "object"))
      .map((node) => ({
        id: String(node.id),
        kindId: kindById[node.kindId] ? node.kindId : "service",
        label: String(node.label ?? kindById[node.kindId]?.label ?? "Component"),
        x: clamp(Number(node.x) || 40, 16, CANVAS_WIDTH - NODE_WIDTH - 16),
        y: clamp(Number(node.y) || 40, 16, CANVAS_HEIGHT - NODE_HEIGHT - 16),
        capacity: clamp(Number(node.capacity) || kindById[node.kindId]?.defaultCapacity || 1000, 100, 100000),
        latency: clamp(Number(node.latency) || kindById[node.kindId]?.defaultLatency || 50, 1, 5000),
        replicas: clamp(Number(node.replicas) || 1, 1, 100),
        health: node.health === "failed" || node.health === "degraded" ? node.health : "healthy",
        notes: typeof node.notes === "string" ? node.notes : undefined
      })),
    edges: raw.edges
      .filter((edge): edge is DiagramEdge => Boolean(edge && typeof edge === "object"))
      .map((edge) => ({
        id: String(edge.id),
        from: String(edge.from),
        to: String(edge.to),
        label: String(edge.label ?? "flow"),
        traffic: Number(edge.traffic) || 0,
        latency: Number(edge.latency) || 0,
        status: edge.status === "failed" || edge.status === "degraded" ? edge.status : "healthy"
      })),
    workload: {
      rps: clamp(Number(raw.workload?.rps) || template.workload.rps, 10, 100000),
      readPercent: clamp(Number(raw.workload?.readPercent) || template.workload.readPercent, 0, 100),
      burstiness: clamp(Number(raw.workload?.burstiness) || template.workload.burstiness, 0, 100),
      regions: clamp(Number(raw.workload?.regions) || template.workload.regions, 1, 20)
    },
    simulationRunning: Boolean(raw.simulationRunning),
    chaosEvents: Array.isArray(raw.chaosEvents)
      ? raw.chaosEvents
          .filter((event): event is ChaosEvent => Boolean(event && typeof event === "object"))
          .map((event) => ({
            id: String(event.id),
            type:
              event.type === "kill" ||
              event.type === "throttle" ||
              event.type === "partition" ||
              event.type === "overload" ||
              event.type === "cache-miss"
                ? event.type
                : "throttle",
            targetId: String(event.targetId),
            label: String(event.label ?? "Chaos event"),
            createdAt: Number(event.createdAt) || Date.now()
          }))
      : [],
    notes: typeof raw.notes === "string" ? raw.notes : "",
    challenge: {
      startedAt: typeof raw.challenge?.startedAt === "number" ? raw.challenge.startedAt : undefined,
      durationMin: clamp(Number(raw.challenge?.durationMin) || 45, 5, 180)
    },
    updatedAt: Number(raw.updatedAt) || Date.now()
  };
}

function nodeCenter(node: DiagramNode) {
  return {
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT / 2
  };
}

function edgePath(from: DiagramNode, to: DiagramNode) {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  const dx = Math.max(70, Math.abs(b.x - a.x) / 2);
  const c1x = a.x + (b.x >= a.x ? dx : -dx);
  const c2x = b.x - (b.x >= a.x ? dx : -dx);
  return `M ${a.x} ${a.y} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${b.x} ${b.y}`;
}

function computeMetrics(scene: SystemDesignScene, tick: number) {
  const nodeMetrics: Record<string, NodeMetric> = {};
  const edgeMetrics: Record<string, EdgeMetric> = {};
  const incoming = new Map<string, DiagramEdge[]>();
  const outgoing = new Map<string, DiagramEdge[]>();

  for (const node of scene.nodes) {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }
  for (const edge of scene.edges) {
    incoming.get(edge.to)?.push(edge);
    outgoing.get(edge.from)?.push(edge);
  }

  const roots = scene.nodes.filter((node) => {
    const kind = kindById[node.kindId];
    return incoming.get(node.id)?.length === 0 || kind?.group === "Clients";
  });
  const rpsByNode = new Map<string, number>();
  for (const root of roots) {
    rpsByNode.set(root.id, Math.max(rpsByNode.get(root.id) ?? 0, scene.workload.rps / Math.max(1, roots.length)));
  }

  for (let pass = 0; pass < scene.nodes.length + 2; pass += 1) {
    for (const edge of scene.edges) {
      const sourceRps = rpsByNode.get(edge.from) ?? 0;
      if (sourceRps <= 0) continue;
      const fanout = Math.max(1, outgoing.get(edge.from)?.length ?? 1);
      const target = scene.nodes.find((node) => node.id === edge.to);
      const targetKind = target ? kindById[target.kindId] : undefined;
      const readBias = targetKind?.group === "Data" ? scene.workload.readPercent / 100 : 1;
      const nextRps = (sourceRps / fanout) * (0.72 + readBias * 0.34);
      rpsByNode.set(edge.to, Math.max(rpsByNode.get(edge.to) ?? 0, nextRps));
    }
  }

  for (const node of scene.nodes) {
    const chaos = scene.chaosEvents.filter((event) => event.targetId === node.id);
    const killed = node.health === "failed" || chaos.some((event) => event.type === "kill");
    const throttled = chaos.some((event) => event.type === "throttle");
    const overloaded = chaos.some((event) => event.type === "overload");
    const cacheMiss = kindById[node.kindId]?.id === "cache" && scene.chaosEvents.some((event) => event.type === "cache-miss");
    const jitter = scene.simulationRunning ? 1 + Math.sin(tick * 0.65 + node.x * 0.01) * (scene.workload.burstiness / 100) * 0.18 : 1;
    const effectiveCapacity = Math.max(1, node.capacity * Math.max(1, node.replicas) * (throttled ? 0.42 : 1) * (overloaded ? 0.58 : 1));
    const rps = killed ? 0 : (rpsByNode.get(node.id) ?? 0) * jitter * (cacheMiss ? 1.22 : 1);
    const load = killed ? 0 : (rps / effectiveCapacity) * 100;
    const p99 = killed ? 0 : node.latency * (1 + Math.pow(Math.max(0, load) / 70, 1.7)) + (throttled ? 340 : 0) + (cacheMiss ? 80 : 0);
    const errorRate = killed ? 100 : clamp(Math.max(0, load - 92) * 0.6 + (node.health === "degraded" ? 2.5 : 0) + (throttled ? 3.5 : 0), 0, 100);
    const status: NodeHealth = killed ? "failed" : errorRate > 8 || load > 95 || node.health === "degraded" ? "degraded" : "healthy";
    nodeMetrics[node.id] = { rps, load, p99, errorRate, status };
  }

  for (const edge of scene.edges) {
    const fromMetric = nodeMetrics[edge.from];
    const toMetric = nodeMetrics[edge.to];
    const partitioned = scene.chaosEvents.some((event) => event.targetId === edge.id && event.type === "partition");
    const rps = partitioned || fromMetric?.status === "failed" || toMetric?.status === "failed" ? 0 : Math.min(fromMetric?.rps ?? 0, toMetric?.rps ?? 0);
    const p99 = partitioned ? 0 : ((fromMetric?.p99 ?? 0) + (toMetric?.p99 ?? 0)) / 2 + edge.latency;
    const status: NodeHealth = partitioned || fromMetric?.status === "failed" || toMetric?.status === "failed" ? "failed" : fromMetric?.status === "degraded" || toMetric?.status === "degraded" ? "degraded" : "healthy";
    edgeMetrics[edge.id] = { rps, p99, status };
  }

  const totals = Object.values(nodeMetrics);
  const maxP99 = totals.reduce((max, metric) => Math.max(max, metric.p99), 0);
  const avgError = totals.length ? totals.reduce((sum, metric) => sum + metric.errorRate, 0) / totals.length : 0;
  const bottleneck = scene.nodes
    .map((node) => ({ node, metric: nodeMetrics[node.id]! }))
    .sort((a, b) => b.metric.load - a.metric.load)
    .slice(0, 3);

  return { nodeMetrics, edgeMetrics, maxP99, avgError, bottleneck };
}

function evaluateScene(scene: SystemDesignScene) {
  const kindIds = new Set(scene.nodes.map((node) => node.kindId));
  const hasData = ["sql", "nosql", "graph_db", "kv_store", "object_storage", "blob_storage"].some((id) => kindIds.has(id));
  const hasCache = kindIds.has("cache") || kindIds.has("cdn") || kindIds.has("kv_store");
  const hasAsync = ["queue", "pubsub", "stream", "event_bus", "worker"].some((id) => kindIds.has(id));
  const hasIngress = ["api_gateway", "load_balancer", "websocket_gateway"].some((id) => kindIds.has(id));
  const hasReliability = ["monitoring", "logging", "backup", "waf", "service_mesh"].some((id) => kindIds.has(id));
  const replicated = scene.nodes.filter((node) => node.replicas >= 3).length;
  const connectedRatio = scene.nodes.length === 0 ? 0 : scene.edges.length / Math.max(1, scene.nodes.length - 1);
  const hasChaos = scene.chaosEvents.length > 0;

  const rows = [
    {
      label: "Scope",
      score: clamp(Math.round((scene.nodes.length >= 8 ? 3 : 1) + (scene.notes.trim().length > 80 ? 1 : 0) + (scene.workload.rps > 0 ? 1 : 0)), 0, 5),
      detail: "Requirements, constraints, and load model"
    },
    {
      label: "Architecture",
      score: clamp(Math.round((hasIngress ? 1 : 0) + (hasData ? 1 : 0) + (hasCache ? 1 : 0) + (hasAsync ? 1 : 0) + (connectedRatio >= 0.9 ? 1 : 0)), 0, 5),
      detail: "Ingress, data, cache, async, connected flows"
    },
    {
      label: "Scale",
      score: clamp(Math.round((replicated >= 3 ? 2 : replicated >= 1 ? 1 : 0) + (scene.workload.regions >= 3 ? 1 : 0) + (kindIds.has("cdn") ? 1 : 0) + (kindIds.has("rate_limiter") || kindIds.has("waf") ? 1 : 0)), 0, 5),
      detail: "Replicas, regions, edge, protection"
    },
    {
      label: "Failure",
      score: clamp(Math.round((hasReliability ? 2 : 0) + (hasChaos ? 2 : 0) + (kindIds.has("backup") || kindIds.has("pubsub") ? 1 : 0)), 0, 5),
      detail: "Observability, chaos, recovery paths"
    },
    {
      label: "Tradeoffs",
      score: clamp(Math.round((scene.notes.trim().length > 160 ? 2 : 0) + (hasCache ? 1 : 0) + (hasAsync ? 1 : 0) + (kindIds.has("feature_flags") || kindIds.has("service_mesh") ? 1 : 0)), 0, 5),
      detail: "Explicit decisions and operational controls"
    }
  ];
  const total = rows.reduce((sum, row) => sum + row.score, 0);
  return { rows, total, percent: Math.round((total / 25) * 100) };
}

function advisorFindings(scene: SystemDesignScene) {
  const kindIds = new Set(scene.nodes.map((node) => node.kindId));
  const findings: Array<{ tone: "ok" | "warn"; title: string; body: string }> = [];

  if (!kindIds.has("load_balancer") && !kindIds.has("api_gateway") && !kindIds.has("websocket_gateway")) {
    findings.push({ tone: "warn", title: "No resilient ingress", body: "Add an API gateway, load balancer, or socket gateway before core services." });
  }
  if (!kindIds.has("cache") && !kindIds.has("cdn")) {
    findings.push({ tone: "warn", title: "Hot path lacks caching", body: "Add a cache or CDN to reduce repeated reads and protect databases." });
  }
  if (!["queue", "pubsub", "stream", "event_bus"].some((id) => kindIds.has(id))) {
    findings.push({ tone: "warn", title: "No async buffer", body: "Add a queue, stream, or pub/sub path for spikes and retryable work." });
  }
  if (!["monitoring", "logging", "timeseries"].some((id) => kindIds.has(id))) {
    findings.push({ tone: "warn", title: "Observability missing", body: "Add metrics/logging so failure modes can be seen during simulation." });
  }
  if (scene.nodes.some((node) => node.replicas === 1 && kindById[node.kindId]?.group !== "Clients")) {
    findings.push({ tone: "warn", title: "Single-instance services", body: "Increase replicas on critical services or explain the failover path." });
  }
  if (scene.chaosEvents.length === 0) {
    findings.push({ tone: "warn", title: "Failure story untested", body: "Inject at least one failure, throttle, or partition before scoring the design." });
  }
  if (findings.length === 0) {
    findings.push({ tone: "ok", title: "Design covers the fundamentals", body: "Ingress, cache, async buffering, data, and observability are all represented." });
  }

  return findings.slice(0, 5);
}

function formatNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

function formatMs(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 ms";
  if (value >= 1000) return `${(value / 1000).toFixed(1)} s`;
  return `${Math.round(value)} ms`;
}

function healthClasses(status: NodeHealth) {
  if (status === "failed") return "border-signal-rose/40 bg-signal-rose/15 text-signal-rose";
  if (status === "degraded") return "border-amber-300/40 bg-amber-300/12 text-amber-200";
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
}

function difficultyClasses(difficulty: TemplateDefinition["difficulty"]) {
  if (difficulty === "EASY") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (difficulty === "MEDIUM") return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  return "border-signal-rose/30 bg-signal-rose/10 text-signal-rose";
}

function groupCatalog() {
  const groups = new Map<string, ComponentKind[]>();
  for (const kind of componentCatalog) {
    const current = groups.get(kind.group) ?? [];
    current.push(kind);
    groups.set(kind.group, current);
  }
  return Array.from(groups.entries());
}

export function SystemDesignSimulator({ roomId, socket }: { roomId: string; socket: Socket }) {
  const [scene, setScene] = useState<SystemDesignScene>(() => createTemplateScene());
  const [tool, setTool] = useState<ToolMode>("select");
  const [panel, setPanel] = useState<PanelTab>("simulate");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Ready");
  const [tick, setTick] = useState(0);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNode = selectedNodeId ? scene.nodes.find((node) => node.id === selectedNodeId) ?? null : null;
  const selectedEdge = selectedEdgeId ? scene.edges.find((edge) => edge.id === selectedEdgeId) ?? null : null;
  const template = templateById[scene.templateId] ?? templates[4]!;
  const metrics = useMemo(() => computeMetrics(scene, tick), [scene, tick]);
  const rubric = useMemo(() => evaluateScene(scene), [scene]);
  const findings = useMemo(() => advisorFindings(scene), [scene]);

  const broadcastScene = useCallback(
    (nextScene: SystemDesignScene) => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      sendTimerRef.current = setTimeout(() => {
        socket.emit("system-design:update", { roomId, scene: nextScene });
      }, 120);
    },
    [roomId, socket]
  );

  const commitScene = useCallback(
    (updater: SystemDesignScene | ((current: SystemDesignScene) => SystemDesignScene)) => {
      setScene((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        const stamped = { ...next, updatedAt: Date.now() };
        broadcastScene(stamped);
        return stamped;
      });
    },
    [broadcastScene]
  );

  useEffect(() => {
    const handler = (payload: { scene?: unknown } | unknown) => {
      const next = normalizeScene((payload as { scene?: unknown })?.scene ?? payload);
      if (!next) return;
      setScene(next);
      setStatusText("Synced room blueprint");
    };
    socket.on("system-design:update", handler);
    return () => {
      socket.off("system-design:update", handler);
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    };
  }, [socket]);

  useEffect(() => {
    if (!scene.simulationRunning) return;
    const timer = window.setInterval(() => setTick((current) => current + 1), 850);
    return () => window.clearInterval(timer);
  }, [scene.simulationRunning]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nextX = clamp(event.clientX - rect.left - drag.offsetX, 16, CANVAS_WIDTH - NODE_WIDTH - 16);
      const nextY = clamp(event.clientY - rect.top - drag.offsetY, 16, CANVAS_HEIGHT - NODE_HEIGHT - 16);
      commitScene((current) => ({
        ...current,
        nodes: current.nodes.map((node) => (node.id === drag.id ? { ...node, x: Math.round(nextX), y: Math.round(nextY) } : node))
      }));
    };
    const handleUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [commitScene]);

  function addNode(kindId: string, x = 90, y = 90) {
    const node = createNode(kindId, x, y);
    commitScene((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setPanel("inspect");
  }

  function addEdge(from: string, to: string) {
    if (from === to) return;
    if (scene.edges.some((edge) => edge.from === from && edge.to === to)) return;
    const edge = createEdge(from, to, scene.nodes);
    commitScene((current) => ({ ...current, edges: [...current.edges, edge] }));
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setPanel("inspect");
  }

  function handleCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const kindId = event.dataTransfer.getData("application/x-codexa-component");
    if (!kindById[kindId] || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    addNode(kindId, event.clientX - rect.left - NODE_WIDTH / 2, event.clientY - rect.top - NODE_HEIGHT / 2);
  }

  function handleNodePointerDown(event: ReactPointerEvent<HTMLButtonElement>, node: DiagramNode) {
    event.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);

    if (tool === "connect") {
      if (!connectFromId) {
        setConnectFromId(node.id);
        setStatusText(`Connect from ${node.label}`);
        return;
      }
      addEdge(connectFromId, node.id);
      setConnectFromId(null);
      setStatusText("Flow connected");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id: node.id,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
  }

  function updateSelectedNode(patch: Partial<DiagramNode>) {
    if (!selectedNode) return;
    commitScene((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === selectedNode.id ? { ...node, ...patch } : node))
    }));
  }

  function updateSelectedEdge(patch: Partial<DiagramEdge>) {
    if (!selectedEdge) return;
    commitScene((current) => ({
      ...current,
      edges: current.edges.map((edge) => (edge.id === selectedEdge.id ? { ...edge, ...patch } : edge))
    }));
  }

  function deleteSelection() {
    if (selectedNode) {
      commitScene((current) => ({
        ...current,
        nodes: current.nodes.filter((node) => node.id !== selectedNode.id),
        edges: current.edges.filter((edge) => edge.from !== selectedNode.id && edge.to !== selectedNode.id),
        chaosEvents: current.chaosEvents.filter((event) => event.targetId !== selectedNode.id)
      }));
      setSelectedNodeId(null);
      return;
    }
    if (selectedEdge) {
      commitScene((current) => ({
        ...current,
        edges: current.edges.filter((edge) => edge.id !== selectedEdge.id),
        chaosEvents: current.chaosEvents.filter((event) => event.targetId !== selectedEdge.id)
      }));
      setSelectedEdgeId(null);
    }
  }

  function injectChaos(type: ChaosType) {
    const target = type === "partition" ? selectedEdge : selectedNode;
    if (!target) return;
    const label =
      type === "kill"
        ? `Kill ${target.label}`
        : type === "throttle"
        ? `Throttle ${target.label}`
        : type === "overload"
        ? `Overload ${target.label}`
        : type === "cache-miss"
        ? `Cache miss storm at ${target.label}`
        : `Partition ${target.label}`;
    const event: ChaosEvent = {
      id: makeId("chaos"),
      type,
      targetId: target.id,
      label,
      createdAt: Date.now()
    };
    commitScene((current) => ({ ...current, chaosEvents: [event, ...current.chaosEvents].slice(0, 12), simulationRunning: true }));
    setPanel("chaos");
  }

  function removeChaos(id: string) {
    commitScene((current) => ({ ...current, chaosEvents: current.chaosEvents.filter((event) => event.id !== id) }));
  }

  function clearChaos() {
    commitScene((current) => ({ ...current, chaosEvents: [] }));
  }

  function loadTemplate(templateId: string) {
    const next = createTemplateScene(templateId);
    commitScene(next);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConnectFromId(null);
    setStatusText("Template loaded");
  }

  function inferComponents() {
    commitScene((current) => {
      const kindIds = new Set(current.nodes.map((node) => node.kindId));
      const additions: DiagramNode[] = [];
      const edges: DiagramEdge[] = [];
      const anchor = current.nodes.find((node) => ["service", "api_gateway", "websocket_gateway"].includes(node.kindId)) ?? current.nodes[0];
      const startX = clamp((anchor?.x ?? 320) + 210, 30, CANVAS_WIDTH - NODE_WIDTH - 30);
      let nextY = clamp(anchor?.y ?? 120, 30, CANVAS_HEIGHT - NODE_HEIGHT - 30);

      const addSuggestion = (kindId: string, label?: string) => {
        if (kindIds.has(kindId) || additions.some((node) => node.kindId === kindId)) return null;
        const node = createNode(kindId, startX + additions.length * 36, nextY + additions.length * 94, label);
        additions.push(node);
        nextY = clamp(nextY + 8, 30, CANVAS_HEIGHT - NODE_HEIGHT - 30);
        if (anchor) edges.push(createEdge(anchor.id, node.id, [...current.nodes, ...additions]));
        return node;
      };

      addSuggestion("cache", "Suggested Cache");
      addSuggestion("queue", "Suggested Queue");
      addSuggestion("monitoring", "Suggested Monitoring");
      addSuggestion("rate_limiter", "Suggested Rate Limiter");
      if (current.templateId.includes("payment") || current.templateId.includes("checkout")) addSuggestion("kv_store", "Idempotency Store");

      return {
        ...current,
        nodes: [...current.nodes, ...additions],
        edges: [...current.edges, ...edges],
        notes: current.notes || "AI inference added cache, async buffering, observability, and protection components for the current prompt."
      };
    });
    setPanel("ai");
    setStatusText("Inferred missing components");
  }

  function visualizeConcept(concept: ConceptLesson) {
    if (concept.patternKindIds.length === 0) return;
    let firstNodeId = "";
    commitScene((current) => {
      const row = Math.floor(current.nodes.length / 5);
      const baseX = 72;
      const baseY = clamp(440 + (row % 3) * 88, 60, CANVAS_HEIGHT - NODE_HEIGHT - 40);
      const nodes = concept.patternKindIds.map((kindId, index) => {
        const kind = kindById[kindId] ?? kindById.service!;
        const node = createNode(kind.id, baseX + index * 178, baseY + (index % 2) * 38, index === 0 ? concept.title : kind.label);
        if (index === 0) firstNodeId = node.id;
        return node;
      });
      const edges = nodes.slice(1).map((node, index) => createEdge(nodes[index]!.id, node.id, [...current.nodes, ...nodes]));
      return {
        ...current,
        nodes: [...current.nodes, ...nodes],
        edges: [...current.edges, ...edges],
        notes:
          current.notes ||
          `Concept visualized: ${concept.title}. ${concept.mentalModel}`
      };
    });
    setSelectedNodeId(firstNodeId || null);
    setSelectedEdgeId(null);
    setStatusText(`Visualized ${concept.title}`);
  }

  async function copyBlueprint() {
    await navigator.clipboard.writeText(JSON.stringify(scene, null, 2));
    setStatusText("Blueprint JSON copied");
  }

  function updateWorkload(patch: Partial<Workload>) {
    commitScene((current) => ({ ...current, workload: { ...current.workload, ...patch } }));
  }

  function startChallenge() {
    commitScene((current) => ({ ...current, challenge: { ...current.challenge, startedAt: Date.now() } }));
  }

  function resetChallenge() {
    commitScene((current) => ({ ...current, challenge: { durationMin: current.challenge.durationMin } }));
  }

  const challengeRemaining = useMemo(() => {
    if (!scene.challenge.startedAt) return null;
    const endsAt = scene.challenge.startedAt + scene.challenge.durationMin * 60 * 1000;
    const remaining = Math.max(0, endsAt - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [scene.challenge.durationMin, scene.challenge.startedAt, tick]);

  return (
    <div className="flex h-full min-h-[620px] overflow-hidden rounded-lg border border-white/10 bg-[#080a0f] shadow-2xl">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-ink-950/85 lg:flex">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-white/70">
            <Boxes size={14} className="text-emerald-300" />
            Components
          </div>
          <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/40">40+</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {groupCatalog().map(([group, kinds]) => (
            <div key={group} className="mb-3">
              <div className="px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/34">{group}</div>
              <div className="grid gap-1">
                {kinds.map((kind) => {
                  const Icon = kind.Icon;
                  const tone = toneStyles[kind.tone];
                  return (
                    <button
                      key={kind.id}
                      type="button"
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("application/x-codexa-component", kind.id)}
                      onClick={() => addNode(kind.id, 72 + (scene.nodes.length % 5) * 38, 72 + (scene.nodes.length % 6) * 84)}
                      title={kind.description}
                      className="group flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-2 text-left transition hover:border-white/20 hover:bg-white/[0.065]"
                    >
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-md border ${tone.badge}`}>
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/78">{kind.label}</span>
                      <Plus size={12} className="text-white/24 transition group-hover:text-white/55" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-ink-950/75 px-2">
          <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.035] p-1">
            <IconButton active={tool === "select"} title="Select" onClick={() => setTool("select")} icon={MousePointer2} />
            <IconButton active={tool === "connect"} title="Connect" onClick={() => setTool("connect")} icon={Link2} />
          </div>
          <select
            value={scene.templateId}
            onChange={(event) => loadTemplate(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-ink-950 px-2 text-[12px] font-medium text-white/80 outline-none focus:border-emerald-300/50 lg:max-w-xs"
            title="Templates"
          >
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => commitScene((current) => ({ ...current, simulationRunning: !current.simulationRunning }))}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold transition ${
              scene.simulationRunning
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-white/10 bg-white/[0.035] text-white/70 hover:bg-white/[0.07]"
            }`}
          >
            <Play size={13} />
            {scene.simulationRunning ? "Sim live" : "Sim paused"}
          </button>
          <IconButton title="Infer" onClick={inferComponents} icon={Sparkles} />
          <IconButton title="Copy JSON" onClick={copyBlueprint} icon={Download} />
          <IconButton title="Reset template" onClick={() => loadTemplate(scene.templateId)} icon={RefreshCcw} />
          <span className="hidden min-w-[120px] truncate text-right text-[11px] text-white/38 xl:block">{statusText}</span>
        </div>

        <div
          className="relative min-h-0 flex-1 overflow-auto bg-[#07090f]"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleCanvasDrop}
        >
          <div
            ref={canvasRef}
            onPointerDown={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            className="relative"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)",
              backgroundSize: "28px 28px"
            }}
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
              <defs>
                {Object.entries(toneStyles).map(([tone, style]) => (
                  <marker key={tone} id={`arrow-${tone}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill={style.stroke} opacity="0.72" />
                  </marker>
                ))}
              </defs>
              {scene.edges.map((edge) => {
                const from = scene.nodes.find((node) => node.id === edge.from);
                const to = scene.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const status = metrics.edgeMetrics[edge.id]?.status ?? "healthy";
                const fromTone = kindById[from.kindId]?.tone ?? "emerald";
                const style = status === "failed" ? toneStyles.rose : status === "degraded" ? toneStyles.amber : toneStyles[fromTone];
                const path = edgePath(from, to);
                const edgeMetric = metrics.edgeMetrics[edge.id];
                return (
                  <g key={edge.id} className="pointer-events-auto">
                    <path
                      d={path}
                      fill="none"
                      stroke={style.stroke}
                      strokeOpacity={selectedEdgeId === edge.id ? 0.95 : status === "failed" ? 0.35 : 0.52}
                      strokeWidth={selectedEdgeId === edge.id ? 3 : 1.8}
                      strokeDasharray={status === "failed" ? "7 8" : undefined}
                      markerEnd={`url(#arrow-${status === "failed" ? "rose" : status === "degraded" ? "amber" : fromTone})`}
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedEdgeId(edge.id);
                        setSelectedNodeId(null);
                        setPanel("inspect");
                      }}
                    />
                    {scene.simulationRunning && status !== "failed" && (edgeMetric?.rps ?? 0) > 1 && (
                      <>
                        <circle r="4" fill={style.stroke} opacity="0.92">
                          <animateMotion dur={`${clamp(3.4 - (edgeMetric?.rps ?? 0) / 4500, 0.9, 3.2)}s`} repeatCount="indefinite" path={path} />
                        </circle>
                        <circle r="2.3" fill="#ffffff" opacity="0.82">
                          <animateMotion dur={`${clamp(4.2 - (edgeMetric?.rps ?? 0) / 6200, 1.2, 4)}s`} repeatCount="indefinite" path={path} begin="0.45s" />
                        </circle>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {scene.edges.map((edge) => {
              const from = scene.nodes.find((node) => node.id === edge.from);
              const to = scene.nodes.find((node) => node.id === edge.to);
              if (!from || !to) return null;
              const a = nodeCenter(from);
              const b = nodeCenter(to);
              const metric = metrics.edgeMetrics[edge.id];
              return (
                <button
                  key={`${edge.id}-label`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    setSelectedNodeId(null);
                    setPanel("inspect");
                  }}
                  className={`absolute rounded-md border px-1.5 py-0.5 font-mono text-[10px] backdrop-blur ${
                    selectedEdgeId === edge.id ? "border-emerald-300/50 bg-emerald-300/12 text-emerald-200" : "border-white/10 bg-ink-950/82 text-white/45"
                  }`}
                  style={{ left: (a.x + b.x) / 2 - 34, top: (a.y + b.y) / 2 - 14 }}
                >
                  {formatNumber(metric?.rps ?? 0)} rps
                </button>
              );
            })}

            {scene.nodes.map((node) => {
              const kind = kindById[node.kindId] ?? componentCatalog[0]!;
              const Icon = kind.Icon;
              const tone = toneStyles[kind.tone];
              const metric = metrics.nodeMetrics[node.id];
              const status = metric?.status ?? node.health;
              const selected = selectedNodeId === node.id;
              const connecting = connectFromId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onPointerDown={(event) => handleNodePointerDown(event, node)}
                  title={node.label}
                  className={`absolute flex h-[74px] w-[154px] cursor-grab flex-col justify-between rounded-lg border p-2 text-left shadow-[0_16px_50px_-24px_rgba(0,0,0,0.95)] backdrop-blur transition active:cursor-grabbing ${
                    selected || connecting ? "border-white/55 bg-white/[0.12] ring-2 ring-emerald-300/30" : `${tone.node} hover:border-white/35`
                  } ${status === "failed" ? "opacity-55 grayscale" : ""}`}
                  style={{ left: node.x, top: node.y }}
                >
                  <span className="flex min-w-0 items-start gap-2">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${tone.badge}`}>
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-white/90">{node.label}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-white/42">{kind.label}</span>
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${healthClasses(status)}`}>
                      {status === "failed" ? "down" : status === "degraded" ? "hot" : "ok"}
                    </span>
                    <span className="truncate font-mono text-[10px] text-white/46">
                      {formatNumber(metric?.rps ?? 0)} rps · {formatMs(metric?.p99 ?? node.latency)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="hidden w-[350px] shrink-0 flex-col border-l border-white/10 bg-ink-950/85 xl:flex">
        <div className="grid grid-cols-6 border-b border-white/10 p-1">
          <PanelButton active={panel === "inspect"} label="Inspect" icon={Square} onClick={() => setPanel("inspect")} />
          <PanelButton active={panel === "simulate"} label="Sim" icon={Gauge} onClick={() => setPanel("simulate")} />
          <PanelButton active={panel === "chaos"} label="Chaos" icon={Flame} onClick={() => setPanel("chaos")} />
          <PanelButton active={panel === "ai"} label="AI" icon={Bot} onClick={() => setPanel("ai")} />
          <PanelButton active={panel === "concepts"} label="Concepts" icon={FileText} onClick={() => setPanel("concepts")} />
          <PanelButton active={panel === "challenge"} label="Score" icon={Timer} onClick={() => setPanel("challenge")} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {panel === "inspect" && (
            <InspectPanel
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              metrics={metrics}
              updateNode={updateSelectedNode}
              updateEdge={updateSelectedEdge}
              onDelete={deleteSelection}
            />
          )}
          {panel === "simulate" && (
            <SimulationPanel scene={scene} metrics={metrics} updateWorkload={updateWorkload} commitScene={commitScene} />
          )}
          {panel === "chaos" && (
            <ChaosPanel
              scene={scene}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              injectChaos={injectChaos}
              removeChaos={removeChaos}
              clearChaos={clearChaos}
            />
          )}
          {panel === "ai" && <AdvisorPanel findings={findings} onInfer={inferComponents} scene={scene} />}
          {panel === "concepts" && <ConceptsPanel scene={scene} onVisualize={visualizeConcept} />}
          {panel === "challenge" && (
            <ChallengePanel
              template={template}
              scene={scene}
              rubric={rubric}
              remaining={challengeRemaining}
              startChallenge={startChallenge}
              resetChallenge={resetChallenge}
              commitScene={commitScene}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function IconButton({
  title,
  icon: Icon,
  onClick,
  active = false
}: {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-md border transition ${
        active
          ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-200"
          : "border-white/10 bg-white/[0.035] text-white/62 hover:bg-white/[0.075] hover:text-white"
      }`}
    >
      <Icon size={14} />
    </button>
  );
}

function PanelButton({
  active,
  label,
  icon: Icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 flex-col items-center justify-center gap-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider transition ${
        active ? "bg-emerald-400/12 text-emerald-200" : "text-white/42 hover:bg-white/[0.06] hover:text-white/75"
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function InspectPanel({
  selectedNode,
  selectedEdge,
  metrics,
  updateNode,
  updateEdge,
  onDelete
}: {
  selectedNode: DiagramNode | null;
  selectedEdge: DiagramEdge | null;
  metrics: ReturnType<typeof computeMetrics>;
  updateNode: (patch: Partial<DiagramNode>) => void;
  updateEdge: (patch: Partial<DiagramEdge>) => void;
  onDelete: () => void;
}) {
  if (!selectedNode && !selectedEdge) {
    return (
      <PanelShell title="Room Blueprint" icon={Layers}>
        <MetricGrid
          items={[
            { label: "P99", value: formatMs(metrics.maxP99), tone: metrics.maxP99 > 900 ? "warn" : "ok" },
            { label: "Errors", value: `${metrics.avgError.toFixed(1)}%`, tone: metrics.avgError > 5 ? "warn" : "ok" },
            { label: "Hotspots", value: String(metrics.bottleneck.length), tone: "neutral" },
            { label: "Status", value: metrics.avgError > 12 ? "Risk" : "Live", tone: metrics.avgError > 12 ? "warn" : "ok" }
          ]}
        />
        <div className="mt-3 space-y-2">
          {metrics.bottleneck.map(({ node, metric }) => (
            <div key={node.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-2">
              <span className="truncate text-[12px] text-white/72">{node.label}</span>
              <span className="font-mono text-[11px] text-amber-200">{Math.round(metric.load)}%</span>
            </div>
          ))}
        </div>
      </PanelShell>
    );
  }

  if (selectedEdge) {
    const metric = metrics.edgeMetrics[selectedEdge.id];
    return (
      <PanelShell title="Flow" icon={ArrowRight}>
        <LabeledInput label="Label" value={selectedEdge.label} onChange={(value) => updateEdge({ label: value })} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NumberField label="Latency ms" value={selectedEdge.latency} min={0} max={5000} onChange={(value) => updateEdge({ latency: value })} />
          <Readout label="Live RPS" value={formatNumber(metric?.rps ?? 0)} />
        </div>
        <div className={`mt-3 rounded-md border px-3 py-2 text-[12px] ${healthClasses(metric?.status ?? selectedEdge.status)}`}>
          {metric?.status === "failed" ? "partitioned" : metric?.status === "degraded" ? "degraded" : "healthy"}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-signal-rose/25 bg-signal-rose/10 text-[12px] font-semibold text-signal-rose transition hover:bg-signal-rose/15"
        >
          <Trash2 size={13} /> Delete flow
        </button>
      </PanelShell>
    );
  }

  const kind = selectedNode ? kindById[selectedNode.kindId] ?? componentCatalog[0]! : componentCatalog[0]!;
  const metric = selectedNode ? metrics.nodeMetrics[selectedNode.id] : undefined;

  return (
    <PanelShell title="Component" icon={kind.Icon}>
      {selectedNode && (
        <>
          <LabeledInput label="Name" value={selectedNode.label} onChange={(value) => updateNode({ label: value })} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <NumberField label="Replicas" value={selectedNode.replicas} min={1} max={100} onChange={(value) => updateNode({ replicas: value })} />
            <NumberField label="Capacity" value={selectedNode.capacity} min={100} max={100000} onChange={(value) => updateNode({ capacity: value })} />
            <NumberField label="P50 ms" value={selectedNode.latency} min={1} max={5000} onChange={(value) => updateNode({ latency: value })} />
            <Readout label="Load" value={`${Math.round(metric?.load ?? 0)}%`} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1">
            {(["healthy", "degraded", "failed"] as NodeHealth[]).map((health) => (
              <button
                key={health}
                type="button"
                onClick={() => updateNode({ health })}
                className={`h-8 rounded-md border text-[11px] font-semibold capitalize transition ${
                  selectedNode.health === health ? healthClasses(health) : "border-white/10 bg-white/[0.035] text-white/45 hover:bg-white/[0.07]"
                }`}
              >
                {health === "healthy" ? "ok" : health}
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/36">Notes</span>
            <textarea
              value={selectedNode.notes ?? ""}
              onChange={(event) => updateNode({ notes: event.target.value })}
              className="mt-1 h-20 w-full resize-none rounded-md border border-white/10 bg-ink-950 px-2.5 py-2 text-[12px] text-white/75 outline-none placeholder:text-white/25 focus:border-emerald-300/45"
            />
          </label>
          <button
            type="button"
            onClick={onDelete}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-signal-rose/25 bg-signal-rose/10 text-[12px] font-semibold text-signal-rose transition hover:bg-signal-rose/15"
          >
            <Trash2 size={13} /> Delete component
          </button>
        </>
      )}
    </PanelShell>
  );
}

function SimulationPanel({
  scene,
  metrics,
  updateWorkload,
  commitScene
}: {
  scene: SystemDesignScene;
  metrics: ReturnType<typeof computeMetrics>;
  updateWorkload: (patch: Partial<Workload>) => void;
  commitScene: (updater: SystemDesignScene | ((current: SystemDesignScene) => SystemDesignScene)) => void;
}) {
  return (
    <PanelShell title="Traffic Simulation" icon={Gauge}>
      <MetricGrid
        items={[
          { label: "Input", value: `${formatNumber(scene.workload.rps)} rps`, tone: "neutral" },
          { label: "P99", value: formatMs(metrics.maxP99), tone: metrics.maxP99 > 900 ? "warn" : "ok" },
          { label: "Errors", value: `${metrics.avgError.toFixed(1)}%`, tone: metrics.avgError > 5 ? "warn" : "ok" },
          { label: "Regions", value: String(scene.workload.regions), tone: "neutral" }
        ]}
      />
      <div className="mt-4 space-y-4">
        <Slider label="Requests/sec" value={scene.workload.rps} min={100} max={20000} step={100} onChange={(value) => updateWorkload({ rps: value })} />
        <Slider label="Read %" value={scene.workload.readPercent} min={0} max={100} step={1} onChange={(value) => updateWorkload({ readPercent: value })} />
        <Slider label="Burstiness" value={scene.workload.burstiness} min={0} max={100} step={1} onChange={(value) => updateWorkload({ burstiness: value })} />
        <Slider label="Regions" value={scene.workload.regions} min={1} max={20} step={1} onChange={(value) => updateWorkload({ regions: value })} />
      </div>
      <button
        type="button"
        onClick={() => commitScene((current) => ({ ...current, simulationRunning: !current.simulationRunning }))}
        className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border text-[12px] font-semibold transition ${
          scene.simulationRunning
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            : "border-white/10 bg-white/[0.035] text-white/75 hover:bg-white/[0.07]"
        }`}
      >
        <Radio size={14} />
        {scene.simulationRunning ? "Simulation running" : "Start simulation"}
      </button>
      <div className="mt-4 space-y-2">
        {metrics.bottleneck.map(({ node, metric }) => (
          <div key={node.id} className="rounded-md border border-white/10 bg-white/[0.035] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] font-medium text-white/76">{node.label}</span>
              <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${healthClasses(metric.status)}`}>{Math.round(metric.load)}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${metric.load > 90 ? "bg-amber-300" : "bg-emerald-400"}`} style={{ width: `${clamp(metric.load, 2, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function ChaosPanel({
  scene,
  selectedNode,
  selectedEdge,
  injectChaos,
  removeChaos,
  clearChaos
}: {
  scene: SystemDesignScene;
  selectedNode: DiagramNode | null;
  selectedEdge: DiagramEdge | null;
  injectChaos: (type: ChaosType) => void;
  removeChaos: (id: string) => void;
  clearChaos: () => void;
}) {
  return (
    <PanelShell title="Chaos" icon={Flame}>
      <div className="grid grid-cols-2 gap-2">
        <ChaosButton label="Kill" icon={XCircle} disabled={!selectedNode} onClick={() => injectChaos("kill")} />
        <ChaosButton label="Throttle" icon={Gauge} disabled={!selectedNode} onClick={() => injectChaos("throttle")} />
        <ChaosButton label="Overload" icon={Zap} disabled={!selectedNode} onClick={() => injectChaos("overload")} />
        <ChaosButton label="Partition" icon={GitBranch} disabled={!selectedEdge} onClick={() => injectChaos("partition")} />
        <ChaosButton label="Cache miss" icon={Boxes} disabled={!selectedNode} onClick={() => injectChaos("cache-miss")} />
        <button
          type="button"
          onClick={clearChaos}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.035] text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.07]"
        >
          <RefreshCcw size={13} /> Clear
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {scene.chaosEvents.length === 0 ? (
          <EmptyState icon={Flame} label="No active events" />
        ) : (
          scene.chaosEvents.map((event) => (
            <div key={event.id} className="flex items-center gap-2 rounded-md border border-amber-300/20 bg-amber-300/[0.06] p-2.5">
              <AlertTriangle size={14} className="shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-amber-100">{event.label}</div>
                <div className="font-mono text-[10px] text-amber-200/55">{event.type}</div>
              </div>
              <button
                type="button"
                onClick={() => removeChaos(event.id)}
                aria-label="Remove event"
                className="rounded p-1 text-amber-100/55 transition hover:bg-white/10 hover:text-white"
              >
                <XCircle size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </PanelShell>
  );
}

function AdvisorPanel({
  findings,
  onInfer,
  scene
}: {
  findings: Array<{ tone: "ok" | "warn"; title: string; body: string }>;
  onInfer: () => void;
  scene: SystemDesignScene;
}) {
  return (
    <PanelShell title="AI Review" icon={Bot}>
      <button
        type="button"
        onClick={onInfer}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-violet-300/25 bg-violet-300/10 text-[12px] font-semibold text-violet-200 transition hover:bg-violet-300/15"
      >
        <Sparkles size={14} /> Infer missing components
      </button>
      <div className="mt-4 space-y-2">
        {findings.map((finding) => (
          <div
            key={finding.title}
            className={`rounded-md border p-3 ${
              finding.tone === "ok" ? "border-emerald-400/20 bg-emerald-400/[0.06]" : "border-amber-300/20 bg-amber-300/[0.06]"
            }`}
          >
            <div className={`flex items-center gap-2 text-[12px] font-semibold ${finding.tone === "ok" ? "text-emerald-300" : "text-amber-200"}`}>
              {finding.tone === "ok" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {finding.title}
            </div>
            <p className="mt-1 text-[12px] leading-5 text-white/58">{finding.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-white/10 bg-white/[0.035] p-3">
        <div className="flex items-center justify-between text-[11px] text-white/52">
          <span>Diagram</span>
          <span className="font-mono">{scene.nodes.length} nodes · {scene.edges.length} flows</span>
        </div>
      </div>
    </PanelShell>
  );
}

function ConceptsPanel({
  scene,
  onVisualize
}: {
  scene: SystemDesignScene;
  onVisualize: (concept: ConceptLesson) => void;
}) {
  const currentTemplate = templateById[scene.templateId] ?? templates[4]!;
  const [category, setCategory] = useState<ConceptCategory | "All">("All");
  const [selectedId, setSelectedId] = useState<string>(conceptLessons[0]!.id);
  const visibleConcepts = conceptLessons.filter((concept) => category === "All" || concept.category === category);
  const selected =
    conceptLessons.find((concept) => concept.id === selectedId && (category === "All" || concept.category === category)) ??
    visibleConcepts[0] ??
    conceptLessons[0]!;
  const SelectedIcon = selected.Icon;
  const relevant = conceptLessons
    .filter((concept) => {
      if (currentTemplate.profile === "feed") return ["caching", "sharding", "queues-streams-pubsub", "consistent-hashing"].includes(concept.id);
      if (currentTemplate.profile === "payments" || currentTemplate.profile === "commerce") return ["transactions-idempotency", "saga-two-phase-commit", "rate-limiting", "auth-security"].includes(concept.id);
      if (currentTemplate.profile === "realtime" || currentTemplate.profile === "collaboration") return ["queues-streams-pubsub", "crdt-vector-clocks", "backpressure", "slo-observability"].includes(concept.id);
      if (currentTemplate.profile === "geo") return ["multi-region", "sharding", "gossip", "slo-observability"].includes(concept.id);
      return ["request-lifecycle", "caching", "queues-streams-pubsub", "slo-observability"].includes(concept.id);
    })
    .slice(0, 4);

  return (
    <PanelShell title="Concept Studio" icon={FileText}>
      <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[12px] font-semibold text-white/84">Visual curriculum</div>
            <div className="mt-0.5 text-[11px] text-white/42">{conceptLessons.length} system design concepts and algorithms</div>
          </div>
          <span className="rounded border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] text-emerald-300">
            deep mode
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {(["All", ...conceptCategories] as Array<ConceptCategory | "All">).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setCategory(item);
              const next = conceptLessons.find((concept) => item === "All" || concept.category === item);
              if (next) setSelectedId(next.id);
            }}
            className={`h-7 shrink-0 rounded-md border px-2 text-[10px] font-semibold transition ${
              category === item
                ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-200"
                : "border-white/10 bg-white/[0.03] text-white/44 hover:bg-white/[0.07] hover:text-white/72"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {visibleConcepts.map((concept) => {
          const Icon = concept.Icon;
          const active = selected.id === concept.id;
          return (
            <button
              key={concept.id}
              type="button"
              onClick={() => setSelectedId(concept.id)}
              className={`min-h-20 rounded-md border p-2 text-left transition ${
                active
                  ? "border-emerald-300/35 bg-emerald-300/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-ink-950 text-emerald-300">
                  <Icon size={13} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold text-white/82">{concept.title}</span>
                  <span className="mt-0.5 block truncate text-[9.5px] text-white/36">{concept.category}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-[#090b11]">
        <div className="border-b border-white/10 p-3">
          <div className="flex items-start gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-emerald-300/25 bg-emerald-300/10 text-emerald-300">
              <SelectedIcon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-white">{selected.title}</div>
              <p className="mt-1 text-[12px] leading-5 text-white/56">{selected.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onVisualize(selected)}
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-emerald-300/25 bg-emerald-300/10 text-[12px] font-semibold text-emerald-300 transition hover:bg-emerald-300/15"
          >
            <Sparkles size={13} /> Visualize pattern on canvas
          </button>
        </div>

        <ConceptVisual concept={selected} />

        <div className="space-y-3 p-3">
          <ConceptSection title="Mental model" icon={Sparkles}>
            <p className="text-[12px] leading-5 text-white/62">{selected.mentalModel}</p>
          </ConceptSection>

          <ConceptSection title="Algorithm" icon={Workflow}>
            <ol className="space-y-2">
              {selected.algorithm.map((step, index) => (
                <li key={step} className="grid grid-cols-[22px_1fr] gap-2 text-[12px] leading-5 text-white/62">
                  <span className="flex size-5 items-center justify-center rounded border border-violet-300/20 bg-violet-300/10 font-mono text-[10px] text-violet-200">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </ConceptSection>

          <ConceptSection title="Deep understanding" icon={Layers}>
            <div className="space-y-2">
              {selected.deepDive.map((item) => (
                <InsightRow key={item} tone="info" text={item} />
              ))}
            </div>
          </ConceptSection>

          <ConceptSection title="Tradeoffs" icon={GitBranch}>
            <div className="space-y-2">
              {selected.tradeoffs.map((item) => (
                <InsightRow key={item} tone="warn" text={item} />
              ))}
            </div>
          </ConceptSection>

          <div className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              <MessageSquare size={12} /> Interview sentence
            </div>
            <p className="mt-2 text-[12px] leading-5 text-white/68">{selected.interview}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-white/10 bg-white/[0.035] p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/42">Recommended for this template</div>
        <div className="mt-2 grid gap-1.5">
          {relevant.map((concept) => (
            <button
              key={concept.id}
              type="button"
              onClick={() => {
                setCategory("All");
                setSelectedId(concept.id);
              }}
              className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-ink-950 px-2.5 py-2 text-left transition hover:border-emerald-300/25 hover:bg-emerald-300/[0.06]"
            >
              <span className="truncate text-[12px] text-white/70">{concept.title}</span>
              <span className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/38">{concept.category}</span>
            </button>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

function ConceptVisual({ concept }: { concept: ConceptLesson }) {
  return (
    <div className="border-b border-white/10 bg-white/[0.018] p-3">
      <div className="relative overflow-hidden rounded-md border border-white/10 bg-ink-950 p-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "18px 18px"
          }}
        />
        <div className="relative grid gap-2">
          {concept.stages.map((stage, index) => (
            <div key={`${concept.id}-${stage}`} className="grid grid-cols-[26px_1fr] items-center gap-2">
              <span
                className={`flex size-6 items-center justify-center rounded-full border font-mono text-[10px] ${
                  index === 0
                    ? "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan"
                    : index === concept.stages.length - 1
                    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-300"
                    : "border-violet-300/25 bg-violet-300/10 text-violet-200"
                }`}
              >
                {index + 1}
              </span>
              <span className="relative flex h-8 items-center rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-medium text-white/72">
                {stage}
                {index < concept.stages.length - 1 && (
                  <span className="absolute -bottom-[11px] left-3 h-[10px] w-px bg-emerald-300/30" />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConceptSection({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/46">
        <Icon size={12} className="text-emerald-300" />
        {title}
      </div>
      {children}
    </section>
  );
}

function InsightRow({ tone, text }: { tone: "info" | "warn"; text: string }) {
  return (
    <div
      className={`rounded-md border px-2.5 py-2 text-[12px] leading-5 ${
        tone === "warn"
          ? "border-amber-300/18 bg-amber-300/[0.055] text-amber-100/82"
          : "border-signal-cyan/18 bg-signal-cyan/[0.045] text-white/62"
      }`}
    >
      {text}
    </div>
  );
}

function ChallengePanel({
  template,
  scene,
  rubric,
  remaining,
  startChallenge,
  resetChallenge,
  commitScene
}: {
  template: TemplateDefinition;
  scene: SystemDesignScene;
  rubric: ReturnType<typeof evaluateScene>;
  remaining: string | null;
  startChallenge: () => void;
  resetChallenge: () => void;
  commitScene: (updater: SystemDesignScene | ((current: SystemDesignScene) => SystemDesignScene)) => void;
}) {
  return (
    <PanelShell title="Interview Score" icon={Timer}>
      <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[13px] font-semibold text-white/88">{template.name}</div>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${difficultyClasses(template.difficulty)}`}>{template.difficulty}</span>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-white/58">{template.prompt}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {template.requirements.map((requirement) => (
            <span key={requirement} className="rounded border border-white/10 bg-ink-950 px-2 py-0.5 text-[10px] text-white/48">
              {requirement}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <NumberField
          label="Minutes"
          value={scene.challenge.durationMin}
          min={5}
          max={180}
          onChange={(value) => commitScene((current) => ({ ...current, challenge: { ...current.challenge, durationMin: value } }))}
        />
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={scene.challenge.startedAt ? resetChallenge : startChallenge}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 text-[12px] font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
          >
            <Timer size={13} />
            {scene.challenge.startedAt ? remaining ?? "0:00" : "Start"}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-white/10 bg-white/[0.035] p-3">
        <div className="flex items-end justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/42">Overall</span>
          <span className="font-mono text-2xl font-bold text-white">{rubric.percent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${rubric.percent}%` }} />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {rubric.rows.map((row) => (
          <div key={row.label} className="rounded-md border border-white/10 bg-white/[0.035] p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-white/72">{row.label}</span>
              <span className="font-mono text-[11px] text-emerald-300">{row.score}/5</span>
            </div>
            <div className="mt-1 text-[11px] text-white/40">{row.detail}</div>
          </div>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/36">Tradeoff notes</span>
        <textarea
          value={scene.notes}
          onChange={(event) => commitScene((current) => ({ ...current, notes: event.target.value }))}
          className="mt-1 h-28 w-full resize-none rounded-md border border-white/10 bg-ink-950 px-2.5 py-2 text-[12px] leading-5 text-white/75 outline-none placeholder:text-white/25 focus:border-emerald-300/45"
        />
      </label>
    </PanelShell>
  );
}

function PanelShell({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-white/66">
        <Icon size={14} className="text-emerald-300" />
        {title}
      </div>
      {children}
    </div>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: string; tone: "ok" | "warn" | "neutral" }> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/32">{item.label}</div>
          <div className={`mt-1 truncate font-mono text-[15px] font-semibold ${item.tone === "ok" ? "text-emerald-300" : item.tone === "warn" ? "text-amber-200" : "text-white/82"}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/36">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-white/10 bg-ink-950 px-2.5 text-[12px] text-white/78 outline-none focus:border-emerald-300/45"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/36">{label}</span>
      <input
        value={Number.isFinite(value) ? value : 0}
        type="number"
        min={min}
        max={max}
        onChange={(event) => onChange(clamp(Number(event.target.value) || min, min, max))}
        className="mt-1 h-9 w-full rounded-md border border-white/10 bg-ink-950 px-2.5 font-mono text-[12px] text-white/78 outline-none focus:border-emerald-300/45"
      />
    </label>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/36">{label}</div>
      <div className="mt-1 flex h-9 items-center rounded-md border border-white/10 bg-white/[0.035] px-2.5 font-mono text-[12px] text-white/78">{value}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/36">{label}</span>
        <span className="font-mono text-[11px] text-white/58">{formatNumber(value)}</span>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-emerald-400"
      />
    </label>
  );
}

function ChaosButton({
  label,
  icon: Icon,
  disabled,
  onClick
}: {
  label: string;
  icon: LucideIcon;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-300/20 bg-amber-300/[0.07] text-[12px] font-semibold text-amber-200 transition hover:bg-amber-300/12 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.025] disabled:text-white/25"
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function EmptyState({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/12 bg-white/[0.025] text-[12px] text-white/38">
      <Icon size={16} />
      {label}
    </div>
  );
}
