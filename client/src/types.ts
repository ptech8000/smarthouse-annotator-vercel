export interface LocationItem {
  id: number;
  name: string;
  normalizedName: string;
  shortLabel: string;
  description?: string;
}

export type InteractionKey = 'solo' | 'collaborative' | 'assistive';

export interface ActivityItem {
  id: number;
  name: string;
  shortLabel: string;
  allowedInteractions?: InteractionKey[];
  canDoTogether?: boolean;
}

export interface InteractionItem {
  key: string;
  label: string;
  shortLabel: string;
  requiresPerson: boolean;
}

export interface ConfigSnapshot {
  schemaVersion: number;
  loadedAt: string;
  residentNumber: number;
  roles: string[];
  locations: LocationItem[];
  activities: ActivityItem[];
  locationActivitiesMap: Record<number, ActivityItem[]>;
  interactions: InteractionItem[];
  hash: string;
}

export interface SessionItem {
  id: string;
  config_hash: string;
  status: 'active' | 'ended';
  timezone: string;
  started_at: string;
  ended_at?: string;
  environment_id?: string;
  environment_name?: string;
}

export interface EnvironmentActivityDraft {
  name: string;
  shortLabel?: string;
  allowedInteractions?: InteractionKey[];
  canDoTogether?: boolean;
}

export interface EnvironmentLocationDraft {
  name: string;
  shortLabel?: string;
  activities: Array<string | EnvironmentActivityDraft>;
}

export interface EnvironmentDraftInput {
  name: string;
  description?: string;
  roles: string[];
  locations: EnvironmentLocationDraft[];
}

export interface EnvironmentItem {
  id: string;
  name: string;
  description: string;
  config_hash: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  snapshot: ConfigSnapshot;
}

export interface SessionSummaryItem extends SessionItem {
  annotation_count: number;
  active_participants?: string;
}

export interface AnnotationPayload {
  client_uuid: string;
  session_id: string;
  participant: string;
  timestamp_started: string;
  timestamp_submitted: string;
  location_id: number;
  location: string;
  activity_id: number;
  activity: string;
  interaction: string;
  other_person: string;
  edited: boolean;
  config_version: string;
}

export interface StoredAnnotation extends AnnotationPayload {
  id?: number;
  seq?: number;
  timestamp_received?: string;
  sync_status?: 'synced' | 'pending';
}

export interface CollaboratorLock {
  session_id: string;
  taken_person: string;
  taken_by: string;
  activity?: string;
  locked_at: string;
}
