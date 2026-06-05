export type AvailabilitySlot = {
  id?: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  preferredMinutes: number;
};

export type LessonPlanCandidate = {
  lessonNodeId: string;
  lessonTitle: string;
  estimatedMinutes: number;
  progressPercent: number;
  status: 'not_started' | 'in_progress' | 'completed';
};

export type GeneratedPlanItem = {
  lessonNodeId: string;
  lessonTitle: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  plannedMinutes: number;
  status: 'not_started' | 'in_progress' | 'completed';
  aiNotes?: string | null;
};
