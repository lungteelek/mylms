import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { getTenantFeatureMap, isInstructorRole, requireTenantBySlug } from '../lib/tenant';
import { authenticate, AuthRequest, resolveTenantSlug } from '../middleware/auth';
import { generateCourseSummary } from '../services/gemini';
import { parseId } from '../utils/parseId';

const router = Router();

// Get all courses
router.get('/', resolveTenantSlug, async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await requireTenantBySlug(prisma, req.tenantSlug!);
    const courses = await prisma.course.findMany({
      where: { tenantId: tenant.id },
      include: {
        instructor: {
          select: { name: true, email: true }
        }
      }
    });
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses for logged-in instructor
router.get('/instructor', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const courses = await prisma.course.findMany({
      where: {
        instructorId: req.user.userId,
        tenantId: req.user.tenantId,
      },
      include: {
        _count: {
          select: { enrollments: true }
        }
      }
    });
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a course (Instructor only)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isInstructorRole(req.user?.role)) {
      return res.status(403).json({ error: 'เฉพาะ instructor เท่านั้นที่สร้างคอร์สได้' });
    }

    const { title, description } = req.body;
    const features = await getTenantFeatureMap(prisma, req.user!.tenantId);

    let finalDescription = description;
    if (features.ai_quiz_generation) {
      try {
        const aiSummary = await generateCourseSummary(title, description || '');
        finalDescription = `${description}\n\n--- AI Generated Summary ---\n${aiSummary}`;
      } catch (aiError) {
        console.error('Gemini AI error:', aiError);
      }
    }

    const course = await prisma.course.create({
      data: {
        tenantId: req.user!.tenantId,
        title,
        description: finalDescription,
        instructorId: req.user.userId,
      }
    });

    res.status(201).json(course);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add module to a course
router.post('/:id/modules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, videoUrl } = req.body;
    const courseId = parseId(id);
    
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: req.user!.tenantId,
      },
    });
    if (!course) return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    
    if (course.instructorId !== req.user?.userId && req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ดำเนินการนี้' });
    }

    const moduleCount = await prisma.module.count({
      where: {
        courseId,
        tenantId: req.user!.tenantId,
      },
    });

    const module = await prisma.module.create({
      data: {
        tenantId: req.user!.tenantId,
        title,
        content,
        videoUrl,
        courseId,
        order: moduleCount + 1,
      }
    });

    res.status(201).json(module);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single course details with modules
router.get('/:id', resolveTenantSlug, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const courseId = parseId(id);
    const tenant = await requireTenantBySlug(prisma, req.tenantSlug!);
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: tenant.id,
      },
      include: {
        instructor: { select: { name: true, email: true } },
        modules: { orderBy: { order: 'asc' } }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    res.json(course);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
