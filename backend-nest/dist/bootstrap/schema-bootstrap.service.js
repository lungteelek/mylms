"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SchemaBootstrapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SchemaBootstrapService = SchemaBootstrapService_1 = class SchemaBootstrapService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SchemaBootstrapService_1.name);
    }
    async onModuleInit() {
        await this.ensureCourseTreeSchema();
    }
    async ensureCourseTreeSchema() {
        try {
            await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS ltree`);
            const hasVectorExtension = await this.ensureVectorExtension();
            const embeddingColumnType = hasVectorExtension ? 'vector(1536)' : 'JSONB';
            const statements = [
                `
        CREATE TABLE IF NOT EXISTS tenants (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          mode TEXT NOT NULL DEFAULT 'saas',
          status TEXT NOT NULL DEFAULT 'active',
          timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
          locale TEXT NOT NULL DEFAULT 'th-TH',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          full_name TEXT NOT NULL,
          avatar_url TEXT,
          birth_date DATE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          address_line1 TEXT,
          address_line2 TEXT,
          district TEXT,
          province TEXT,
          postal_code TEXT,
          country TEXT DEFAULT 'TH',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS oauth_accounts (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          provider_user_id TEXT NOT NULL,
          email TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (provider, provider_user_id)
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS tenant_memberships (
          id BIGSERIAL PRIMARY KEY,
          tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'student',
          status TEXT NOT NULL DEFAULT 'active',
          joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, user_id)
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS licenses (
          id BIGSERIAL PRIMARY KEY,
          tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          plan_code TEXT NOT NULL,
          license_key TEXT,
          seats INTEGER,
          expires_at TIMESTAMPTZ,
          status TEXT NOT NULL DEFAULT 'trial',
          is_self_hosted BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS feature_flags (
          id BIGSERIAL PRIMARY KEY,
          tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          key TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT false,
          config_json JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, key)
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS notification_devices (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform TEXT NOT NULL,
          push_token TEXT NOT NULL,
          device_name TEXT,
          last_seen_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (platform, push_token)
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS notification_rules (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          channel TEXT NOT NULL,
          schedule_json JSONB,
          enabled BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS notifications (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          scheduled_at TIMESTAMPTZ,
          sent_at TIMESTAMPTZ,
          read_at TIMESTAMPTZ,
          status TEXT NOT NULL DEFAULT 'scheduled',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS notifications_due_idx
          ON notifications (status, scheduled_at)
        `,
                `
        CREATE TABLE IF NOT EXISTS courses (
          id BIGSERIAL PRIMARY KEY,
          tenant_id BIGINT NOT NULL,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          description TEXT,
          subject TEXT,
          level TEXT,
          thumbnail_url TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          published_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, slug)
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS lesson_nodes (
          id BIGSERIAL PRIMARY KEY,
          tenant_id BIGINT NOT NULL,
          course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          parent_id BIGINT REFERENCES lesson_nodes(id) ON DELETE CASCADE,
          node_type TEXT NOT NULL DEFAULT 'lesson',
          title TEXT NOT NULL,
          path LTREE NOT NULL,
          depth INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_published BOOLEAN NOT NULL DEFAULT false,
          estimated_minutes INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS lesson_nodes_path_gist_idx
          ON lesson_nodes USING GIST (path)
        `,
                `
        CREATE INDEX IF NOT EXISTS lesson_nodes_course_parent_idx
          ON lesson_nodes (course_id, parent_id, sort_order)
        `,
                `
        CREATE INDEX IF NOT EXISTS lesson_nodes_tenant_course_idx
          ON lesson_nodes (tenant_id, course_id, path)
        `,
                `
        CREATE TABLE IF NOT EXISTS lesson_contents (
          id BIGSERIAL PRIMARY KEY,
          lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
          content_type TEXT NOT NULL,
          html_content TEXT,
          plain_text TEXT,
          version INTEGER NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (lesson_node_id, version)
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS lesson_assets (
          id BIGSERIAL PRIMARY KEY,
          lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
          asset_type TEXT NOT NULL,
          title TEXT NOT NULL,
          file_url TEXT,
          external_url TEXT,
          mime_type TEXT,
          size_bytes BIGINT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS lesson_assets_lesson_idx
          ON lesson_assets (lesson_node_id, sort_order, id)
        `,
                `
        CREATE TABLE IF NOT EXISTS lesson_transcripts (
          id BIGSERIAL PRIMARY KEY,
          lesson_node_id BIGINT NOT NULL UNIQUE REFERENCES lesson_nodes(id) ON DELETE CASCADE,
          language TEXT NOT NULL DEFAULT 'th',
          status TEXT NOT NULL DEFAULT 'ready',
          full_text TEXT,
          segments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS lesson_transcripts_updated_idx
          ON lesson_transcripts (updated_at DESC)
        `,
                `
        CREATE TABLE IF NOT EXISTS video_assets (
          id BIGSERIAL PRIMARY KEY,
          lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
          provider TEXT NOT NULL DEFAULT 'custom',
          provider_asset_id TEXT,
          playback_id TEXT,
          duration_seconds INTEGER,
          status TEXT NOT NULL DEFAULT 'uploading',
          hls_url TEXT,
          poster_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS video_assets_lesson_idx
          ON video_assets (lesson_node_id, created_at DESC)
        `,
                `
        CREATE TABLE IF NOT EXISTS video_transcripts (
          id BIGSERIAL PRIMARY KEY,
          video_asset_id BIGINT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
          language TEXT NOT NULL DEFAULT 'th',
          source TEXT NOT NULL DEFAULT 'ai',
          status TEXT NOT NULL DEFAULT 'processing',
          full_text TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS video_transcripts_video_idx
          ON video_transcripts (video_asset_id, created_at DESC)
        `,
                `
        CREATE TABLE IF NOT EXISTS transcript_segments (
          id BIGSERIAL PRIMARY KEY,
          transcript_id BIGINT NOT NULL REFERENCES video_transcripts(id) ON DELETE CASCADE,
          start_ms INTEGER NOT NULL,
          end_ms INTEGER NOT NULL,
          text TEXT NOT NULL,
          speaker_label TEXT,
          token_count INTEGER,
          segment_index INTEGER NOT NULL,
          UNIQUE (transcript_id, segment_index)
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS transcript_segments_time_idx
          ON transcript_segments (transcript_id, start_ms)
        `,
                `
        CREATE TABLE IF NOT EXISTS enrollments (
          id BIGSERIAL PRIMARY KEY,
          tenant_id BIGINT NOT NULL,
          course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          user_id BIGINT NOT NULL,
          started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at TIMESTAMPTZ,
          status TEXT NOT NULL DEFAULT 'active',
          source TEXT NOT NULL DEFAULT 'payment',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, course_id, user_id)
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS enrollments_course_idx
          ON enrollments (tenant_id, course_id, user_id, status)
        `,
                `
        CREATE TABLE IF NOT EXISTS lesson_progress (
          id BIGSERIAL PRIMARY KEY,
          enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
          lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'not_started',
          progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
          last_position_seconds INTEGER NOT NULL DEFAULT 0,
          last_viewed_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          UNIQUE (enrollment_id, lesson_node_id)
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS lesson_progress_lesson_idx
          ON lesson_progress (enrollment_id, lesson_node_id, status)
        `,
                `
        CREATE TABLE IF NOT EXISTS playback_sessions (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          video_asset_id BIGINT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
          device_type TEXT,
          speed NUMERIC(3,2) NOT NULL DEFAULT 1,
          started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          ended_at TIMESTAMPTZ,
          last_position_seconds INTEGER NOT NULL DEFAULT 0
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS playback_sessions_active_idx
          ON playback_sessions (user_id, video_asset_id, ended_at)
        `,
                `
        CREATE TABLE IF NOT EXISTS study_availability (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
          start_minute INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440),
          end_minute INTEGER NOT NULL CHECK (end_minute > 0 AND end_minute <= 1440),
          preferred_minutes INTEGER NOT NULL DEFAULT 30,
          active BOOLEAN NOT NULL DEFAULT true
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS study_plans (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          goal_completion_date DATE,
          strategy TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          generated_by TEXT NOT NULL DEFAULT 'ai',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS study_plan_items (
          id BIGSERIAL PRIMARY KEY,
          study_plan_id BIGINT NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
          lesson_node_id BIGINT NOT NULL REFERENCES lesson_nodes(id) ON DELETE CASCADE,
          scheduled_start_at TIMESTAMPTZ NOT NULL,
          scheduled_end_at TIMESTAMPTZ NOT NULL,
          planned_minutes INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'not_started',
          ai_notes TEXT
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS study_plan_items_plan_idx
          ON study_plan_items (study_plan_id, scheduled_start_at)
        `,
                `
        CREATE TABLE IF NOT EXISTS knowledge_bases (
          id BIGSERIAL PRIMARY KEY,
          tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'processing',
          visibility TEXT NOT NULL DEFAULT 'course_only',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE TABLE IF NOT EXISTS kb_documents (
          id BIGSERIAL PRIMARY KEY,
          knowledge_base_id BIGINT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
          lesson_node_id BIGINT REFERENCES lesson_nodes(id) ON DELETE SET NULL,
          source_type TEXT NOT NULL,
          title TEXT NOT NULL,
          file_url TEXT,
          extracted_text TEXT,
          status TEXT NOT NULL DEFAULT 'processing',
          checksum TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS kb_documents_kb_idx
          ON kb_documents (knowledge_base_id, status, created_at DESC)
        `,
                `
        CREATE TABLE IF NOT EXISTS kb_chunks (
          id BIGSERIAL PRIMARY KEY,
          document_id BIGINT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
          tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
          lesson_node_id BIGINT REFERENCES lesson_nodes(id) ON DELETE SET NULL,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          token_count INTEGER,
          embedding ${embeddingColumnType},
          metadata_json JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (document_id, chunk_index)
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS kb_chunks_tenant_course_idx
          ON kb_chunks (tenant_id, course_id, lesson_node_id)
        `,
                `
        CREATE TABLE IF NOT EXISTS ai_chat_sessions (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
          lesson_node_id BIGINT REFERENCES lesson_nodes(id) ON DELETE SET NULL,
          mode TEXT NOT NULL DEFAULT 'tutor',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_idx
          ON ai_chat_sessions (user_id, course_id, created_at DESC)
        `,
                `
        CREATE TABLE IF NOT EXISTS ai_chat_messages (
          id BIGSERIAL PRIMARY KEY,
          session_id BIGINT NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          citations_json JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        `,
                `
        CREATE INDEX IF NOT EXISTS ai_chat_messages_session_idx
          ON ai_chat_messages (session_id, created_at ASC)
        `,
            ];
            for (const statement of statements) {
                await this.prisma.$executeRawUnsafe(statement);
            }
            await this.seedDefaults();
            this.logger.log('Course tree bootstrap schema is ready');
        }
        catch (error) {
            this.logger.error('Failed to ensure course tree schema', error);
            throw error;
        }
    }
    async seedDefaults() {
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO tenants (id, name, slug, mode, status, timezone, locale)
      VALUES (1, 'Demo Academy', 'demo-academy', 'saas', 'active', 'Asia/Bangkok', 'th-TH')
      ON CONFLICT (id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO users (id, email, full_name)
      VALUES
        (1, 'instructor@example.com', 'Demo Instructor'),
        (2, 'student@example.com', 'Demo Student'),
        (3, 'student2@example.com', 'Mint Student'),
        (4, 'student3@example.com', 'Beam Student')
      ON CONFLICT (id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
      VALUES
        (1, 1, 'owner', 'active'),
        (1, 2, 'student', 'active'),
        (1, 3, 'student', 'active'),
        (1, 4, 'student', 'active')
      ON CONFLICT (tenant_id, user_id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO licenses (tenant_id, plan_code, status, is_self_hosted)
      VALUES (1, 'starter', 'trial', false)
      ON CONFLICT DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO feature_flags (tenant_id, key, enabled, config_json)
      VALUES
        (1, 'ai_quiz_generation', true, '{}'::jsonb),
        (1, 'study_planner', true, '{}'::jsonb)
      ON CONFLICT (tenant_id, key) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO knowledge_bases (id, tenant_id, course_id, name, status, visibility)
      VALUES (1, 1, NULL, 'Demo Knowledge Base', 'processing', 'tenant_wide')
      ON CONFLICT (id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO courses (id, tenant_id, title, slug, description, subject, level, status, published_at)
      VALUES
        (
          1,
          1,
          'Introduction to React Native',
          'introduction-to-react-native',
          'Learn to build mobile apps with React Native.',
          'programming',
          'beginner',
          'published',
          now()
        ),
        (
          2,
          1,
          'Advanced Backend with Node.js',
          'advanced-backend-with-node-js',
          'Master Express, Prisma, and PostgreSQL.',
          'programming',
          'intermediate',
          'published',
          now()
        )
      ON CONFLICT (id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO lesson_nodes (id, tenant_id, course_id, parent_id, node_type, title, path, depth, sort_order, is_published, estimated_minutes)
      VALUES
        (1, 1, 1, NULL, 'section', 'Getting Started', 'getting_started', 0, 0, true, 10),
        (2, 1, 1, 1, 'lesson', 'Install Expo and set up your environment', 'getting_started.install_expo_and_set_up_your_environment', 1, 0, true, 18),
        (3, 1, 1, NULL, 'section', 'Components and Props', 'components_and_props', 0, 1, true, 12),
        (4, 1, 1, 3, 'lesson', 'Learn about View, Text, and props', 'components_and_props.learn_about_view_text_and_props', 1, 0, true, 22),
        (5, 1, 2, NULL, 'section', 'Express Architecture', 'express_architecture', 0, 0, true, 14),
        (6, 1, 2, 5, 'lesson', 'Structure routes, services, and middleware', 'express_architecture.structure_routes_services_and_middleware', 1, 0, true, 24),
        (7, 1, 2, NULL, 'section', 'Prisma and PostgreSQL', 'prisma_and_postgresql', 0, 1, true, 16),
        (8, 1, 2, 7, 'lesson', 'Model relations and optimize database access', 'prisma_and_postgresql.model_relations_and_optimize_database_access', 1, 0, true, 26)
      ON CONFLICT (id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO lesson_contents (id, lesson_node_id, content_type, html_content, plain_text, version)
      VALUES
        (1, 2, 'article', NULL, 'Install Expo CLI, create your first app, and verify the simulator setup before writing any UI code.', 1),
        (2, 4, 'article', NULL, 'Explore how View, Text, and props compose reusable interfaces in React Native for day-to-day product work.', 1),
        (3, 6, 'article', NULL, 'Break the backend into clear route handlers, shared services, and middleware boundaries so new features land without coupling everything together.', 1),
        (4, 8, 'article', NULL, 'Define Prisma relations carefully, index query-heavy columns, and avoid N+1 access patterns when shaping course and enrollment APIs.', 1)
      ON CONFLICT (id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO lesson_assets (id, lesson_node_id, asset_type, title, file_url, external_url, mime_type, size_bytes, sort_order)
      VALUES
        (1, 2, 'pdf', 'React Native Setup Checklist', '/uploads/course-builder/public/demo-react-native-setup.pdf', NULL, 'application/pdf', 245760, 0),
        (2, 4, 'link', 'React Native docs', NULL, 'https://reactnative.dev/docs/components-and-apis', NULL, NULL, 0),
        (3, 6, 'pdf', 'Node Service Boundaries', '/uploads/course-builder/public/demo-node-service-boundaries.pdf', NULL, 'application/pdf', 198640, 0),
        (4, 8, 'link', 'Prisma relation queries', NULL, 'https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries', NULL, NULL, 0)
      ON CONFLICT (id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO lesson_transcripts (id, lesson_node_id, language, status, full_text, segments_json)
      VALUES
        (
          1,
          2,
          'en',
          'ready',
          'Install Expo and verify your environment. Then run the first project and confirm the simulator loads correctly.',
          '[
            {"seek":"00:12","progress":18,"text":"Install Expo and verify your environment."},
            {"seek":"00:36","progress":43,"text":"Run the first project from the CLI and watch the packager output."},
            {"seek":"01:04","progress":76,"text":"Confirm the simulator loads correctly before moving on."}
          ]'::jsonb
        ),
        (
          2,
          4,
          'en',
          'ready',
          'Use View and Text as the base building blocks, then pass props to keep components reusable and predictable.',
          '[
            {"seek":"00:08","progress":22,"text":"Use View and Text as the base building blocks."},
            {"seek":"00:31","progress":51,"text":"Pass props down to keep components reusable."},
            {"seek":"01:02","progress":84,"text":"Predictable props make screens easier to scale."}
          ]'::jsonb
        ),
        (
          3,
          6,
          'en',
          'ready',
          'Separate HTTP routing from business logic, keep middleware focused on cross-cutting concerns, and make service boundaries explicit.',
          '[
            {"seek":"00:10","progress":21,"text":"Separate routing from business logic early."},
            {"seek":"00:38","progress":57,"text":"Keep middleware focused on auth, logging, and tenant context."},
            {"seek":"01:05","progress":88,"text":"Explicit service boundaries make backend changes safer."}
          ]'::jsonb
        ),
        (
          4,
          8,
          'en',
          'ready',
          'Model the important relations first, then tune indexes and query shape so Prisma stays fast as enrollment and course data grow.',
          '[
            {"seek":"00:14","progress":26,"text":"Model the important relations first."},
            {"seek":"00:42","progress":63,"text":"Tune indexes on the hottest query paths."},
            {"seek":"01:09","progress":91,"text":"Shape Prisma queries to avoid accidental N plus one patterns."}
          ]'::jsonb
        )
      ON CONFLICT (id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO kb_documents (id, knowledge_base_id, lesson_node_id, source_type, title, file_url, extracted_text, status)
      VALUES
        (
          1,
          1,
          2,
          'pdf',
          'React Native Setup Checklist',
          '/uploads/course-builder/public/demo-react-native-setup.pdf',
          'Install Expo CLI, validate Node.js, run the starter app, and verify the simulator workflow before continuing.',
          'ready'
        ),
        (
          2,
          1,
          6,
          'pdf',
          'Node Service Boundaries',
          '/uploads/course-builder/public/demo-node-service-boundaries.pdf',
          'Use route handlers for transport concerns, move policy and orchestration into services, and keep middleware focused on reusable request guards.',
          'ready'
        )
      ON CONFLICT (id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO enrollments (id, tenant_id, course_id, user_id, started_at, status, source, created_at)
      VALUES
        (1, 1, 1, 2, now() - interval '10 days', 'active', 'trial', now() - interval '10 days'),
        (2, 1, 1, 3, now() - interval '38 days', 'active', 'manual', now() - interval '38 days'),
        (3, 1, 2, 4, now() - interval '95 days', 'active', 'payment', now() - interval '95 days')
      ON CONFLICT (tenant_id, course_id, user_id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO lesson_progress (
        id, enrollment_id, lesson_node_id, status, progress_percent, last_position_seconds, last_viewed_at, completed_at
      )
      VALUES
        (1, 1, 2, 'completed', 100, 1080, now() - interval '2 days', now() - interval '2 days'),
        (2, 1, 4, 'in_progress', 68, 960, now() - interval '6 hours', NULL),
        (3, 2, 2, 'in_progress', 48, 620, now() - interval '4 days', NULL),
        (4, 3, 6, 'in_progress', 12, 210, now() - interval '8 days', NULL)
      ON CONFLICT (enrollment_id, lesson_node_id) DO NOTHING
    `);
        await this.prisma.$executeRawUnsafe(`
      INSERT INTO notification_rules (user_id, type, channel, schedule_json, enabled)
      VALUES (2, 'study_reminder', 'in_app', '{}'::jsonb, true)
      ON CONFLICT DO NOTHING
    `);
    }
    async ensureVectorExtension() {
        try {
            await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
            return true;
        }
        catch (error) {
            this.logger.warn('pgvector extension is unavailable, falling back to JSONB embeddings');
            return false;
        }
    }
};
exports.SchemaBootstrapService = SchemaBootstrapService;
exports.SchemaBootstrapService = SchemaBootstrapService = SchemaBootstrapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchemaBootstrapService);
