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
      active_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          last_seen: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          last_seen?: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          last_seen?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string | null
          class_level: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_percent: number | null
          id: string
          is_published: boolean
          original_price: number | null
          price: number
          slug: string
          stock: number
          subject: string | null
          tags: string[] | null
          target_exam: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          class_level?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_published?: boolean
          original_price?: number | null
          price?: number
          slug: string
          stock?: number
          subject?: string | null
          tags?: string[] | null
          target_exam?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          class_level?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_published?: boolean
          original_price?: number | null
          price?: number
          slug?: string
          stock?: number
          subject?: string | null
          tags?: string[] | null
          target_exam?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      boost_registrations: {
        Row: {
          admit_card_number: string | null
          amount: number
          city: string | null
          class_level: string
          created_at: string
          date_of_birth: string | null
          email: string
          exam_slot: string | null
          full_name: string
          id: string
          notes: string | null
          parent_name: string | null
          parent_phone: string | null
          payment_ref: string | null
          payment_status: string
          phone: string
          preferred_centre_id: string | null
          preferred_centre_label: string | null
          school_name: string | null
          state: string | null
          status: string
          target_exam: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          admit_card_number?: string | null
          amount?: number
          city?: string | null
          class_level: string
          created_at?: string
          date_of_birth?: string | null
          email: string
          exam_slot?: string | null
          full_name: string
          id?: string
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          payment_ref?: string | null
          payment_status?: string
          phone: string
          preferred_centre_id?: string | null
          preferred_centre_label?: string | null
          school_name?: string | null
          state?: string | null
          status?: string
          target_exam: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          admit_card_number?: string | null
          amount?: number
          city?: string | null
          class_level?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string
          exam_slot?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          payment_ref?: string | null
          payment_status?: string
          phone?: string
          preferred_centre_id?: string | null
          preferred_centre_label?: string | null
          school_name?: string | null
          state?: string | null
          status?: string
          target_exam?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boost_registrations_preferred_centre_id_fkey"
            columns: ["preferred_centre_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      center_banners: {
        Row: {
          center_id: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_banners_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      center_course_enquiries: {
        Row: {
          center_id: string
          class_level: string | null
          course_id: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          center_id: string
          class_level?: string | null
          course_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          class_level?: string | null
          course_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_course_enquiries_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_course_enquiries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "center_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      center_courses: {
        Row: {
          banner_url: string | null
          brochure_url: string | null
          center_id: string
          class_level: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          duration: string | null
          fees: number | null
          highlights: Json
          id: string
          is_published: boolean
          schedule: string | null
          slug: string | null
          sort_order: number
          start_date: string | null
          target_exam: string | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          brochure_url?: string | null
          center_id: string
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration?: string | null
          fees?: number | null
          highlights?: Json
          id?: string
          is_published?: boolean
          schedule?: string | null
          slug?: string | null
          sort_order?: number
          start_date?: string | null
          target_exam?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          brochure_url?: string | null
          center_id?: string
          class_level?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration?: string | null
          fees?: number | null
          highlights?: Json
          id?: string
          is_published?: boolean
          schedule?: string | null
          slug?: string | null
          sort_order?: number
          start_date?: string | null
          target_exam?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_courses_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      center_staff: {
        Row: {
          center_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          center_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          center_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_staff_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          address: string
          area: string | null
          city: string
          created_at: string
          created_by: string | null
          email: string | null
          established: number | null
          featured_rank: number | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_hq: boolean
          is_published: boolean
          phone: string
          region: string
          slug: string
          sort_order: number
          state: string
          theme: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          address?: string
          area?: string | null
          city: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          established?: number | null
          featured_rank?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_hq?: boolean
          is_published?: boolean
          phone?: string
          region?: string
          slug: string
          sort_order?: number
          state: string
          theme?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          address?: string
          area?: string | null
          city?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          established?: number | null
          featured_rank?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_hq?: boolean
          is_published?: boolean
          phone?: string
          region?: string
          slug?: string
          sort_order?: number
          state?: string
          theme?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      chapter_quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          quiz_id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id: string
          score?: number
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "chapter_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          options: Json
          position: number
          question: string
          quiz_id: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          options: Json
          position?: number
          question: string
          quiz_id: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          position?: number
          question?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "chapter_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_quizzes: {
        Row: {
          chapter_id: string
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          chapter_id: string
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_published: boolean
          position: number
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_published?: boolean
          position?: number
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_published?: boolean
          position?: number
          subject?: string | null
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
      course_reviews: {
        Row: {
          course_id: string
          created_at: string
          id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          assigned_teacher_id: string | null
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
          requirements: string[]
          slug: string
          subject: string
          tags: string[] | null
          target_exam: string | null
          thumbnail_url: string | null
          total_enrolled: number | null
          total_lessons: number | null
          updated_at: string
          what_youll_learn: string[]
        }
        Insert: {
          assigned_teacher_id?: string | null
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
          requirements?: string[]
          slug: string
          subject: string
          tags?: string[] | null
          target_exam?: string | null
          thumbnail_url?: string | null
          total_enrolled?: number | null
          total_lessons?: number | null
          updated_at?: string
          what_youll_learn?: string[]
        }
        Update: {
          assigned_teacher_id?: string | null
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
          requirements?: string[]
          slug?: string
          subject?: string
          tags?: string[] | null
          target_exam?: string | null
          thumbnail_url?: string | null
          total_enrolled?: number | null
          total_lessons?: number | null
          updated_at?: string
          what_youll_learn?: string[]
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
          ai_escalated: boolean
          assigned_teacher_id: string | null
          created_at: string
          id: string
          image_url: string | null
          question_text: string
          resolution_type: string | null
          routed_to: string
          status: string
          subject: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_answer?: string | null
          ai_escalated?: boolean
          assigned_teacher_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          question_text: string
          resolution_type?: string | null
          routed_to?: string
          status?: string
          subject: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_answer?: string | null
          ai_escalated?: boolean
          assigned_teacher_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          question_text?: string
          resolution_type?: string | null
          routed_to?: string
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
          category: string | null
          center_id: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          priority: string
          region: string | null
          source: string
          source_type: string
          staff_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          center_id?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          priority?: string
          region?: string | null
          source?: string
          source_type?: string
          staff_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          center_id?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          priority?: string
          region?: string | null
          source?: string
          source_type?: string
          staff_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
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
      exams: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      leadership_profiles: {
        Row: {
          created_at: string
          headline: string | null
          hero_photo_url: string | null
          id: string
          intro: string | null
          is_active: boolean
          name: string
          pull_quote: string | null
          recognition_text: string | null
          slug: string
          sort_order: number
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          headline?: string | null
          hero_photo_url?: string | null
          id?: string
          intro?: string | null
          is_active?: boolean
          name: string
          pull_quote?: string | null
          recognition_text?: string | null
          slug: string
          sort_order?: number
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          headline?: string | null
          hero_photo_url?: string | null
          id?: string
          intro?: string | null
          is_active?: boolean
          name?: string
          pull_quote?: string | null
          recognition_text?: string | null
          slug?: string
          sort_order?: number
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leadership_sections: {
        Row: {
          body: string
          created_at: string
          heading: string
          id: string
          leadership_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          heading: string
          id?: string
          leadership_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          heading?: string
          id?: string
          leadership_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leadership_sections_leadership_id_fkey"
            columns: ["leadership_id"]
            isOneToOne: false
            referencedRelation: "leadership_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_bucket: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          subject: string
          tags: string[]
          thumbnail_url: string | null
          title: string
          topic: string | null
          updated_at: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          subject: string
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          subject?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          youtube_url?: string
        }
        Relationships: []
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
          is_published: boolean
          lecture_id: string | null
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
          is_published?: boolean
          lecture_id?: string | null
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
          is_published?: boolean
          lecture_id?: string | null
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
          {
            foreignKeyName: "lessons_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lecture_bucket"
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
      live_class_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          educator_avatar: string | null
          educator_name: string | null
          id: string
          max_participants: number | null
          meeting_url: string | null
          name: string
          subject: string
          target_exam: string | null
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          educator_avatar?: string | null
          educator_name?: string | null
          id?: string
          max_participants?: number | null
          meeting_url?: string | null
          name: string
          subject: string
          target_exam?: string | null
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          educator_avatar?: string | null
          educator_name?: string | null
          id?: string
          max_participants?: number | null
          meeting_url?: string | null
          name?: string
          subject?: string
          target_exam?: string | null
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_classes: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
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
          scheduled_by: string | null
          slug: string
          starts_at: string
          status: string
          subject: string
          target_exam: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
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
          scheduled_by?: string | null
          slug?: string
          starts_at: string
          status?: string
          subject: string
          target_exam?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
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
          scheduled_by?: string | null
          slug?: string
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
      module_pack_items: {
        Row: {
          book_id: string
          created_at: string
          id: string
          pack_id: string
          position: number
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          pack_id: string
          position?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          pack_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_pack_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "module_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      module_packs: {
        Row: {
          class_level: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          original_price: number | null
          price: number
          slug: string
          sort_order: number
          target_exam: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_level?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          original_price?: number | null
          price?: number
          slug: string
          sort_order?: number
          target_exam?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_level?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          original_price?: number | null
          price?: number
          slug?: string
          sort_order?: number
          target_exam?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_doubt_answered: boolean
          email_live_class_reminder: boolean
          email_mentor_message: boolean
          email_payment_receipt: boolean
          email_system: boolean
          id: string
          inapp_doubt_answered: boolean
          inapp_live_class_reminder: boolean
          inapp_mentor_message: boolean
          inapp_payment_receipt: boolean
          inapp_system: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_doubt_answered?: boolean
          email_live_class_reminder?: boolean
          email_mentor_message?: boolean
          email_payment_receipt?: boolean
          email_system?: boolean
          id?: string
          inapp_doubt_answered?: boolean
          inapp_live_class_reminder?: boolean
          inapp_mentor_message?: boolean
          inapp_payment_receipt?: boolean
          inapp_system?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_doubt_answered?: boolean
          email_live_class_reminder?: boolean
          email_mentor_message?: boolean
          email_payment_receipt?: boolean
          email_system?: boolean
          id?: string
          inapp_doubt_answered?: boolean
          inapp_live_class_reminder?: boolean
          inapp_mentor_message?: boolean
          inapp_payment_receipt?: boolean
          inapp_system?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          archived_at: string | null
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
          archived_at?: string | null
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
          archived_at?: string | null
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
      order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_title: string
          item_type: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_title: string
          item_type: string
          order_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_title?: string
          item_type?: string
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          id: string
          notes: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_fee: number
          shipping_name: string | null
          shipping_phone: string | null
          shipping_pincode: string | null
          shipping_state: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_fee?: number
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_pincode?: string | null
          shipping_state?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_fee?: number
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_pincode?: string | null
          shipping_state?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_id: string | null
          gateway: string
          id: string
          metadata: Json | null
          plan: string | null
          refunded_at: string | null
          status: string
          student_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          gateway?: string
          id?: string
          metadata?: Json | null
          plan?: string | null
          refunded_at?: string | null
          status?: string
          student_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          gateway?: string
          id?: string
          metadata?: Json | null
          plan?: string | null
          refunded_at?: string | null
          status?: string
          student_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          admin_email_alerts: boolean
          id: number
          maintenance_mode: boolean
          open_registrations: boolean
          site_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_email_alerts?: boolean
          id?: number
          maintenance_mode?: boolean
          open_registrations?: boolean
          site_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_email_alerts?: boolean
          id?: number
          maintenance_mode?: boolean
          open_registrations?: boolean
          site_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          center_id: string | null
          city: string | null
          class_level: string | null
          country: string | null
          created_at: string
          doubt_preference: string
          father_name: string | null
          full_name: string | null
          goal: string | null
          id: string
          is_associated_to_school: boolean
          is_bansal_offline_student: boolean
          is_suspended: boolean
          onboarding_completed: boolean
          phone: string | null
          plan: string
          school_id: string | null
          state: string | null
          target_exam: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          center_id?: string | null
          city?: string | null
          class_level?: string | null
          country?: string | null
          created_at?: string
          doubt_preference?: string
          father_name?: string | null
          full_name?: string | null
          goal?: string | null
          id?: string
          is_associated_to_school?: boolean
          is_bansal_offline_student?: boolean
          is_suspended?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          school_id?: string | null
          state?: string | null
          target_exam?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          center_id?: string | null
          city?: string | null
          class_level?: string | null
          country?: string | null
          created_at?: string
          doubt_preference?: string
          father_name?: string | null
          full_name?: string | null
          goal?: string | null
          id?: string
          is_associated_to_school?: boolean
          is_bansal_offline_student?: boolean
          is_suspended?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string
          school_id?: string | null
          state?: string | null
          target_exam?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank: {
        Row: {
          correct_answer: Json
          created_at: string
          created_by: string | null
          difficulty: string
          explanation: string | null
          id: string
          import_batch_id: string | null
          is_public: boolean
          marks_correct: number
          marks_wrong: number
          match_left: Json | null
          numerical_answer: number | null
          option_images: Json
          options: Json
          partial_marking: boolean
          question_image_url: string | null
          question_text: string
          question_type: string
          solution_image_url: string | null
          source_filename: string | null
          subject: string
          tags: string[]
          tolerance: number
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
          import_batch_id?: string | null
          is_public?: boolean
          marks_correct?: number
          marks_wrong?: number
          match_left?: Json | null
          numerical_answer?: number | null
          option_images?: Json
          options?: Json
          partial_marking?: boolean
          question_image_url?: string | null
          question_text: string
          question_type?: string
          solution_image_url?: string | null
          source_filename?: string | null
          subject: string
          tags?: string[]
          tolerance?: number
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
          import_batch_id?: string | null
          is_public?: boolean
          marks_correct?: number
          marks_wrong?: number
          match_left?: Json | null
          numerical_answer?: number | null
          option_images?: Json
          options?: Json
          partial_marking?: boolean
          question_image_url?: string | null
          question_text?: string
          question_type?: string
          solution_image_url?: string | null
          source_filename?: string | null
          subject?: string
          tags?: string[]
          tolerance?: number
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_import_batches: {
        Row: {
          created_at: string
          error_log: Json
          filename: string
          id: string
          image_count: number
          question_count: number
          status: string
          target_id: string | null
          target_type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          error_log?: Json
          filename: string
          id?: string
          image_count?: number
          question_count?: number
          status?: string
          target_id?: string | null
          target_type: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          error_log?: Json
          filename?: string
          id?: string
          image_count?: number
          question_count?: number
          status?: string
          target_id?: string | null
          target_type?: string
          uploaded_by?: string
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
      schools: {
        Row: {
          address: string | null
          board: string | null
          city: string | null
          code: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          board?: string | null
          city?: string | null
          code?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          board?: string | null
          city?: string | null
          code?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_banners: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_link: string | null
          headline: string | null
          id: string
          image_url: string | null
          is_active: boolean
          page_key: string
          subheading: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          page_key: string
          subheading?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          page_key?: string
          subheading?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_stats: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
          suffix: string | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          suffix?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          suffix?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      site_testimonials: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          quote: string
          rank_label: string | null
          rating: number | null
          region: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          quote: string
          rank_label?: string | null
          rating?: number | null
          region?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          quote?: string
          rank_label?: string | null
          rating?: number | null
          region?: string | null
          sort_order?: number
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
          answer_format: string | null
          correct_answer: Json
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          import_batch_id: string | null
          marks_correct: number | null
          marks_unanswered: number
          marks_wrong: number | null
          match_left: Json | null
          numerical_answer: number | null
          option_images: Json
          options: Json
          partial_marking: boolean
          position: number
          question_image_url: string | null
          question_text: string
          question_type: string
          solution_image_url: string | null
          source_filename: string | null
          stem_image_url: string | null
          sub_topic: string | null
          subject: string | null
          test_id: string
          tolerance: number
          topic: string | null
        }
        Insert: {
          answer_format?: string | null
          correct_answer: Json
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          import_batch_id?: string | null
          marks_correct?: number | null
          marks_unanswered?: number
          marks_wrong?: number | null
          match_left?: Json | null
          numerical_answer?: number | null
          option_images?: Json
          options?: Json
          partial_marking?: boolean
          position?: number
          question_image_url?: string | null
          question_text: string
          question_type?: string
          solution_image_url?: string | null
          source_filename?: string | null
          stem_image_url?: string | null
          sub_topic?: string | null
          subject?: string | null
          test_id: string
          tolerance?: number
          topic?: string | null
        }
        Update: {
          answer_format?: string | null
          correct_answer?: Json
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          import_batch_id?: string | null
          marks_correct?: number | null
          marks_unanswered?: number
          marks_wrong?: number | null
          match_left?: Json | null
          numerical_answer?: number | null
          option_images?: Json
          options?: Json
          partial_marking?: boolean
          position?: number
          question_image_url?: string | null
          question_text?: string
          question_type?: string
          solution_image_url?: string | null
          source_filename?: string | null
          stem_image_url?: string | null
          sub_topic?: string | null
          subject?: string | null
          test_id?: string
          tolerance?: number
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
      test_reattempt_requests: {
        Row: {
          admin_note: string | null
          attempt_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          reason: string | null
          status: string
          test_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          attempt_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason?: string | null
          status?: string
          test_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          attempt_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason?: string | null
          status?: string
          test_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_reattempt_requests_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_reattempt_requests_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_series: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          discount_percent: number | null
          duration_months: number | null
          features: string[] | null
          id: string
          is_featured: boolean
          is_published: boolean
          original_price: number | null
          price: number
          slug: string
          subject: string | null
          target_exam: string | null
          thumbnail_url: string | null
          title: string
          total_tests: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_months?: number | null
          features?: string[] | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          original_price?: number | null
          price?: number
          slug: string
          subject?: string | null
          target_exam?: string | null
          thumbnail_url?: string | null
          title: string
          total_tests?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_months?: number | null
          features?: string[] | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          original_price?: number | null
          price?: number
          slug?: string
          subject?: string | null
          target_exam?: string | null
          thumbnail_url?: string | null
          title?: string
          total_tests?: number
          updated_at?: string
        }
        Relationships: []
      }
      tests: {
        Row: {
          auto_release: boolean
          correct_marks: number
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          ends_at: string | null
          exam_pattern: string
          id: string
          import_method: string
          is_published: boolean
          results_released_at: string | null
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
          auto_release?: boolean
          correct_marks?: number
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          exam_pattern?: string
          id?: string
          import_method?: string
          is_published?: boolean
          results_released_at?: string | null
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
          auto_release?: boolean
          correct_marks?: number
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          exam_pattern?: string
          id?: string
          import_method?: string
          is_published?: boolean
          results_released_at?: string | null
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
      toppers: {
        Row: {
          batch_year: number | null
          category: string | null
          city: string | null
          company: string | null
          created_at: string
          created_by: string | null
          current_position: string | null
          exam: string
          id: string
          is_alumni: boolean
          is_published: boolean
          name: string
          photo_url: string | null
          quote: string | null
          rank_label: string | null
          score: string | null
          sort_order: number
          updated_at: string
          year: number | null
        }
        Insert: {
          batch_year?: number | null
          category?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          current_position?: string | null
          exam: string
          id?: string
          is_alumni?: boolean
          is_published?: boolean
          name: string
          photo_url?: string | null
          quote?: string | null
          rank_label?: string | null
          score?: string | null
          sort_order?: number
          updated_at?: string
          year?: number | null
        }
        Update: {
          batch_year?: number | null
          category?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          current_position?: string | null
          exam?: string
          id?: string
          is_alumni?: boolean
          is_published?: boolean
          name?: string
          photo_url?: string | null
          quote?: string | null
          rank_label?: string | null
          score?: string | null
          sort_order?: number
          updated_at?: string
          year?: number | null
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
      can_reattempt_test: {
        Args: { _test_id: string; _user_id: string }
        Returns: boolean
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
      get_chapter_quiz_answers: {
        Args: { _quiz_id: string }
        Returns: {
          correct_index: number
          explanation: string
          id: string
        }[]
      }
      get_live_class_join_url: {
        Args: { _class_id: string }
        Returns: {
          meeting_url: string
          recording_url: string
        }[]
      }
      get_test_question_answers: {
        Args: { _test_id: string }
        Returns: {
          correct_answer: Json
          explanation: string
          id: string
          numerical_answer: number
          question_type: string
          tolerance: number
        }[]
      }
      get_test_rank: { Args: { _attempt_id: string }; Returns: Json }
      get_user_streak: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_super: { Args: { _user_id: string }; Returns: boolean }
      is_any_center_staff: { Args: { _user_id: string }; Returns: boolean }
      is_center_staff: {
        Args: { _center_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_user_id_by_email: { Args: { _email: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      noop_manage_center_admin_marker: { Args: never; Returns: boolean }
      notify_admins: {
        Args: { _body: string; _link: string; _title: string; _type: string }
        Returns: undefined
      }
      pick_teacher_for_doubt: { Args: never; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      slugify_text: { Args: { input: string }; Returns: string }
      submit_test_attempt: { Args: { _attempt_id: string }; Returns: Json }
      test_results_released: { Args: { _test_id: string }; Returns: boolean }
      upcoming_live_class_reminders: {
        Args: { _lookahead_minutes?: number }
        Returns: {
          class_id: string
          class_title: string
          educator_name: string
          starts_at: string
          subject: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "student"
        | "teacher"
        | "mentor"
        | "center_admin"
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
      app_role: [
        "super_admin",
        "admin",
        "student",
        "teacher",
        "mentor",
        "center_admin",
      ],
    },
  },
} as const
