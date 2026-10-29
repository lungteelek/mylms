import { createLessonNode } from './course-builder-utils.js';

export function createDemoCourseBuilderState() {
  const lesson1 = createLessonNode({ title: '1.1 โครงสร้างอะตอม', depth: 1 });
  const lesson11 = createLessonNode({ title: '1.1.1 โปรตอน นิวตรอน อิเล็กตรอน', depth: 2 });
  const lesson111 = createLessonNode({ title: '1.1.1.1 พื้นฐานออร์บิทัล', depth: 3 });
  const lesson1111 = createLessonNode({
    title: '1.1.1.1 แบบฝึกการจัดเรียงอิเล็กตรอน',
    depth: 4,
  });

  lesson1111.asset = {
    type: 'url',
    url: 'https://example.com/practice/electron-configuration',
    fileName: '',
  };
  lesson111.children.push(lesson1111);
  lesson11.children.push(lesson111);
  lesson1.children.push(lesson11);
  lesson1.asset = {
    type: 'pdf',
    fileName: 'atomic-structure-cheatsheet.pdf',
    url: '',
  };

  const lesson2 = createLessonNode({ title: '1.2 แนวโน้มตารางธาตุ', depth: 1 });
  const lesson21 = createLessonNode({ title: '1.2.1 รัศมีอะตอมและพลังงานไอออไนเซชัน', depth: 2 });
  lesson21.asset = {
    type: 'pdf',
    fileName: 'periodic-trends.pdf',
    url: '',
  };
  lesson2.children.push(lesson21);

  return {
    courseTitle: 'พื้นฐานเคมี',
    courseStatus: 'ฉบับร่างที่พร้อมใช้งาน',
    nodes: [lesson1, lesson2],
  };
}

export function createBlankCourseBuilderState() {
  return {
    courseTitle: 'คอร์สใหม่',
    courseStatus: 'ฉบับร่างเปล่า',
    nodes: [],
  };
}
