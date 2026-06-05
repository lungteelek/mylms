import { RetrievedChunk } from '../knowledge-base/types/knowledge-base.types';

function clip(text: string, limit = 220) {
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

export function buildTutorAnswer(question: string, chunks: RetrievedChunk[]) {
  if (chunks.length === 0) {
    return {
      answer: 'ไม่พบข้อมูลในฐานความรู้ที่เกี่ยวข้องกับคำถามนี้',
      citations: [],
    };
  }

  const answer = [
    `คำถาม: ${question}`,
    'สรุปจากฐานความรู้:',
    ...chunks.slice(0, 3).map((chunk, index) => `${index + 1}. ${clip(chunk.content)}`),
  ].join('\n');

  return {
    answer,
    citations: chunks.map((chunk) => ({
      documentId: chunk.documentId,
      chunkId: chunk.chunkId,
      title: chunk.title,
      excerpt: clip(chunk.content, 140),
    })),
  };
}

export function buildSummary(chunks: RetrievedChunk[]) {
  if (chunks.length === 0) {
    return {
      summary: ['ไม่พบข้อมูลในฐานความรู้สำหรับสรุปบทนี้'],
      citations: [],
    };
  }

  const summary = chunks.slice(0, 4).map((chunk) => clip(chunk.content, 160));
  const citations = chunks.map((chunk) => ({
    documentId: chunk.documentId,
    chunkId: chunk.chunkId,
    title: chunk.title,
    excerpt: clip(chunk.content, 120),
  }));

  return { summary, citations };
}

export function buildExercises(chunks: RetrievedChunk[], difficulty: string, count: number) {
  const source = chunks[0]?.content || 'ไม่มีข้อมูลเพียงพอในฐานความรู้';
  return Array.from({ length: count }).map((_, index) => ({
    question: `ข้อ ${index + 1}: จากเนื้อหาที่อ้างอิง จงอธิบายประเด็นสำคัญระดับ ${difficulty}`,
    choices: [
      clip(source, 60),
      'ตัวเลือกสมมุติ B',
      'ตัวเลือกสมมุติ C',
      'ตัวเลือกสมมุติ D',
    ],
    answer: 0,
    explanation: 'สร้างจากเนื้อหาในฐานความรู้ที่ค้นพบล่าสุด',
  }));
}
