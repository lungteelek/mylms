import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { PlatformRole, TenantRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { requireTenantBySlug } from '../lib/tenant';
import { authenticate, AuthRequest } from '../middleware/auth';
import { parseId } from '../utils/parseId';
import { slugify } from '../utils/slugify';

const router = Router();

async function ensureStudentIdentity(params: {
  email: string;
  password: string;
  name?: string;
}) {
  const email = String(params.email || '').trim().toLowerCase();
  const password = String(params.password || '').trim();
  const name = String(params.name || '').trim();

  if (!email) {
    throw new Error('กรอกอีเมลก่อน');
  }
  if (!password) {
    throw new Error('กรอกรหัสผ่านก่อน');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: await bcrypt.hash(password, 10),
        platformRole: PlatformRole.USER,
      },
    });
}

router.get('/public/tenant/:tenantSlug/courses', async (req: AuthRequest, res: Response) => {
  try {
    const tenantSlug = String(req.params.tenantSlug || '').trim();
    if (!tenantSlug) {
      return res.status(400).json({ error: 'กรอกชื่อย่อใน URL ก่อน' });
    }

    const tenant = await requireTenantBySlug(prisma, tenantSlug);
    const courses = await prisma.course.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        enrollments: {
          select: { id: true },
        },
      },
    });

    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        enrollmentCount: course.enrollments.length,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/public/tenant/:tenantSlug/courses/:courseId', async (req: AuthRequest, res: Response) => {
  try {
    const tenantSlug = String(req.params.tenantSlug || '').trim();
    const courseId = parseId(req.params.courseId);
    if (!tenantSlug) {
      return res.status(400).json({ error: 'กรอกชื่อย่อใน URL ก่อน' });
    }

    const tenant = await requireTenantBySlug(prisma, tenantSlug);
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: tenant.id,
      },
      include: {
        instructor: { select: { name: true } },
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        instructorName: course.instructor.name,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/public/enroll', async (req: AuthRequest, res: Response) => {
  try {
    const {
      tenantSlug,
      courseId,
      courseSlug,
      course: courseHint,
      email,
      password,
      name,
    } = req.body as {
      tenantSlug?: string;
      courseId?: string | number;
      courseSlug?: string;
      course?: string;
      email?: string;
      password?: string;
      name?: string;
    };

    const cleanTenantSlug = String(tenantSlug || '').trim();
    const parsedCourseId = parseId(String(courseId || ''));
    const requestedCourseSlug = String(courseSlug || courseHint || '').trim().toLowerCase();
    if (!cleanTenantSlug) {
      return res.status(400).json({ error: 'กรอกชื่อย่อใน URL ก่อน' });
    }
    if (!parsedCourseId && !requestedCourseSlug) {
      return res.status(400).json({ error: 'เลือกคอร์สก่อน' });
    }

    const tenant = await requireTenantBySlug(prisma, cleanTenantSlug);
    const matchedCourse = await prisma.course.findFirst({
      where: {
        tenantId: tenant.id,
        ...(parsedCourseId ? { id: parsedCourseId } : {}),
      },
    }) || (requestedCourseSlug
      ? await prisma.course.findFirst({
          where: {
            tenantId: tenant.id,
            title: {
              contains: requestedCourseSlug.replace(/-/g, ' '),
              mode: 'insensitive',
            },
          },
        })
      : null);
    if (!matchedCourse) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    const user = await ensureStudentIdentity({
      email: String(email || ''),
      password: String(password || ''),
      name,
    });

    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.tenantMembership.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: tenant.id,
          },
        },
      });

      if (!membership) {
        await tx.tenantMembership.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            role: TenantRole.STUDENT,
            isDefault: true,
          },
        });
      }

      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          tenantId_userId_courseId: {
            tenantId: tenant.id,
            userId: user.id,
            courseId: matchedCourse.id,
          },
        },
      });

      if (existingEnrollment) {
        return {
          enrollment: existingEnrollment,
          created: false,
        };
      }

      const enrollment = await tx.enrollment.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
            courseId: matchedCourse.id,
        },
      });

      return {
        enrollment,
        created: true,
      };
    });

    res.status(result.created ? 201 : 200).json({
      message: result.created ? 'สมัครเรียนสำเร็จ' : 'ผู้เรียนอยู่ในคอร์สนี้แล้ว',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      course: {
        id: matchedCourse.id,
        title: matchedCourse.title,
      },
      enrollment: result.enrollment,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enroll in a course
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body;
    const userId = req.user?.userId;
    const parsedCourseId = parseId(courseId);

    if (!userId) {
      return res.status(401).json({ error: 'ผู้ใช้ยังไม่ได้ยืนยันตัวตน' });
    }

    // Check if course exists
    const course = await prisma.course.findFirst({
      where: {
        id: parsedCourseId,
        tenantId: req.user!.tenantId,
      },
    });
    if (!course) {
      return res.status(404).json({ error: 'ไม่พบคอร์ส' });
    }

    // ตรวจว่าลงทะเบียนไว้แล้วหรือไม่
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        tenantId_userId_courseId: {
          tenantId: req.user!.tenantId,
          userId,
          courseId: parsedCourseId,
        }
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({ error: 'ลงทะเบียนคอร์สนี้ไว้แล้ว' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: req.user!.tenantId,
        userId,
        courseId: parsedCourseId,
      }
    });

    res.status(201).json(enrollment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's enrollments
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'ผู้ใช้ยังไม่ได้ยืนยันตัวตน' });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        tenantId: req.user!.tenantId,
      },
      include: {
        course: {
          include: {
            instructor: { select: { name: true } }
          }
        }
      }
    });

    res.json(enrollments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check enrollment status for a specific course
router.get('/status/:courseId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;
    const parsedCourseId = parseId(courseId);

    if (!userId) {
      return res.status(401).json({ error: 'ผู้ใช้ยังไม่ได้ยืนยันตัวตน' });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        tenantId_userId_courseId: {
          tenantId: req.user!.tenantId,
          userId,
          courseId: parsedCourseId,
        }
      }
    });

    res.json({ enrolled: !!enrollment, enrollment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
