export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_pdfs: {
        Row: {
          course_id: string
          created_at: string
          file_url: string
          id: string
          position: number
          size_bytes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          file_url: string
          id?: string
          position?: number
          size_bytes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          file_url?: string
          id?: string
          position?: number
          size_bytes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_resources: {
        Row: {
          chapter_id: string | null
          course_id: string
          created_at: string
          description: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          is_published: boolean
          mime_type: string | null
          position: number
          resource_type: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          chapter_id?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_published?: boolean
          mime_type?: string | null
          position?: number
          resource_type?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          chapter_id?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_published?: boolean
          mime_type?: string | null
          position?: number
          resource_type?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          badge: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_percent: number | null
          duration_hours: number | null
          educator_name: string
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          level: string | null
          name: string
          original_price: number | null
          price: number
          rating: number | null
          slug: string
          subject: string
          tags: string[] | null
          target_exam: string | null
          thumbnail_url: string | null
          total_enrolled: number | null
          total_lessons: number | null
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_hours?: number | null
          educator_name: string
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          level?: string | null
          name: string
          original_price?: number | null
          price?: number
          rating?: number | null
          slug: string
          subject: string
          tags?: string[] | null
          target_exam?: string | null
          thumbnail_url?: string | null
          total_enrolled?: number | null
          total_lessons?: number | null
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_hours?: number | null
          educator_name?: string
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          level?: string | null
          name?: string
          original_price?: number | null
          price?: number
          rating?: number | null
          slug?: string
          subject?: string
          tags?: string[] | null
          target_exam?: string | null
          thumbnail_url?: string | null
          total_enrolled?: number | null
          total_lessons?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      doubt_answers: {
        Row: {
          answer_text: string
          created_at: string
          doubt_id: string
          helpful_count: number | null
          id: string
          image_url: string | null
          responder_id: string
          responder_role: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          doubt_id: string
          helpful_count?: number | null
          id?: string
          image_url?: string | null
          responder_id: string
          responder_role: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          doubt_id?: string
          helpful_count?: number | null
          id?: string
          image_url?: string | null
          responder_id?: string
          responder_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_answers_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
        ]
      }
      doubts: {
        Row: {
          ai_answer: string | null
          assigned_teacher_id: string | null
          created_at: string
          id: string
          image_url: string | null
          question_text: string
          status: string
          subject: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_answer?: string | null
          assigned_teacher_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          question_text: string
          status?: string
          subject: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_answer?: string | null
          assigned_teacher_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          question_text?: string
          status?: string
          subject?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      educator_applications: {
        Row: {
          alt_contact_no: string | null
          candidate_name: string
          class_level: string[] | null
          contact_no: string
          created_at: string
          credentials_sent_at: string | null
          current_ctc: number | null
          current_organization: string | null
          date_of_birth: string
          demo_video_link: string
          email: string
          expected_ctc: number
          highest_qualification: string
          id: string
          other_qualification: string | null
          photo_url: string | null
          previous_organization: string | null
          resume_url: string | null
          status: string
          subject: string
          total_experience: number
          updated_at: string
        }
        Insert: {
          alt_contact_no?: string | null
          candidate_name: string
          class_level?: string[] | null
          contact_no: string
          created_at?: string
          credentials_sent_at?: string | null
          current_ctc?: number | null
          current_organization?: string | null
          date_of_birth: string
          demo_video_link: string
          email: string
          expected_ctc: number
          highest_qualification: string
          id?: string
          other_qualification?: string | null
          photo_url?: string | null
          previous_organization?: string | null
          resume_url?: string | null
          status?: string
          subject: string
          total_experience: number
          updated_at?: string
        }
        Update: {
          alt_contact_no?: string | null
          candidate_name?: string
          class_level?: string[] | null
          contact_no?: string
          created_at?: string
          credentials_sent_at?: string | null
          current_ctc?: number | null
          current_organization?: string | null
          date_of_birth?: string
          demo_video_link?: string
          email?: string
          expected_ctc?: number
          highest_qualification?: string
          id?: string
          other_qualification?: string | null
          photo_url?: string | null
          previous_organization?: string | null
          resume_url?: string | null
          status?: string
          subject?: string
          total_experience?: number
          updated_at?: string
        }
        Relationships: []
      }
      educator_follows: {
        Row: {
          created_at: string
          educator_name: string
          educator_subject: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          educator_name: string
          educator_subject?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          educator_name?: string
          educator_subject?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          region: string | null
          source: string
          staff_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          region?: string | null
          source?: string
          staff_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          region?: string | null
          source?: string
          staff_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_lessons: number
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          last_accessed_at: string | null
          last_lesson_title: string | null
          progress_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_lessons?: number
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          last_lesson_title?: string | null
          progress_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_lessons?: number
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          last_lesson_title?: string | null
          progress_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_completed: boolean
          last_watched_at: string
          lesson_slug: string
          lesson_title: string | null
          total_seconds: number
          updated_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_completed?: boolean
          last_watched_at?: string
          lesson_slug: string
          lesson_title?: string | null
          total_seconds?: number
          updated_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          last_watched_at?: string
          lesson_slug?: string
          lesson_title?: string | null
          total_seconds?: number
          updated_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter_id: string
          course_id: string
          created_at: string
          duration_seconds: number
          id: string
          is_free_preview: boolean
          position: number
          slug: string
          title: string
          type: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          chapter_id: string
          course_id: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_free_preview?: boolean
          position?: number
          slug: string
          title: string
          type?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          chapter_id?: string
          course_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_free_preview?: boolean
          position?: number
          slug?: string
          title?: string
          type?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_attendance: {
        Row: {
          class_id: string
          created_at: string
          id: string
          joined_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_messages: {
        Row: {
          class_id: string
          created_at: string
          display_name: string
          id: string
          is_teacher: boolean
          message: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          display_name: string
          id?: string
          is_teacher?: boolean
          message: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_teacher?: boolean
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          educator_avatar: string | null
          educator_name: string
          ends_at: string | null
          id: string
          max_participants: number | null
          meeting_url: string | null
          recording_url: string | null
          starts_at: string
          status: string
          subject: string
          target_exam: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          educator_avatar?: string | null
          educator_name: string
          ends_at?: string | null
          id?: string
          max_participants?: number | null
          meeting_url?: string | null
          recording_url?: string | null
          starts_at: string
          status?: string
          subject: string
          target_exam?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          educator_avatar?: string | null
          educator_name?: string
          ends_at?: string | null
          id?: string
          max_participants?: number | null
          meeting_url?: string | null
          recording_url?: string | null
          starts_at?: string
          status?: string
          subject?: string
          target_exam?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          class_level: string | null
          country: string | null
          created_at: string
          full_name: string | null
          goal: string | null
          id: string
          is_suspended: boolean
          onboarding_completed: boolean
          phone: string | null
          plan: string
          target_exam: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          class_level?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          goal?: string | null
          id?: string
          is_suspended?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          target_exam?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          class_level?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          goal?: string | null
          id?: string
          is_suspended?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          target_exam?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          correct_answer: Json
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          id: string
          is_public: boolean
          marks_correct: number
          marks_wrong: number
          options: Json
          question_image_url: string | null
          question_text: string
          subject: string
          tags: string[]
          topic: string | null
          updated_at: string
        }
        Insert: {
          correct_answer: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          is_public?: boolean
          marks_correct?: number
          marks_wrong?: number
          options?: Json
          question_image_url?: string | null
          question_text: string
          subject: string
          tags?: string[]
          topic?: string | null
          updated_at?: string
        }
        Update: {
          correct_answer?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          explanation?: string | null
          id?: string
          is_public?: boolean
          marks_correct?: number
          marks_wrong?: number
          options?: Json
          question_image_url?: string | null
          question_text?: string
          subject?: string
          tags?: string[]
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          category: string
          created_at: string
          description: string
          evidence_url: string | null
          handled_by: string | null
          id: string
          reported_name: string
          reported_role: string
          reported_user_id: string | null
          reporter_id: string
          resolution_notes: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          evidence_url?: string | null
          handled_by?: string | null
          id?: string
          reported_name: string
          reported_role?: string
          reported_user_id?: string | null
          reporter_id: string
          resolution_notes?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          evidence_url?: string | null
          handled_by?: string | null
          id?: string
          reported_name?: string
          reported_role?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolution_notes?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          id: string
          minutes_studied: number
          questions_attempted: number
          questions_correct: number
          session_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes_studied?: number
          questions_attempted?: number
          questions_correct?: number
          session_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes_studied?: number
          questions_attempted?: number
          questions_correct?: number
          session_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          answers: Json | null
          attempted_at: string
          correct_answers: number
          created_at: string
          id: string
          metadata: Json | null
          percentile: number | null
          question_statuses: Json | null
          score: number
          started_at: string | null
          status: string
          subject: string | null
          submitted_at: string | null
          test_id: string | null
          test_name: string
          time_spent_seconds: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempted_at?: string
          correct_answers?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          percentile?: number | null
          question_statuses?: Json | null
          score?: number
          started_at?: string | null
          status?: string
          subject?: string | null
          submitted_at?: string | null
          test_id?: string | null
          test_name: string
          time_spent_seconds?: number | null
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempted_at?: string
          correct_answers?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          percentile?: number | null
          question_statuses?: Json | null
          score?: number
          started_at?: string | null
          status?: string
          subject?: string | null
          submitted_at?: string | null
          test_id?: string | null
          test_name?: string
          time_spent_seconds?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      test_questions: {
        Row: {
          correct_answer: Json
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          marks_correct: number | null
          marks_wrong: number | null
          options: Json
          position: number
          question_image_url: string | null
          question_text: string
          question_type: string
          subject: string | null
          test_id: string
          topic: string | null
        }
        Insert: {
          correct_answer: Json
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          marks_correct?: number | null
          marks_wrong?: number | null
          options?: Json
          position?: number
          question_image_url?: string | null
          question_text: string
          question_type?: string
          subject?: string | null
          test_id: string
          topic?: string | null
        }
        Update: {
          correct_answer?: Json
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          marks_correct?: number | null
          marks_wrong?: number | null
          options?: Json
          position?: number
          question_image_url?: string | null
          question_text?: string
          question_type?: string
          subject?: string | null
          test_id?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          correct_marks: number
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          ends_at: string | null
          exam_pattern: string
          id: string
          is_published: boolean
          slug: string
          starts_at: string | null
          subjects: string[] | null
          test_type: string
          title: string
          total_marks: number
          total_questions: number
          updated_at: string
          visibility: string
          wrong_marks: number
        }
        Insert: {
          correct_marks?: number
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          exam_pattern?: string
          id?: string
          is_published?: boolean
          slug: string
          starts_at?: string | null
          subjects?: string[] | null
          test_type?: string
          title: string
          total_marks?: number
          total_questions?: number
          updated_at?: string
          visibility?: string
          wrong_marks?: number
        }
        Update: {
          correct_marks?: number
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          exam_pattern?: string
          id?: string
          is_published?: boolean
          slug?: string
          starts_at?: string | null
          subjects?: string[] | null
          test_type?: string
          title?: string
          total_marks?: number
          total_questions?: number
          updated_at?: string
          visibility?: string
          wrong_marks?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      educator_application_exists: {
        Args: { _contact_no: string; _email: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enquiry_recently_submitted: {
        Args: { _email: string; _phone: string }
        Returns: boolean
      }
      get_user_streak: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      submit_test_attempt: { Args: { _attempt_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "staff" | "student" | "teacher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "student", "teacher"],
    },
  },
} as const
