import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { parseId } from '../utils/parseId';

const router = Router();

// สร้าง session จ่ายเงินจำลองสำหรับทดสอบ flow
router.post('/create-session', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body;
    const parsedCourseId = parseId(courseId);
    
    // ระบบจริงจะคำนวณราคาและสร้าง Stripe Checkout session
    const course = await prisma.course.findFirst({
      where: {
        id: parsedCourseId,
        tenantId: req.user!.tenantId,
      },
    });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบบทเรียน' });
    }

    // session จำลอง
    const sessionId = `payment_session_${Date.now()}`;
    
    res.json({ 
      sessionId, 
      courseTitle: course.title,
      amount: 49.99, // ราคาจำลองคงที่
      currency: 'usd'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ยืนยันการจ่ายและลงทะเบียนผู้เรียน
router.post('/confirm', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, sessionId } = req.body;
    const userId = req.user?.userId;
    const parsedCourseId = parseId(courseId);

    if (!userId) return res.status(401).json({ error: 'ไม่ได้รับอนุญาต' });

    // ตรวจ sessionId แบบจำลอง
    if (!sessionId.startsWith('payment_session_')) {
      return res.status(400).json({ error: 'session ID ไม่ถูกต้อง' });
    }

    // ตรวจว่าลงทะเบียนไว้แล้วหรือไม่
    const existing = await prisma.enrollment.findUnique({
      where: {
        tenantId_userId_courseId: {
          tenantId: req.user!.tenantId,
          userId,
          courseId: parsedCourseId,
        },
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'ลงทะเบียนไว้แล้ว' });
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: req.user!.tenantId,
        userId,
        courseId: parsedCourseId,
      }
    });

    res.status(201).json({ message: 'ยืนยันการจ่ายเงินและลงทะเบียนสำเร็จ', enrollment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
