import { supabase } from "@/integrations/supabase/client";
import type { CourseSubject, CourseTopic, CourseSubtopic, SubtopicVideo, SubtopicPdf, SubtopicQuiz } from "@/types/course-content";

export async function fetchCourseContentTree(courseId: string, userId: string | null): Promise<CourseSubject[]> {
  const [subjectsRes, topicsRes, subtopicsRes, videosRes, pdfsRes, quizzesRes] = await Promise.all([
    supabase.from("course_subjects" as any).select("*").eq("course_id", courseId).order("position"),
    supabase.from("course_topics" as any).select("*").eq("course_id", courseId).order("position"),
    supabase.from("course_subtopics" as any).select("*").eq("course_id", courseId).order("position"),
    supabase.from("subtopic_videos" as any).select("*").eq("course_id", courseId).order("position"),
    supabase.from("subtopic_pdfs" as any).select("*").eq("course_id", courseId).order("position"),
    supabase.from("subtopic_quizzes" as any).select("*").eq("course_id", courseId),
  ]);

  const subjects = (subjectsRes.data ?? []) as any[];
  const topics = (topicsRes.data ?? []) as any[];
  const subtopics = (subtopicsRes.data ?? []) as any[];
  const videos = (videosRes.data ?? []) as any[];
  const pdfs = (pdfsRes.data ?? []) as any[];
  const quizzes = (quizzesRes.data ?? []) as any[];

  let progressMap: Record<string, any> = {};
  if (userId) {
    const { data: prog } = await supabase
      .from("subtopic_video_progress" as any)
      .select("*")
      .eq("course_id", courseId)
      .eq("user_id", userId);
    progressMap = Object.fromEntries(((prog ?? []) as any[]).map((p) => [p.video_id, p]));
  }

  const videosBySub = new Map<string, SubtopicVideo[]>();
  for (const v of videos) {
    const arr = videosBySub.get(v.subtopic_id) ?? [];
    arr.push({ ...v, progress: progressMap[v.id] ?? null });
    videosBySub.set(v.subtopic_id, arr);
  }
  const pdfsBySub = new Map<string, SubtopicPdf[]>();
  for (const p of pdfs) {
    const arr = pdfsBySub.get(p.subtopic_id) ?? [];
    arr.push(p);
    pdfsBySub.set(p.subtopic_id, arr);
  }
  const quizBySub = new Map<string, SubtopicQuiz>();
  for (const q of quizzes) quizBySub.set(q.subtopic_id, q);

  const subtopicsByTopic = new Map<string, CourseSubtopic[]>();
  for (const s of subtopics) {
    const enriched: CourseSubtopic = {
      ...s,
      videos: videosBySub.get(s.id) ?? [],
      pdfs: pdfsBySub.get(s.id) ?? [],
      quiz: quizBySub.get(s.id) ?? null,
    };
    const arr = subtopicsByTopic.get(s.topic_id) ?? [];
    arr.push(enriched);
    subtopicsByTopic.set(s.topic_id, arr);
  }

  const topicsBySubject = new Map<string, CourseTopic[]>();
  for (const t of topics) {
    const enriched: CourseTopic = { ...t, subtopics: subtopicsByTopic.get(t.id) ?? [] };
    const arr = topicsBySubject.get(t.subject_id) ?? [];
    arr.push(enriched);
    topicsBySubject.set(t.subject_id, arr);
  }

  return subjects.map((subj) => ({ ...subj, topics: topicsBySubject.get(subj.id) ?? [] }));
}

export async function upsertVideoProgress(params: {
  user_id: string;
  video_id: string;
  subtopic_id: string;
  course_id: string;
  is_completed: boolean;
}) {
  return supabase
    .from("subtopic_video_progress" as any)
    .upsert({ ...params, last_accessed_at: new Date().toISOString() }, { onConflict: "user_id,video_id" });
}

export async function reorderSiblings(table: string, ids: string[]) {
  const updates = ids.map((id, idx) => ({ id, position: idx }));
  // Upsert each in parallel — small lists.
  await Promise.all(updates.map((u) => supabase.from(table as any).update({ position: u.position }).eq("id", u.id)));
}
