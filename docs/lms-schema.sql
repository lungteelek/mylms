CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE tenant_mode AS ENUM ('saas', 'self_hosted');
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'tutor', 'student');
CREATE TYPE membership_status AS ENUM ('active', 'invited', 'disabled');
CREATE TYPE license_status AS ENUM ('trial', 'active', 'expired', 'suspended');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE node_type AS ENUM ('section', 'lesson', 'quiz', 'assignment');
CREATE TYPE content_type AS ENUM ('video', 'article', 'pdf', 'external_link', 'mixed');
CREATE TYPE asset_type AS ENUM ('pdf', 'link', 'image', 'attachment');
CREATE TYPE video_provider AS ENUM ('mux', 'cloudflare', 'custom');
CREATE TYPE asset_status AS ENUM ('uploading', 'processing', 'ready', 'failed');
CREATE TYPE enrollment_status AS ENUM ('active', 'expiring', 'expired', 'cancelled');
CREATE TYPE progress_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE planner_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE generated_by AS ENUM ('ai', 'manual', 'hybrid');
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'in_app');
CREATE TYPE notification_type AS ENUM ('study_reminder', 'renewal', 'announcement', 'payment', 'system');
CREATE TYPE notification_status AS ENUM ('scheduled', 'sent', 'delivered', 'failed', 'read');
CREATE TYPE kb_visibility AS ENUM ('course_only', 'tenant_wide');
CREATE TYPE kb_source_type AS ENUM ('pdf', 'docx', 'slide', 'transcript', 'note', 'html');
CREATE TYPE chat_mode AS ENUM ('tutor', 'summary', 'exercise');
CREATE TYPE message_role AS ENUM ('system', 'user', 'assistant', 'tool');
CREATE TYPE payment_gateway AS ENUM ('omise', '2c2p', 'bank_transfer', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');

CREATE TABLE tenants (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  mode tenant_mode NOT NULL DEFAULT 'saas',
  status tenant_status NOT NULL DEFAULT 'active',
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
  locale TEXT NOT NULL DEFAULT 'th-TH',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address_line1 TEXT,
  address_line2 TEXT,
  district TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'TH',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE oauth_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_memberships (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE licenses (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  license_key TEXT,
  seats INTEGER,
  expires_at TIMESTAMPTZ,
  status license_status NOT NULL DEFAULT 'trial',
  is_self_hosted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feature_flags (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE courses (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  level TEXT,
  thumbnail_url TEXT,
  status course_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE course_instructors (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'primary',
  UNIQUE (course_id, user_id)
);

CREATE TABLE lesson_nodes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES lesson_nodes(id) ON DELETE CASCADE,
  node_type node_type NOT NULL DEFAULT 'lesson',
  title TEXT NOT NULL,
  path LTREE NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lesson_nodes_path_gist_idx ON lesson_nodes USING GIST (path);
CREATE INDEX lesson_nodes_course_parent_idx ON lesson_nodes (course_id, parent_id, sort_order);

CREATE TABLE lesson_contents (
  id BIGSERIAL PRIMARY KEY,
  lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  html_content TEXT,
  plain_text TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_node_id, version)
);

CREATE TABLE lesson_transcripts (
  id BIGSERIAL PRIMARY KEY,
  lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'th',
  status asset_status NOT NULL DEFAULT 'ready',
  full_text TEXT,
  segments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_node_id)
);

CREATE TABLE lesson_assets (
  id BIGSERIAL PRIMARY KEY,
  lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  external_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE video_assets (
  id BIGSERIAL PRIMARY KEY,
  lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
  provider video_provider NOT NULL,
  provider_asset_id TEXT,
  playback_id TEXT,
  duration_seconds INTEGER,
  status asset_status NOT NULL DEFAULT 'uploading',
  hls_url TEXT,
  poster_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE video_transcripts (
  id BIGSERIAL PRIMARY KEY,
  video_asset_id BIGINT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'th',
  source TEXT NOT NULL DEFAULT 'ai',
  status asset_status NOT NULL DEFAULT 'processing',
  full_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transcript_segments (
  id BIGSERIAL PRIMARY KEY,
  transcript_id BIGINT NOT NULL REFERENCES video_transcripts(id) ON DELETE CASCADE,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  text TEXT NOT NULL,
  speaker_label TEXT,
  token_count INTEGER,
  segment_index INTEGER NOT NULL,
  UNIQUE (transcript_id, segment_index)
);

CREATE INDEX transcript_segments_time_idx ON transcript_segments (transcript_id, start_ms);

CREATE TABLE enrollments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status enrollment_status NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'payment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, course_id, user_id)
);

CREATE TABLE lesson_progress (
  id BIGSERIAL PRIMARY KEY,
  enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
  status progress_status NOT NULL DEFAULT 'not_started',
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (enrollment_id, lesson_node_id)
);

CREATE TABLE playback_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_asset_id BIGINT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
  device_type TEXT,
  speed NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  last_position_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE study_availability (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440),
  end_minute INTEGER NOT NULL CHECK (end_minute > 0 AND end_minute <= 1440),
  preferred_minutes INTEGER NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE study_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  goal_completion_date DATE,
  strategy TEXT,
  status planner_status NOT NULL DEFAULT 'draft',
  generated_by generated_by NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE study_plan_items (
  id BIGSERIAL PRIMARY KEY,
  study_plan_id BIGINT NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,
  planned_minutes INTEGER NOT NULL,
  status progress_status NOT NULL DEFAULT 'not_started',
  ai_notes TEXT
);

CREATE TABLE notification_devices (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  push_token TEXT NOT NULL,
  device_name TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, push_token)
);

COMMENT ON COLUMN notification_devices.platform IS
'Supported values: web, ios, android, line, telegram';

CREATE TABLE notification_rules (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  schedule_json JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload_json JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  status notification_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_bases (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status asset_status NOT NULL DEFAULT 'processing',
  visibility kb_visibility NOT NULL DEFAULT 'course_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kb_documents (
  id BIGSERIAL PRIMARY KEY,
  knowledge_base_id BIGINT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  lesson_node_id BIGINT REFERENCES lesson_nodes(id) ON DELETE SET NULL,
  source_type kb_source_type NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  extracted_text TEXT,
  status asset_status NOT NULL DEFAULT 'processing',
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kb_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  lesson_node_id BIGINT REFERENCES lesson_nodes(id) ON DELETE SET NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding vector(1536),
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX kb_chunks_tenant_course_idx ON kb_chunks (tenant_id, course_id, lesson_node_id);

CREATE TABLE ai_chat_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  lesson_node_id BIGINT REFERENCES lesson_nodes(id) ON DELETE SET NULL,
  mode chat_mode NOT NULL DEFAULT 'tutor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  citations_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE SET NULL,
  gateway payment_gateway NOT NULL,
  gateway_ref TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'THB',
  status payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_webhooks (
  id BIGSERIAL PRIMARY KEY,
  gateway payment_gateway NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gateway, event_id)
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
