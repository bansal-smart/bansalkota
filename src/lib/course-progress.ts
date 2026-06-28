import type { CourseSubject, CourseTopic } from "@/types/course-content";

export function calcProgress(completed: number, total: number) {
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    label: `${completed}/${total}`,
  };
}

export function rollupCourseProgress(subjects: CourseSubject[]) {
  let totalVideos = 0;
  let completedVideos = 0;
  for (const subject of subjects) {
    for (const topic of subject.topics ?? []) {
      for (const video of topic.videos ?? []) {
        totalVideos++;
        if (video.progress?.is_completed) completedVideos++;
      }
    }
  }
  return calcProgress(completedVideos, totalVideos);
}

export function rollupSubject(subject: CourseSubject) {
  let total = 0, done = 0;
  for (const topic of subject.topics ?? []) {
    for (const v of topic.videos ?? []) {
      total++;
      if (v.progress?.is_completed) done++;
    }
  }
  return { total, done };
}

export function rollupTopic(topic: CourseTopic) {
  let total = 0, done = 0;
  for (const v of topic.videos ?? []) {
    total++;
    if (v.progress?.is_completed) done++;
  }
  return { total, done };
}
