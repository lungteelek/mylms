import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { getTenantFeatureMap } from '../lib/tenant';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateQuizFromContent } from '../services/quizGenerator';
import { parseId } from '../utils/parseId';

const router = Router();

// Generate a quiz for a module
router.post('/generate/:moduleId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const parsedModuleId = parseId(moduleId);
    const module = await prisma.module.findFirst({ 
      where: {
        id: parsedModuleId,
        tenantId: req.user!.tenantId,
      },
      include: { course: true }
    });

    if (!module) return res.status(404).json({ error: 'ไม่พบโมดูล' });
    const features = await getTenantFeatureMap(prisma, req.user!.tenantId);
    if (!features.ai_quiz_generation) {
      return res.status(403).json({ error: 'บัญชีองค์กรนี้ปิดการสร้าง quiz ด้วย AI' });
    }
    
    if (module.course.instructorId !== req.user?.userId && req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'เฉพาะ instructor เท่านั้นที่สร้าง quiz ได้' });
    }

    const quizData = await generateQuizFromContent(module.title, module.content || '');

    const quiz = await prisma.quiz.create({
      data: {
        tenantId: req.user!.tenantId,
        title: quizData.title,
        moduleId: parsedModuleId,
        questions: {
          create: quizData.questions.map((q: any) => ({
            tenantId: req.user!.tenantId,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
          }))
        }
      },
      include: { questions: true }
    });

    res.status(201).json(quiz);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get quiz details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const quizId = parseId(id);
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        tenantId: req.user!.tenantId,
      },
      include: { questions: true }
    });

    if (!quiz) return res.status(404).json({ error: 'ไม่พบ quiz' });

    res.json(quiz);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit quiz attempt
router.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Array of selected indices
    const userId = req.user?.userId;
    const quizId = parseId(id);

    if (!userId) return res.status(401).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        tenantId: req.user!.tenantId,
      },
      include: { questions: true }
    });

    if (!quiz) return res.status(404).json({ error: 'ไม่พบ quiz' });

    let score = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        score++;
      }
    });

    const attempt = await prisma.quizAttempt.create({
      data: {
        tenantId: req.user!.tenantId,
        userId,
        quizId,
        score,
        total: quiz.questions.length,
      }
    });

    res.json({ attempt, correctAnswers: quiz.questions.map(q => q.correctAnswer) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
