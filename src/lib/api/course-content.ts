import { supabase } from "@/integrations/supabase/client";
import type { CourseSubject, CourseTopic, SubtopicVideo, SubtopicPdf, SubtopicQuiz } from "@/types/course-content";

export async function fetchCourseContentTree(courseId: string, userId: string | null): Promise<CourseSubject[]> {
  const [subjectsRes, topicsRes, videosRes, pdfsRes, quizzesRes] = await Promise.all([
    supabase.from("course_subjects" as any).select("*").eq("course_id", courseId).order("position"),
    supabase.from("course_topics" as any).select("*").eq("course_id", courseId).order("position"),
    supabase.from("subtopic_videos" as any).select("*").eq("course_id", courseId).order("position"),
    supabase.from("subtopic_pdfs" as any).select("*").eq("course_id", courseId).order("position"),
    supabase.from("subtopic_quizzes" as any).select("*").eq("course_id", courseId),
  ]);

  const subjects = (subjectsRes.data ?? []) as any[];
  const topics = (topicsRes.data ?? []) as any[];
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

  const videosByTopic = new Map<string, SubtopicVideo[]>();
  for (const v of videos) {
    if (!v.topic_id) continue;
    const arr = videosByTopic.get(v.topic_id) ?? [];
    arr.push({ ...v, progress: progressMap[v.id] ?? null });
    videosByTopic.set(v.topic_id, arr);
  }
  const pdfsByTopic = new Map<string, SubtopicPdf[]>();
  for (const p of pdfs) {
    if (!p.topic_id) continue;
    const arr = pdfsByTopic.get(p.topic_id) ?? [];
    arr.push(p);
    pdfsByTopic.set(p.topic_id, arr);
  }
  const quizByTopic = new Map<string, SubtopicQuiz>();
  for (const q of quizzes) {
    if (!q.topic_id) continue;
    quizByTopic.set(q.topic_id, q);
  }

  const topicsBySubject = new Map<string, CourseTopic[]>();
  for (const t of topics) {
    const enriched: CourseTopic = {
      ...t,
      videos: videosByTopic.get(t.id) ?? [],
      pdfs: pdfsByTopic.get(t.id) ?? [],
      quiz: quizByTopic.get(t.id) ?? null,
    };
    const arr = topicsBySubject.get(t.subject_id) ?? [];
    arr.push(enriched);
    topicsBySubject.set(t.subject_id, arr);
  }

  return subjects.map((subj) => ({ ...subj, topics: topicsBySubject.get(subj.id) ?? [] }));
}

export async function upsertVideoProgress(params: {
  user_id: string;
  video_id: string;
  subtopic_id?: string | null;
  course_id: string;
  is_completed: boolean;
}) {
  return supabase
    .from("subtopic_video_progress" as any)
    .upsert(
      { ...params, subtopic_id: params.subtopic_id ?? null, last_accessed_at: new Date().toISOString() },
      { onConflict: "user_id,video_id" },
    );
}

export async function reorderSiblings(table: string, ids: string[]) {
  const updates = ids.map((id, idx) => ({ id, position: idx }));
  await Promise.all(updates.map((u) => supabase.from(table as any).update({ position: u.position }).eq("id", u.id)));
}
