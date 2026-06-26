export interface CourseSubject {
  id: string;
  course_id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  topics?: CourseTopic[];
  total_videos?: number;
  completed_videos?: number;
}

export interface CourseTopic {
  id: string;
  course_id: string;
  subject_id: string;
  name: string;
  position: number;
  subtopics?: CourseSubtopic[];
  total_videos?: number;
  completed_videos?: number;
}

export interface CourseSubtopic {
  id: string;
  course_id: string;
  topic_id: string;
  name: string;
  description?: string | null;
  position: number;
  videos?: SubtopicVideo[];
  pdfs?: SubtopicPdf[];
  quiz?: SubtopicQuiz | null;
  total_videos?: number;
  completed_videos?: number;
}

export interface SubtopicVideo {
  id: string;
  course_id: string;
  subtopic_id: string;
  title: string;
  youtube_url: string;
  youtube_video_id: string | null;
  thumbnail_url?: string | null;
  duration_label?: string | null;
  description?: string | null;
  position: number;
  is_preview: boolean;
  created_at: string;
  progress?: SubtopicVideoProgress | null;
}

export interface SubtopicVideoProgress {
  is_completed: boolean;
  watch_time_seconds: number;
  last_accessed_at: string;
}

export interface SubtopicPdf {
  id: string;
  course_id: string;
  subtopic_id: string;
  title: string;
  file_url: string;
  file_size_kb?: number | null;
  position: number;
}

export interface SubtopicQuiz {
  id: string;
  course_id: string;
  subtopic_id: string;
  title: string;
  description?: string | null;
  time_limit_minutes?: number | null;
  pass_percentage: number;
  questions?: SubtopicQuizQuestion[];
}

export interface SubtopicQuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "a" | "b" | "c" | "d";
  explanation?: string | null;
  marks: number;
  negative_marks: number;
  position: number;
}

export interface SubtopicQuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: Record<string, "a" | "b" | "c" | "d">;
  score: number;
  total_marks: number;
  passed: boolean;
  time_taken_seconds: number;
  submitted_at: string;
}
