import 'dotenv/config';
import { PlatformRole, TenantRole, LicenseStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../src/lib/prisma';

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG || 'coursechic';
  const now = new Date();

  const tenant = await prisma.organization.upsert({
    where: { slug: tenantSlug },
    update: {
      name: 'Tutor Tan',
    },
    create: {
      name: 'Tutor Tan',
      slug: tenantSlug,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@example.com' },
    update: {
      platformRole: PlatformRole.ADMIN,
    },
    create: {
      email: 'instructor@example.com',
      name: 'Dr. Smith',
      password: hashedPassword,
      platformRole: PlatformRole.ADMIN,
    },
  });

  const demoAdmin = await prisma.user.upsert({
    where: { email: 'lungteelek@gmail.com' },
    update: {
      platformRole: PlatformRole.USER,
      name: 'Lungteelek Demo',
    },
    create: {
      email: 'lungteelek@gmail.com',
      name: 'Lungteelek Demo',
      password: hashedPassword,
      platformRole: PlatformRole.USER,
    },
  });

  const platformOwner = await prisma.user.upsert({
    where: { email: 'coursechic@gmail.com' },
    update: {
      platformRole: PlatformRole.ADMIN,
      name: 'CourseChic Owner',
    },
    create: {
      email: 'coursechic@gmail.com',
      name: 'CourseChic Owner',
      password: hashedPassword,
      platformRole: PlatformRole.ADMIN,
    },
  });

  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: instructor.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: TenantRole.OWNER,
      isDefault: true,
    },
    create: {
      userId: instructor.id,
      tenantId: tenant.id,
      role: TenantRole.OWNER,
      isDefault: true,
    },
  });

  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: demoAdmin.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: TenantRole.OWNER,
      isDefault: false,
    },
    create: {
      userId: demoAdmin.id,
      tenantId: tenant.id,
      role: TenantRole.OWNER,
      isDefault: false,
    },
  });

  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: platformOwner.id,
        tenantId: tenant.id,
      },
    },
    update: {
      role: TenantRole.OWNER,
      isDefault: true,
    },
    create: {
      userId: platformOwner.id,
      tenantId: tenant.id,
      role: TenantRole.OWNER,
      isDefault: true,
    },
  });

  await prisma.license.upsert({
    where: { tenantId: tenant.id },
    update: {
      status: LicenseStatus.TRIAL,
      plan: 'starter',
      issuedTo: tenant.name,
    },
    create: {
      tenantId: tenant.id,
      status: LicenseStatus.TRIAL,
      plan: 'starter',
      issuedTo: tenant.name,
    },
  });

  await prisma.featureFlag.upsert({
    where: {
      tenantId_key: {
        tenantId: tenant.id,
        key: 'ai_quiz_generation',
      },
    },
    update: { enabled: true },
    create: {
      tenantId: tenant.id,
      key: 'ai_quiz_generation',
      enabled: true,
    },
  });

  await prisma.featureFlag.upsert({
    where: {
      tenantId_key: {
        tenantId: tenant.id,
        key: 'self_service_signup',
      },
    },
    update: { enabled: true },
    create: {
      tenantId: tenant.id,
      key: 'self_service_signup',
      enabled: true,
    },
  });

  await prisma.course.create({
    data: {
      tenantId: tenant.id,
      title: 'Introduction to React Native',
      description: 'Learn to build mobile apps with React Native.',
      instructorId: instructor.id,
      modules: {
        create: [
          { tenantId: tenant.id, title: 'Getting Started', content: 'Install Expo and set up your environment.', order: 1 },
          { tenantId: tenant.id, title: 'Components and Props', content: 'Learn about View, Text, and props.', order: 2 },
        ]
      }
    }
  });

  const backendCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      title: 'Advanced Backend with Node.js',
      description: 'Master Express, Prisma, and SQLite.',
      instructorId: instructor.id,
    }
  });

  const reactCourse = await prisma.course.findFirst({
    where: {
      tenantId: tenant.id,
      title: 'Introduction to React Native',
    },
  });

  const studentA = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {
      platformRole: PlatformRole.USER,
    },
    create: {
      email: 'student@example.com',
      name: 'Ploy Student',
      password: hashedPassword,
      platformRole: PlatformRole.USER,
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  const studentB = await prisma.user.upsert({
    where: { email: 'student2@example.com' },
    update: {
      platformRole: PlatformRole.USER,
    },
    create: {
      email: 'student2@example.com',
      name: 'Mint Student',
      password: hashedPassword,
      platformRole: PlatformRole.USER,
      createdAt: new Date(now.getTime() - 38 * 24 * 60 * 60 * 1000),
    },
  });

  const studentC = await prisma.user.upsert({
    where: { email: 'student3@example.com' },
    update: {
      platformRole: PlatformRole.USER,
    },
    create: {
      email: 'student3@example.com',
      name: 'Beam Student',
      password: hashedPassword,
      platformRole: PlatformRole.USER,
      createdAt: new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000),
    },
  });

  const students = [studentA, studentB, studentC];
  for (const student of students) {
    await prisma.tenantMembership.upsert({
      where: {
        userId_tenantId: {
          userId: student.id,
          tenantId: tenant.id,
        },
      },
      update: {
        role: TenantRole.STUDENT,
        isDefault: student.email === 'student@example.com',
      },
      create: {
        userId: student.id,
        tenantId: tenant.id,
        role: TenantRole.STUDENT,
        isDefault: student.email === 'student@example.com',
      },
    });
  }

  if (reactCourse) {
    await prisma.enrollment.upsert({
      where: {
        tenantId_userId_courseId: {
          tenantId: tenant.id,
          userId: studentA.id,
          courseId: reactCourse.id,
        },
      },
      update: {
        progress: 84,
      },
      create: {
        tenantId: tenant.id,
        userId: studentA.id,
        courseId: reactCourse.id,
        progress: 84,
      },
    });

    await prisma.enrollment.upsert({
      where: {
        tenantId_userId_courseId: {
          tenantId: tenant.id,
          userId: studentB.id,
          courseId: reactCourse.id,
        },
      },
      update: {
        progress: 48,
      },
      create: {
        tenantId: tenant.id,
        userId: studentB.id,
        courseId: reactCourse.id,
        progress: 48,
      },
    });

    await prisma.enrollment.upsert({
      where: {
        tenantId_userId_courseId: {
          tenantId: tenant.id,
          userId: studentC.id,
          courseId: backendCourse.id,
        },
      },
      update: {
        progress: 12,
      },
      create: {
        tenantId: tenant.id,
        userId: studentC.id,
        courseId: backendCourse.id,
        progress: 12,
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
