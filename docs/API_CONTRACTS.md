# API Contracts

เอกสารนี้กำหนด API contract ระหว่าง Web, Mobile และ Backend สำหรับ 3 ส่วนหลัก:

- Course / Lesson Builder
- Personal AI Tutor
- AI Study Planner

รูปแบบทั้งหมดเป็น `JSON over HTTPS`

## Common Conventions

### Headers

- `Authorization: Bearer <token>`
- `X-Tenant-Slug: <tenant-slug>` ในกรณี tenant context ไม่ได้มาจาก subdomain

### Envelope

Success:

```json
{
  "data": {}
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "lessonNodeId is required",
    "details": {}
  }
}
```

### Common IDs

- ทุก id ใน API ใช้ `string` แม้ใน DB เป็น bigint

### Timestamps

- ใช้ ISO-8601 เช่น `2026-06-03T10:30:00.000Z`

## 1. Course / Lesson Builder

### 1.1 Create Course

`POST /api/courses`

Request:

```json
{
  "title": "เคมี ม.ปลาย Intensive",
  "slug": "chemistry-intensive",
  "description": "คอร์สเข้มข้นสำหรับเตรียมสอบ",
  "subject": "chemistry",
  "level": "high-school"
}
```

Response:

```json
{
  "data": {
    "id": "101",
    "title": "เคมี ม.ปลาย Intensive",
    "slug": "chemistry-intensive",
    "status": "draft"
  }
}
```

### 1.2 Knowledge Base CRUD

`GET /api/knowledge-bases`

Response:

```json
{
  "data": {
    "items": [
      {
        "id": "1",
        "tenantId": "1",
        "courseId": null,
        "name": "Demo Knowledge Base",
        "status": "processing",
        "visibility": "tenant_wide",
        "createdAt": "2026-06-03T10:00:00.000Z"
      }
    ]
  }
}
```

`POST /api/knowledge-bases`

Request:

```json
{
  "name": "Chemistry KB",
  "courseId": "101",
  "visibility": "course_only"
}
```

Response:

```json
{
  "data": {
    "id": "5001",
    "status": "processing",
    "visibility": "course_only"
  }
}
```

Rules:

- `name` ต้องมีเสมอ
- `courseId` เป็น optional
- `tenant_wide` ใช้กับหลายคอร์สได้

`GET /api/knowledge-bases/:knowledgeBaseId/documents`

Response:

```json
{
  "data": {
    "items": [
        {
          "id": "9001",
          "lessonNodeId": "1001",
          "sourceType": "pdf",
          "title": "Atomic Structure Notes",
          "fileUrl": "https://cdn.example.com/notes.pdf",
          "extractedText": "เนื้อหาที่ถูกดึงมาจากไฟล์",
          "status": "ready",
          "createdAt": "2026-06-03T10:00:00.000Z"
        }
      ]
    }
  }
```

`POST /api/knowledge-bases/:knowledgeBaseId/documents`

Request:

```json
{
  "sourceType": "pdf",
  "title": "Atomic Structure Notes",
  "fileUrl": "https://cdn.example.com/notes.pdf",
  "extractedText": "เนื้อหาที่ถูกดึงมาจากไฟล์"
}
```

Rules:

- ถ้ามี `extractedText` backend จะ queue ingest ให้อัตโนมัติ
- ถ้าไม่มี `extractedText` status จะเป็น `processing` จนกว่าจะ ingest เพิ่ม

`POST /api/knowledge-bases/:knowledgeBaseId/documents/bulk`

Request:

```json
{
  "documents": [
    {
      "sourceType": "pdf",
      "title": "Atomic Structure Notes",
      "fileUrl": "https://cdn.example.com/notes.pdf",
      "extractedText": "ข้อความที่ดึงจากไฟล์"
    },
    {
      "sourceType": "note",
      "title": "Extra notes",
      "fileUrl": "https://docs.example.com/notes",
      "extractedText": "สรุปย่อ"
    }
  ]
}
```

Response:

```json
{
  "data": {
    "knowledgeBaseId": "1",
    "items": [
      {
        "documentId": "9002",
        "status": "processing",
        "title": "Atomic Structure Notes",
        "sourceType": "pdf",
        "fileUrl": "https://cdn.example.com/notes.pdf"
      }
    ]
  }
}
```

`PATCH /api/knowledge-bases/documents/:documentId`

Request:

```json
{
  "sourceType": "pdf",
  "title": "Atomic Structure Notes (edited)",
  "fileUrl": "https://cdn.example.com/notes-v2.pdf",
  "extractedText": "ข้อความที่อัปเดต"
}
```

Response:

```json
{
  "data": {
    "documentId": "9001",
    "updated": true
  }
}
```

`DELETE /api/knowledge-bases/documents/:documentId`

Response:

```json
{
  "data": {
    "documentId": "9001",
    "deleted": true
  }
}
```

Rules:

- ลบ document แล้ว chunks ที่อ้างถึงจะหายตาม foreign key cascade
- ใช้กับ tenant เดียวกับ session เท่านั้น

### 1.3 Get Course Tree

`GET /api/courses/:courseId/tree`

Response:

```json
{
  "data": {
    "course": {
      "id": "101",
      "title": "เคมี ม.ปลาย Intensive",
      "status": "draft"
    },
    "nodes": [
      {
        "id": "1001",
        "parentId": null,
        "nodeType": "section",
        "title": "อะตอม",
        "path": "chemistry.atomic",
        "depth": 0,
        "sortOrder": 1,
        "estimatedMinutes": 0,
        "isPublished": true,
        "children": [
          {
            "id": "1002",
            "parentId": "1001",
            "nodeType": "lesson",
            "title": "แบบจำลองอะตอม",
            "path": "chemistry.atomic.bohr",
            "depth": 1,
            "sortOrder": 1,
            "estimatedMinutes": 35,
            "isPublished": true,
            "children": []
          }
        ]
      }
    ]
  }
}
```

### 1.4 Create Lesson Node

`POST /api/courses/:courseId/nodes`

Request:

```json
{
  "parentId": "1001",
  "nodeType": "lesson",
  "title": "โครงสร้างอะตอมขั้นสูง",
  "estimatedMinutes": 40
}
```

Response:

```json
{
  "data": {
    "id": "1003",
    "parentId": "1001",
    "nodeType": "lesson",
    "title": "โครงสร้างอะตอมขั้นสูง",
    "path": "chemistry.atomic.advanced_atomic_structure",
    "depth": 1,
    "sortOrder": 2
  }
}
```

### 1.5 Update Lesson Node

`PATCH /api/lesson-nodes/:lessonNodeId`

Request:

```json
{
  "title": "โครงสร้างอะตอมขั้นสูง (อัปเดต)",
  "estimatedMinutes": 45,
  "isPublished": true
}
```

### 1.6 Reorder / Drag & Drop Tree

`PATCH /api/courses/:courseId/tree/reorder`

Request:

```json
{
  "moves": [
    {
      "nodeId": "1003",
      "newParentId": "1001",
      "newSortOrder": 1
    },
    {
      "nodeId": "1002",
      "newParentId": "1001",
      "newSortOrder": 2
    }
  ]
}
```

Response:

```json
{
  "data": {
    "updated": 2
  }
}
```

Rules:

- backend ต้อง recalculate `path`, `depth`, `sortOrder`
- reject ถ้า move ทำให้เกิด cycle
- run in transaction

### 1.7 Upsert Lesson Content

`PUT /api/lesson-nodes/:lessonNodeId/content`

Request:

```json
{
  "contentType": "mixed",
  "htmlContent": "<p>บทเรียนเรื่องโครงสร้างอะตอม</p>",
  "plainText": "บทเรียนเรื่องโครงสร้างอะตอม"
}
```

### 1.8 Upsert Lesson Transcript

`PUT /api/lesson-nodes/:lessonNodeId/transcript`

Request:

```json
{
  "language": "th",
  "status": "ready",
  "fullText": "บทนำและคำอธิบายบทเรียน",
  "segments": [
    { "seek": "00:00", "progress": 20, "text": "บทนำ" },
    { "seek": "00:15", "progress": 60, "text": "คำอธิบายหลัก" },
    { "seek": "00:45", "progress": 100, "text": "สรุปท้ายบท" }
  ]
}
```

Rules:

- `segments` คือแหล่งข้อมูลที่ student preview และ click-to-seek ใช้โดยตรง
- ถ้า `segments` ว่าง backend ต้องล้าง transcript ของ lesson นั้น
- `fullText` เป็นข้อความรวมสำหรับ AI retrieval / search

### 1.9 Attach Asset

`POST /api/lesson-nodes/:lessonNodeId/assets`

Request for PDF:

```json
{
  "assetType": "pdf",
  "title": "สรุปสูตรเคมี",
  "fileUrl": "https://cdn.example.com/files/chemistry-summary.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1048576
}
```

Request for external link:

```json
{
  "assetType": "link",
  "title": "ตารางธาตุออนไลน์",
  "externalUrl": "https://example.com/periodic-table"
}
```

### 1.10 Create Video Upload URL

`POST /api/lesson-nodes/:lessonNodeId/videos/upload-url`

Request:

```json
{
  "fileName": "lesson-1.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 734003200
}
```

Response:

```json
{
  "data": {
    "videoAssetId": "5001",
    "uploadUrl": "https://upload-provider.example.com/signed-url",
    "expiresAt": "2026-06-03T11:00:00.000Z"
  }
}
```

### 1.9 Publish Course

`POST /api/courses/:courseId/publish`

Response:

```json
{
  "data": {
    "id": "101",
    "status": "published",
    "publishedAt": "2026-06-03T10:00:00.000Z"
  }
}
```

## 2. Personal AI Tutor

### 2.1 Upload Knowledge Base Document

`POST /api/knowledge-bases/:knowledgeBaseId/documents`

Request:

```json
{
  "lessonNodeId": "1002",
  "sourceType": "pdf",
  "title": "Atomic Structure Notes",
  "fileUrl": "https://cdn.example.com/notes/atomic-structure.pdf"
}
```

Response:

```json
{
  "data": {
    "documentId": "7001",
    "status": "processing"
  }
}
```

### 2.2 Ask AI Tutor

`POST /api/ai/tutor/query`

Request:

```json
{
  "courseId": "101",
  "lessonNodeId": "1002",
  "sessionId": "9001",
  "question": "อธิบายความแตกต่างระหว่างแบบจำลองของดอลตันและโบร์"
}
```

Response:

```json
{
  "data": {
    "sessionId": "9001",
    "messageId": "9102",
    "answer": "จากเอกสารบทนี้ แบบจำลองของดอลตันมองว่าอะตอมเป็นทรงกลมตัน ...",
    "citations": [
      {
        "documentId": "7001",
        "chunkId": "8003",
        "title": "Atomic Structure Notes",
        "excerpt": "Bohr proposed electrons move in fixed energy levels..."
      }
    ],
    "usage": {
      "promptTokens": 1320,
      "completionTokens": 220
    }
  }
}
```

Rules:

- retrieve ต้อง filter อย่างน้อย `tenantId`
- ปกติควร filter `courseId`
- ถ้าอยู่ในหน้า lesson ให้ filter `lessonNodeId` ก่อน แล้ว fallback ระดับ course ได้
- ถ้าไม่มี context พอ ให้ตอบว่าไม่พบข้อมูลในฐานความรู้

### 2.3 Generate Lesson Summary

`POST /api/ai/tutor/summary`

Request:

```json
{
  "courseId": "101",
  "lessonNodeId": "1002",
  "format": "bullet"
}
```

Response:

```json
{
  "data": {
    "summary": [
      "อะตอมประกอบด้วยนิวเคลียสและอิเล็กตรอน",
      "แบบจำลองของโบร์อธิบายระดับพลังงานเป็นชั้น"
    ],
    "citations": [
      {
        "documentId": "7001",
        "chunkId": "8001"
      }
    ]
  }
}
```

### 2.4 Generate Additional Exercises

`POST /api/ai/tutor/exercises`

Request:

```json
{
  "courseId": "101",
  "lessonNodeId": "1002",
  "difficulty": "medium",
  "count": 5,
  "type": "multiple_choice"
}
```

Response:

```json
{
  "data": {
    "items": [
      {
        "question": "ข้อใดอธิบายแบบจำลองของโบร์ได้ถูกต้องที่สุด",
        "choices": [
          "อิเล็กตรอนเคลื่อนที่อย่างอิสระไร้ระดับพลังงาน",
          "อิเล็กตรอนอยู่ในระดับพลังงานที่กำหนดได้",
          "อะตอมไม่มีนิวเคลียส",
          "โปรตอนโคจรรอบอิเล็กตรอน"
        ],
        "answer": 1,
        "explanation": "อ้างอิงจากเอกสารที่ระบุว่าระดับพลังงานมีลักษณะจำเพาะ"
      }
    ],
    "citations": [
      {
        "documentId": "7001",
        "chunkId": "8005"
      }
    ]
  }
}
```

### 2.5 Get AI Chat Session

`GET /api/ai/sessions/:sessionId`

Response:

```json
{
  "data": {
    "id": "9001",
    "mode": "tutor",
    "messages": [
      {
        "id": "9101",
        "role": "user",
        "content": "สรุปบทนี้ให้หน่อย",
        "createdAt": "2026-06-03T10:00:00.000Z"
      },
      {
        "id": "9102",
        "role": "assistant",
        "content": "บทนี้กล่าวถึง...",
        "citations": [],
        "createdAt": "2026-06-03T10:00:02.000Z"
      }
    ]
  }
}
```

## 3. AI Study Planner

### 3.1 Upsert Weekly Availability

`PUT /api/planner/availability`

Request:

```json
{
  "timezone": "Asia/Bangkok",
  "slots": [
    {
      "weekday": 1,
      "startMinute": 1140,
      "endMinute": 1260,
      "preferredMinutes": 90
    },
    {
      "weekday": 3,
      "startMinute": 1140,
      "endMinute": 1260,
      "preferredMinutes": 60
    }
  ]
}
```

Note:

- `weekday`: 0 = Sunday, 6 = Saturday
- `startMinute`: minutes from 00:00

### 3.2 Generate Study Plan

`POST /api/planner/generate`

Request:

```json
{
  "courseId": "101",
  "goalCompletionDate": "2026-07-31",
  "strategy": "balanced"
}
```

Response:

```json
{
  "data": {
    "studyPlanId": "9501",
    "status": "active",
    "goalCompletionDate": "2026-07-31",
    "summary": {
      "totalLessons": 24,
      "totalPlannedMinutes": 1080,
      "sessionsPerWeek": 3
    },
    "explanation": "ระบบจัดบทที่มีพื้นฐานสำคัญไว้ช่วงต้น และเว้นช่วงทบทวนทุกสัปดาห์",
    "items": [
      {
        "lessonNodeId": "1002",
        "lessonTitle": "แบบจำลองอะตอม",
        "scheduledStartAt": "2026-06-05T12:00:00.000Z",
        "scheduledEndAt": "2026-06-05T13:00:00.000Z",
        "plannedMinutes": 60,
        "status": "not_started"
      }
    ]
  }
}
```

### 3.3 Get Current Study Plan

`GET /api/planner/current?courseId=101`

Response:

```json
{
  "data": {
    "studyPlanId": "9501",
    "goalCompletionDate": "2026-07-31",
    "items": [
      {
        "id": "9601",
        "lessonNodeId": "1002",
        "lessonTitle": "แบบจำลองอะตอม",
        "scheduledStartAt": "2026-06-05T12:00:00.000Z",
        "scheduledEndAt": "2026-06-05T13:00:00.000Z",
        "plannedMinutes": 60,
        "status": "not_started"
      }
    ]
  }
}
```

### 3.4 Replan

`POST /api/planner/replan`

Request:

```json
{
  "courseId": "101",
  "reason": "missed_sessions",
  "goalCompletionDate": "2026-08-10"
}
```

Response:

```json
{
  "data": {
    "studyPlanId": "9502",
    "replacedStudyPlanId": "9501",
    "status": "active",
    "explanation": "มีการขยับแผนออกไป 10 วันเพื่อรักษาภาระเรียนต่อวันให้อยู่ในระดับเหมาะสม"
  }
}
```

### 3.5 Student Progress Snapshot for Admin

`GET /api/admin/students/:studentId/planner?courseId=101`

Response:

```json
{
  "data": {
    "student": {
      "id": "501",
      "fullName": "Student A"
    },
    "plan": {
      "studyPlanId": "9501",
      "goalCompletionDate": "2026-07-31",
      "completionPercent": 35.4,
      "items": []
    }
  }
}
```

## DTO Suggestions

### Lesson Tree DTO

```ts
type LessonNodeDto = {
  id: string;
  parentId: string | null;
  nodeType: 'section' | 'lesson' | 'quiz' | 'assignment';
  title: string;
  path: string;
  depth: number;
  sortOrder: number;
  estimatedMinutes: number;
  isPublished: boolean;
  children: LessonNodeDto[];
};
```

### Tutor Citation DTO

```ts
type CitationDto = {
  documentId: string;
  chunkId: string;
  title?: string;
  excerpt?: string;
};
```

### Study Plan Item DTO

```ts
type StudyPlanItemDto = {
  id?: string;
  lessonNodeId: string;
  lessonTitle?: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  plannedMinutes: number;
  status: 'not_started' | 'in_progress' | 'completed';
  aiNotes?: string | null;
};
```

## Validation Rules

### Course Builder

- title required
- slug unique in tenant
- estimatedMinutes >= 0
- reorder moves must stay in same course

### AI Tutor

- question length limit
- rate limit per user and tenant
- enforce retrieval before generation
- save citations on every assistant message

### Planner

- availability slots must not overlap
- goal date must be after current date
- plan generation fails with actionable message if total available time is insufficient
