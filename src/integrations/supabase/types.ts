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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      academic_exams: {
        Row: {
          academic_year_id: string | null
          class_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          exam_date: string | null
          exam_type: string | null
          id: string
          is_published: boolean | null
          name: string
          passing_marks: number | null
          session_id: string | null
          subject: string | null
          total_marks: number | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          exam_date?: string | null
          exam_type?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          passing_marks?: number | null
          session_id?: string | null
          subject?: string | null
          total_marks?: number | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          exam_date?: string | null
          exam_type?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          passing_marks?: number | null
          session_id?: string | null
          subject?: string | null
          total_marks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_exams_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_exams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_marks: {
        Row: {
          created_at: string | null
          entered_by: string | null
          exam_id: string | null
          grade: string | null
          id: string
          is_absent: boolean | null
          marks_obtained: number | null
          remarks: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entered_by?: string | null
          exam_id?: string | null
          grade?: string | null
          id?: string
          is_absent?: boolean | null
          marks_obtained?: number | null
          remarks?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entered_by?: string | null
          exam_id?: string | null
          grade?: string | null
          id?: string
          is_absent?: boolean | null
          marks_obtained?: number | null
          remarks?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "academic_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_years: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      account_groups: {
        Row: {
          account_type: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          account_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          account_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      account_sub_groups: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_sub_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "account_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_modules: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_code: string | null
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_code?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_code?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      app_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_id: string | null
          account_name: string
          account_number: string
          bank_name: string
          branch: string | null
          created_at: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          opening_balance: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          account_name: string
          account_number: string
          bank_name: string
          branch?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string
          account_number?: string
          bank_name?: string
          branch?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          account_id: string | null
          actual_amount: number | null
          budget_id: string | null
          budgeted_amount: number
          created_at: string | null
          description: string | null
          id: string
          variance: number | null
        }
        Insert: {
          account_id?: string | null
          actual_amount?: number | null
          budget_id?: string | null
          budgeted_amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          variance?: number | null
        }
        Update: {
          account_id?: string | null
          actual_amount?: number | null
          budget_id?: string | null
          budgeted_amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          fiscal_year_id: string | null
          id: string
          name: string
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fiscal_year_id?: string | null
          id?: string
          name: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fiscal_year_id?: string | null
          id?: string
          name?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_accounts: {
        Row: {
          account_id: string | null
          created_at: string | null
          current_balance: number | null
          id: string
          imprest_limit: number | null
          is_active: boolean | null
          is_petty_cash: boolean | null
          name: string
          opening_balance: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          imprest_limit?: number | null
          is_active?: boolean | null
          is_petty_cash?: boolean | null
          name: string
          opening_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          imprest_limit?: number | null
          is_active?: boolean | null
          is_petty_cash?: boolean | null
          name?: string
          opening_balance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          created_at: string | null
          description: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          normal_balance: string | null
          parent_id: string | null
          sub_group_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          normal_balance?: string | null
          parent_id?: string | null
          sub_group_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          normal_balance?: string | null
          parent_id?: string | null
          sub_group_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "account_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_sub_group_id_fkey"
            columns: ["sub_group_id"]
            isOneToOne: false
            referencedRelation: "account_sub_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mentions: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "course_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "online_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string | null
          capacity: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          capacity?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          capacity?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      course_certificates: {
        Row: {
          certificate_number: string
          completion_date: string
          course_id: string
          created_at: string
          final_score: number | null
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          completion_date?: string
          course_id: string
          created_at?: string
          final_score?: number | null
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          completion_date?: string
          course_id?: string
          created_at?: string
          final_score?: number | null
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_chat_messages: {
        Row: {
          course_id: string
          created_at: string
          id: string
          mentions: string[] | null
          message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          message: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_chat_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_content: {
        Row: {
          content_type: string | null
          content_url: string | null
          created_at: string | null
          day_number: number
          description: string | null
          id: string
          is_premium_only: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          day_number: number
          description?: string | null
          id?: string
          is_premium_only?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          day_number?: number
          description?: string | null
          id?: string
          is_premium_only?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_exams: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          max_attempts: number | null
          passing_score: number
          prevent_tab_switch: boolean | null
          show_results: boolean | null
          shuffle_questions: boolean | null
          start_date: string | null
          time_limit_minutes: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_attempts?: number | null
          passing_score?: number
          prevent_tab_switch?: boolean | null
          show_results?: boolean | null
          shuffle_questions?: boolean | null
          start_date?: string | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_attempts?: number | null
          passing_score?: number
          prevent_tab_switch?: boolean | null
          show_results?: boolean | null
          shuffle_questions?: boolean | null
          start_date?: string | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_packages: {
        Row: {
          created_at: string | null
          description: string | null
          duration_days: number | null
          features: string[] | null
          id: string
          is_active: boolean | null
          name: string
          practicals_schedule: string | null
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          practicals_schedule?: string | null
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          practicals_schedule?: string | null
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      course_resources: {
        Row: {
          content_text: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          file_size: number | null
          id: string
          is_visible: boolean | null
          resource_type: string
          section_id: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_text?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          file_size?: number | null
          id?: string
          is_visible?: boolean | null
          resource_type: string
          section_id: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_text?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          file_size?: number | null
          id?: string
          is_visible?: boolean | null
          resource_type?: string
          section_id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_visible: boolean | null
          sort_order: number | null
          title: string
          unlock_date: string | null
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean | null
          sort_order?: number | null
          title: string
          unlock_date?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean | null
          sort_order?: number | null
          title?: string
          unlock_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_base: boolean | null
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_base?: boolean | null
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_base?: boolean | null
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          access_link_active: boolean | null
          access_link_expires_at: string | null
          access_link_token: string | null
          amount_paid: number | null
          created_at: string | null
          enrolled_at: string | null
          id: string
          package_id: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_link_active?: boolean | null
          access_link_expires_at?: string | null
          access_link_token?: string | null
          amount_paid?: number | null
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          package_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_link_active?: boolean | null
          access_link_expires_at?: string | null
          access_link_token?: string | null
          amount_paid?: number | null
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          package_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "course_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string | null
          exam_id: string
          id: string
          passed: boolean | null
          score: number | null
          started_at: string | null
          tab_switches: number | null
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string | null
          exam_id: string
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string | null
          tab_switches?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string | null
          exam_id?: string
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string | null
          tab_switches?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "course_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          exam_id: string
          id: string
          options: Json | null
          points: number | null
          question_text: string
          question_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          exam_id: string
          id?: string
          options?: Json | null
          points?: number | null
          question_text: string
          question_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          exam_id?: string
          id?: string
          options?: Json | null
          points?: number | null
          question_text?: string
          question_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "course_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          effective_date: string
          from_currency_id: string | null
          id: string
          rate: number
          to_currency_id: string | null
        }
        Insert: {
          created_at?: string | null
          effective_date: string
          from_currency_id?: string | null
          id?: string
          rate: number
          to_currency_id?: string | null
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          from_currency_id?: string | null
          id?: string
          rate?: number
          to_currency_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_id_fkey"
            columns: ["from_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_id_fkey"
            columns: ["to_currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_accounts: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_cancellations: {
        Row: {
          amount: number
          approved_by: string | null
          cancellation_date: string
          cancelled_by: string | null
          created_at: string | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          reason: string
          status: string | null
          student_id: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          cancellation_date: string
          cancelled_by?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          reason: string
          status?: string | null
          student_id?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          cancellation_date?: string
          cancelled_by?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          reason?: string
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_cancellations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_cancellations_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_cancellations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoice_items: {
        Row: {
          created_at: string | null
          description: string
          fee_account_id: string | null
          id: string
          invoice_id: string | null
          quantity: number | null
          tax_amount: number | null
          tax_type_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          fee_account_id?: string | null
          id?: string
          invoice_id?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_type_id?: string | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          fee_account_id?: string | null
          id?: string
          invoice_id?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_type_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoice_items_fee_account_id_fkey"
            columns: ["fee_account_id"]
            isOneToOne: false
            referencedRelation: "fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoice_items_tax_type_id_fkey"
            columns: ["tax_type_id"]
            isOneToOne: false
            referencedRelation: "tax_types"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoices: {
        Row: {
          academic_year_id: string | null
          amount_paid: number | null
          balance_due: number
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          notes: string | null
          session_id: string | null
          status: string | null
          student_id: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          amount_paid?: number | null
          balance_due?: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          journal_entry_id?: string | null
          notes?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          amount_paid?: number | null
          balance_due?: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          notes?: string | null
          session_id?: string | null
          status?: string | null
          student_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoices_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          cash_account_id: string | null
          created_at: string | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          notes: string | null
          payment_date: string
          payment_mode_id: string | null
          receipt_number: string
          received_by: string | null
          reference_number: string | null
          status: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cash_account_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          payment_date: string
          payment_mode_id?: string | null
          receipt_number: string
          received_by?: string | null
          reference_number?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cash_account_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_mode_id?: string | null
          receipt_number?: string
          received_by?: string | null
          reference_number?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_payment_mode_id_fkey"
            columns: ["payment_mode_id"]
            isOneToOne: false
            referencedRelation: "payment_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_policies: {
        Row: {
          academic_year_id: string | null
          amount: number
          created_at: string | null
          description: string | null
          due_date: string | null
          fee_account_id: string | null
          id: string
          is_active: boolean | null
          name: string
          session_type_id: string | null
          student_type_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          amount: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          fee_account_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          session_type_id?: string | null
          student_type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          fee_account_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          session_type_id?: string | null
          student_type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_policies_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_policies_fee_account_id_fkey"
            columns: ["fee_account_id"]
            isOneToOne: false
            referencedRelation: "fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_policies_session_type_id_fkey"
            columns: ["session_type_id"]
            isOneToOne: false
            referencedRelation: "session_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_policies_student_type_id_fkey"
            columns: ["student_type_id"]
            isOneToOne: false
            referencedRelation: "student_types"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_template_items: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          sort_order: number | null
          template_id: string
        }
        Insert: {
          account_id: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number | null
          template_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_template_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fee_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_templates: {
        Row: {
          academic_year_id: string | null
          class_id: string | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_type: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_type: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_type?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_templates_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_templates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_templates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_closed: boolean | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_closed?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_closed?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      general_ledger: {
        Row: {
          account_id: string
          balance: number | null
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          fiscal_year_id: string | null
          id: string
          journal_entry_id: string | null
          journal_line_id: string | null
          student_id: string | null
          transaction_date: string
          vendor_id: string | null
        }
        Insert: {
          account_id: string
          balance?: number | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          fiscal_year_id?: string | null
          id?: string
          journal_entry_id?: string | null
          journal_line_id?: string | null
          student_id?: string | null
          transaction_date: string
          vendor_id?: string | null
        }
        Update: {
          account_id?: string
          balance?: number | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          fiscal_year_id?: string | null
          id?: string
          journal_entry_id?: string | null
          journal_line_id?: string | null
          student_id?: string | null
          transaction_date?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "general_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_journal_line_id_fkey"
            columns: ["journal_line_id"]
            isOneToOne: false
            referencedRelation: "journal_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_ledger_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scale_levels: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          label: string
          max_value: number
          min_value: number
          points: number | null
          scale_id: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          max_value: number
          min_value: number
          points?: number | null
          scale_id: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          max_value?: number
          min_value?: number
          points?: number | null
          scale_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_scale_levels_scale_id_fkey"
            columns: ["scale_id"]
            isOneToOne: false
            referencedRelation: "grading_scales"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          scale_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          scale_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          scale_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hr_attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          created_at: string | null
          early_exit_minutes: number | null
          employee_id: string
          id: string
          late_minutes: number | null
          marked_by: string | null
          remarks: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_date: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          early_exit_minutes?: number | null
          employee_id: string
          id?: string
          late_minutes?: number | null
          marked_by?: string | null
          remarks?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          early_exit_minutes?: number | null
          employee_id?: string
          id?: string
          late_minutes?: number | null
          marked_by?: string | null
          remarks?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      hr_casual_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hr_departments: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          head_employee_id: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          head_employee_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          head_employee_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_departments_head_employee_id_fkey"
            columns: ["head_employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_designations: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hr_disciplinary_records: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          description: string
          employee_id: string
          finalized_at: string | null
          id: string
          incident_date: string
          is_finalized: boolean | null
          issued_by: string | null
          outcome: string | null
          type: string
          witness_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          description: string
          employee_id: string
          finalized_at?: string | null
          id?: string
          incident_date: string
          is_finalized?: boolean | null
          issued_by?: string | null
          outcome?: string | null
          type: string
          witness_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          description?: string
          employee_id?: string
          finalized_at?: string | null
          id?: string
          incident_date?: string
          is_finalized?: boolean | null
          issued_by?: string | null
          outcome?: string | null
          type?: string
          witness_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_disciplinary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_disciplinary_records_witness_id_fkey"
            columns: ["witness_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          employee_id: string | null
          expiry_date: string | null
          file_url: string | null
          id: string
          notes: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type: string
          employee_id?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          employee_id?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hr_employee_changes: {
        Row: {
          approved_by: string | null
          change_type: string
          created_at: string | null
          created_by: string | null
          effective_date: string
          employee_id: string
          end_date: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
        }
        Insert: {
          approved_by?: string | null
          change_type: string
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          employee_id: string
          end_date?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Update: {
          approved_by?: string | null
          change_type?: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_changes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_documents: {
        Row: {
          created_at: string | null
          document_type: string
          employee_id: string
          expiry_date: string | null
          file_size: number | null
          file_url: string
          id: string
          is_hr_only: boolean | null
          title: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          employee_id: string
          expiry_date?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          is_hr_only?: boolean | null
          title: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          employee_id?: string
          expiry_date?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_hr_only?: boolean | null
          title?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_skills: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          proficiency_level: string | null
          skill_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          proficiency_level?: string | null
          skill_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          proficiency_level?: string | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "hr_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee_status_history: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          effective_date: string
          employee_id: string
          id: string
          new_status: Database["public"]["Enums"]["employment_status"]
          old_status: Database["public"]["Enums"]["employment_status"] | null
          reason: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          employee_id: string
          id?: string
          new_status: Database["public"]["Enums"]["employment_status"]
          old_status?: Database["public"]["Enums"]["employment_status"] | null
          reason?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          employee_id?: string
          id?: string
          new_status?: Database["public"]["Enums"]["employment_status"]
          old_status?: Database["public"]["Enums"]["employment_status"] | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_status_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          casual_category_id: string | null
          confirmation_date: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          date_of_hire: string | null
          department_id: string | null
          designation_id: string | null
          email: string | null
          employee_category_id: string | null
          employee_no: string
          employment_status: string | null
          employment_term_id: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          leave_group_id: string | null
          login_enabled: boolean | null
          middle_name: string | null
          national_id: string | null
          passport_no: string | null
          password_set_at: string | null
          password_setup_sent_at: string | null
          phone: string | null
          photo_url: string | null
          physical_address: string | null
          rank_id: string | null
          status: Database["public"]["Enums"]["employment_status"] | null
          supervisor_id: string | null
          updated_at: string | null
          user_id: string | null
          work_week_id: string | null
        }
        Insert: {
          casual_category_id?: string | null
          confirmation_date?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          date_of_hire?: string | null
          department_id?: string | null
          designation_id?: string | null
          email?: string | null
          employee_category_id?: string | null
          employee_no: string
          employment_status?: string | null
          employment_term_id?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          leave_group_id?: string | null
          login_enabled?: boolean | null
          middle_name?: string | null
          national_id?: string | null
          passport_no?: string | null
          password_set_at?: string | null
          password_setup_sent_at?: string | null
          phone?: string | null
          photo_url?: string | null
          physical_address?: string | null
          rank_id?: string | null
          status?: Database["public"]["Enums"]["employment_status"] | null
          supervisor_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_week_id?: string | null
        }
        Update: {
          casual_category_id?: string | null
          confirmation_date?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          date_of_hire?: string | null
          department_id?: string | null
          designation_id?: string | null
          email?: string | null
          employee_category_id?: string | null
          employee_no?: string
          employment_status?: string | null
          employment_term_id?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          leave_group_id?: string | null
          login_enabled?: boolean | null
          middle_name?: string | null
          national_id?: string | null
          passport_no?: string | null
          password_set_at?: string | null
          password_setup_sent_at?: string | null
          phone?: string | null
          photo_url?: string | null
          physical_address?: string | null
          rank_id?: string | null
          status?: Database["public"]["Enums"]["employment_status"] | null
          supervisor_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          work_week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_casual_category_id_fkey"
            columns: ["casual_category_id"]
            isOneToOne: false
            referencedRelation: "hr_casual_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "hr_designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_employee_category_id_fkey"
            columns: ["employee_category_id"]
            isOneToOne: false
            referencedRelation: "hr_employee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_employment_term_id_fkey"
            columns: ["employment_term_id"]
            isOneToOne: false
            referencedRelation: "hr_employment_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_leave_group_id_fkey"
            columns: ["leave_group_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "hr_ranks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_work_week_id_fkey"
            columns: ["work_week_id"]
            isOneToOne: false
            referencedRelation: "hr_work_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employment_terms: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hr_holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_recurring: boolean | null
          name: string
          work_week_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_recurring?: boolean | null
          name: string
          work_week_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_recurring?: boolean | null
          name?: string
          work_week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_holidays_work_week_id_fkey"
            columns: ["work_week_id"]
            isOneToOne: false
            referencedRelation: "hr_work_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_insurance_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      hr_leave_applications: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          days_requested: number
          delegated_to: string | null
          employee_id: string
          end_date: string
          hr_action_at: string | null
          hr_action_by: string | null
          hr_remarks: string | null
          id: string
          leave_period_id: string | null
          leave_type_id: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          supervisor_action_at: string | null
          supervisor_action_by: string | null
          supervisor_remarks: string | null
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          days_requested: number
          delegated_to?: string | null
          employee_id: string
          end_date: string
          hr_action_at?: string | null
          hr_action_by?: string | null
          hr_remarks?: string | null
          id?: string
          leave_period_id?: string | null
          leave_type_id: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          supervisor_action_at?: string | null
          supervisor_action_by?: string | null
          supervisor_remarks?: string | null
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          days_requested?: number
          delegated_to?: string | null
          employee_id?: string
          end_date?: string
          hr_action_at?: string | null
          hr_action_by?: string | null
          hr_remarks?: string | null
          id?: string
          leave_period_id?: string | null
          leave_type_id?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          supervisor_action_at?: string | null
          supervisor_action_by?: string | null
          supervisor_remarks?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_applications_delegated_to_fkey"
            columns: ["delegated_to"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_applications_leave_period_id_fkey"
            columns: ["leave_period_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_applications_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_balances: {
        Row: {
          accrued: number | null
          adjustment: number | null
          closing_balance: number | null
          created_at: string | null
          employee_id: string
          id: string
          leave_period_id: string
          leave_type_id: string
          opening_balance: number | null
          taken: number | null
          updated_at: string | null
        }
        Insert: {
          accrued?: number | null
          adjustment?: number | null
          closing_balance?: number | null
          created_at?: string | null
          employee_id: string
          id?: string
          leave_period_id: string
          leave_type_id: string
          opening_balance?: number | null
          taken?: number | null
          updated_at?: string | null
        }
        Update: {
          accrued?: number | null
          adjustment?: number | null
          closing_balance?: number | null
          created_at?: string | null
          employee_id?: string
          id?: string
          leave_period_id?: string
          leave_type_id?: string
          opening_balance?: number | null
          taken?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_balances_leave_period_id_fkey"
            columns: ["leave_period_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_group_types: {
        Row: {
          entitlement_override: number | null
          id: string
          leave_group_id: string
          leave_type_id: string
        }
        Insert: {
          entitlement_override?: number | null
          id?: string
          leave_group_id: string
          leave_type_id: string
        }
        Update: {
          entitlement_override?: number | null
          id?: string
          leave_group_id?: string
          leave_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_group_types_leave_group_id_fkey"
            columns: ["leave_group_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_group_types_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_groups: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      hr_leave_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          is_open: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          is_open?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          is_open?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      hr_leave_types: {
        Row: {
          accrual_rate: number | null
          annual_entitlement: number | null
          carry_forward_limit: number | null
          code: string
          created_at: string | null
          default_days: number | null
          gender_restriction: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          max_days_per_request: number | null
          name: string
          requires_approval: boolean | null
        }
        Insert: {
          accrual_rate?: number | null
          annual_entitlement?: number | null
          carry_forward_limit?: number | null
          code: string
          created_at?: string | null
          default_days?: number | null
          gender_restriction?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_days_per_request?: number | null
          name: string
          requires_approval?: boolean | null
        }
        Update: {
          accrual_rate?: number | null
          annual_entitlement?: number | null
          carry_forward_limit?: number | null
          code?: string
          created_at?: string | null
          default_days?: number | null
          gender_restriction?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_days_per_request?: number | null
          name?: string
          requires_approval?: boolean | null
        }
        Relationships: []
      }
      hr_overtime: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          hours: number
          id: string
          overtime_date: string
          reason: string | null
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          hours: number
          id?: string
          overtime_date: string
          reason?: string | null
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          hours?: number
          id?: string
          overtime_date?: string
          reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_overtime_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_performance_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      hr_performance_reviews: {
        Row: {
          areas_for_improvement: string | null
          created_at: string | null
          employee_comments: string | null
          employee_id: string
          finalized_at: string | null
          goals_achieved: string | null
          hr_comments: string | null
          id: string
          overall_rating: number | null
          period_id: string
          rating_scale_id: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string | null
          submitted_at: string | null
          supervisor_comments: string | null
          updated_at: string | null
        }
        Insert: {
          areas_for_improvement?: string | null
          created_at?: string | null
          employee_comments?: string | null
          employee_id: string
          finalized_at?: string | null
          goals_achieved?: string | null
          hr_comments?: string | null
          id?: string
          overall_rating?: number | null
          period_id: string
          rating_scale_id?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          submitted_at?: string | null
          supervisor_comments?: string | null
          updated_at?: string | null
        }
        Update: {
          areas_for_improvement?: string | null
          created_at?: string | null
          employee_comments?: string | null
          employee_id?: string
          finalized_at?: string | null
          goals_achieved?: string | null
          hr_comments?: string | null
          id?: string
          overall_rating?: number | null
          period_id?: string
          rating_scale_id?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          submitted_at?: string | null
          supervisor_comments?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_performance_reviews_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "hr_performance_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_performance_reviews_rating_scale_id_fkey"
            columns: ["rating_scale_id"]
            isOneToOne: false
            referencedRelation: "hr_rating_scales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_ranks: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hr_rating_levels: {
        Row: {
          color: string | null
          description: string | null
          id: string
          label: string
          scale_id: string
          value: number
        }
        Insert: {
          color?: string | null
          description?: string | null
          id?: string
          label: string
          scale_id: string
          value: number
        }
        Update: {
          color?: string | null
          description?: string | null
          id?: string
          label?: string
          scale_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_rating_levels_scale_id_fkey"
            columns: ["scale_id"]
            isOneToOne: false
            referencedRelation: "hr_rating_scales"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_rating_scales: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          max_value: number | null
          min_value: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name?: string
        }
        Relationships: []
      }
      hr_reserved_periods: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          end_date: string
          id: string
          name: string
          reason: string | null
          start_date: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          end_date: string
          id?: string
          name: string
          reason?: string | null
          start_date: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          end_date?: string
          id?: string
          name?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_reserved_periods_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_skill_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      hr_skills: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          skill_type_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          skill_type_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          skill_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_skills_skill_type_id_fkey"
            columns: ["skill_type_id"]
            isOneToOne: false
            referencedRelation: "hr_skill_types"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_toil: {
        Row: {
          created_at: string | null
          earned_date: string
          employee_id: string
          expiry_date: string | null
          hours_earned: number
          hours_used: number | null
          id: string
          source_overtime_id: string | null
        }
        Insert: {
          created_at?: string | null
          earned_date: string
          employee_id: string
          expiry_date?: string | null
          hours_earned: number
          hours_used?: number | null
          id?: string
          source_overtime_id?: string | null
        }
        Update: {
          created_at?: string | null
          earned_date?: string
          employee_id?: string
          expiry_date?: string | null
          hours_earned?: number
          hours_used?: number | null
          id?: string
          source_overtime_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_toil_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_toil_source_overtime_id_fkey"
            columns: ["source_overtime_id"]
            isOneToOne: false
            referencedRelation: "hr_overtime"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_work_weeks: {
        Row: {
          created_at: string | null
          friday: boolean | null
          half_day_saturday: boolean | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          monday: boolean | null
          name: string
          saturday: boolean | null
          sunday: boolean | null
          thursday: boolean | null
          tuesday: boolean | null
          wednesday: boolean | null
        }
        Insert: {
          created_at?: string | null
          friday?: boolean | null
          half_day_saturday?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          monday?: boolean | null
          name: string
          saturday?: boolean | null
          sunday?: boolean | null
          thursday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
        }
        Update: {
          created_at?: string | null
          friday?: boolean | null
          half_day_saturday?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          monday?: boolean | null
          name?: string
          saturday?: boolean | null
          sunday?: boolean | null
          thursday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
        }
        Relationships: []
      }
      imprest_limits: {
        Row: {
          cash_account_id: string | null
          created_at: string | null
          created_by: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          limit_amount: number
        }
        Insert: {
          cash_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          limit_amount: number
        }
        Update: {
          cash_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          limit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "imprest_limits_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          approved_by: string | null
          created_at: string | null
          entry_number: string
          entry_type: string | null
          fiscal_year_id: string | null
          id: string
          narration: string
          posted_at: string | null
          prepared_by: string | null
          reference: string | null
          status: string | null
          total_credit: number
          total_debit: number
          transaction_date: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          entry_number: string
          entry_type?: string | null
          fiscal_year_id?: string | null
          id?: string
          narration: string
          posted_at?: string | null
          prepared_by?: string | null
          reference?: string | null
          status?: string | null
          total_credit?: number
          total_debit?: number
          transaction_date: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          entry_number?: string
          entry_type?: string | null
          fiscal_year_id?: string | null
          id?: string
          narration?: string
          posted_at?: string | null
          prepared_by?: string | null
          reference?: string | null
          status?: string | null
          total_credit?: number
          total_debit?: number
          transaction_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_entry_id: string | null
          student_id: string | null
          vendor_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          student_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          student_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quizzes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          max_attempts: number | null
          passing_score: number | null
          resource_id: string
          time_limit_minutes: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          max_attempts?: number | null
          passing_score?: number | null
          resource_id: string
          time_limit_minutes?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          max_attempts?: number | null
          passing_score?: number | null
          resource_id?: string
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quizzes_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "course_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_courses: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          enrollment_key: string | null
          enrollment_type: string | null
          id: string
          is_public: boolean | null
          max_students: number | null
          short_description: string | null
          start_date: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_key?: string | null
          enrollment_type?: string | null
          id?: string
          is_public?: boolean | null
          max_students?: number | null
          short_description?: string | null
          start_date?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_key?: string | null
          enrollment_type?: string | null
          id?: string
          is_public?: boolean | null
          max_students?: number | null
          short_description?: string | null
          start_date?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          enrolled_at: string | null
          id: string
          progress_percent: number | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          progress_percent?: number | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          progress_percent?: number | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      online_classes: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      payable_items: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string
          id: string
          payable_id: string | null
          quantity: number | null
          tax_amount: number | null
          tax_type_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          payable_id?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_type_id?: string | null
          total: number
          unit_price: number
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          payable_id?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_type_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "payable_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payable_items_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payable_items_tax_type_id_fkey"
            columns: ["tax_type_id"]
            isOneToOne: false
            referencedRelation: "tax_types"
            referencedColumns: ["id"]
          },
        ]
      }
      payable_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          cash_account_id: string | null
          created_at: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          paid_by: string | null
          payable_id: string | null
          payment_date: string
          payment_mode_id: string | null
          payment_number: string
          reference_number: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cash_account_id?: string | null
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_by?: string | null
          payable_id?: string | null
          payment_date: string
          payment_mode_id?: string | null
          payment_number: string
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cash_account_id?: string | null
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_by?: string | null
          payable_id?: string | null
          payment_date?: string
          payment_mode_id?: string | null
          payment_number?: string
          reference_number?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payable_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payable_payments_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payable_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payable_payments_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payable_payments_payment_mode_id_fkey"
            columns: ["payment_mode_id"]
            isOneToOne: false
            referencedRelation: "payment_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payable_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount_paid: number | null
          balance_due: number
          bill_date: string
          bill_number: string
          created_at: string | null
          created_by: string | null
          due_date: string | null
          fiscal_year_id: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number
          bill_date: string
          bill_number: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          fiscal_year_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number
          bill_date?: string
          bill_number?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          fiscal_year_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payables_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_modes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      poe_assignments: {
        Row: {
          allowed_file_types: string[] | null
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          grading_scale_id: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          max_file_size_mb: number | null
          max_files: number | null
          max_score: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allowed_file_types?: string[] | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          grading_scale_id?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_file_size_mb?: number | null
          max_files?: number | null
          max_score?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allowed_file_types?: string[] | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          grading_scale_id?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          max_file_size_mb?: number | null
          max_files?: number | null
          max_score?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poe_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poe_assignments_grading_scale_id_fkey"
            columns: ["grading_scale_id"]
            isOneToOne: false
            referencedRelation: "grading_scales"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_submission_files: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          submission_id: string
          uploaded_at: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          submission_id: string
          uploaded_at?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          submission_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poe_submission_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "poe_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      poe_submissions: {
        Row: {
          assignment_id: string
          created_at: string | null
          feedback: string | null
          grade_label: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          revision_notes: string | null
          score: number | null
          status: string
          submission_text: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          feedback?: string | null
          grade_label?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          score?: number | null
          status?: string
          submission_text?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          feedback?: string | null
          grade_label?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          score?: number | null
          status?: string
          submission_text?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poe_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "poe_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string | null
          id: string
          passed: boolean
          quiz_id: string
          score: number
          started_at: string | null
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          started_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lesson_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          id: string
          options: Json | null
          points: number | null
          question_text: string
          question_type: string
          quiz_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text: string
          question_type: string
          quiz_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lesson_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          resource_id: string
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          resource_id: string
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          resource_id?: string
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_progress_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "course_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at: string | null
          created_by: string | null
          id: string
          is_allowed: boolean | null
          module_code: string
          role_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_allowed?: boolean | null
          module_code: string
          role_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_allowed?: boolean | null
          module_code?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          academic_year_id: string
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          session_type_id: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          academic_year_id: string
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          session_type_id?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          session_type_id?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_session_type_id_fkey"
            columns: ["session_type_id"]
            isOneToOne: false
            referencedRelation: "session_types"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_settings: {
        Row: {
          created_at: string
          created_by: string | null
          encryption: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_active: boolean
          password: string
          port: number
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          encryption?: string
          from_email: string
          from_name: string
          host: string
          id?: string
          is_active?: boolean
          password: string
          port?: number
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          encryption?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      student_attendance: {
        Row: {
          attendance_date: string
          class_id: string | null
          created_at: string | null
          id: string
          marked_by: string | null
          remarks: string | null
          status: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_date: string
          class_id?: string | null
          created_at?: string | null
          id?: string
          marked_by?: string | null
          remarks?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_date?: string
          class_id?: string | null
          created_at?: string | null
          id?: string
          marked_by?: string | null
          remarks?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_ledger: {
        Row: {
          account_id: string | null
          balance: number | null
          created_at: string | null
          id: string
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          balance?: number | null
          created_at?: string | null
          id?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          balance?: number | null
          created_at?: string | null
          id?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          birth_cert_no: string | null
          birth_date: string
          class: string | null
          class_id: string | null
          county: string
          created_at: string | null
          created_by: string | null
          email: string | null
          financial_aid: string | null
          gender: string
          id: string
          kcpe_grade: string | null
          kcpe_index: string | null
          kcpe_year: number | null
          kcse_grade: string | null
          kcse_index: string | null
          kcse_year: number | null
          nationality: string
          other_name: string
          phone: string
          physical_address: string | null
          postal_address: string | null
          religion: string | null
          sports_house: string | null
          status: string | null
          stay_status: string | null
          stream: string | null
          student_no: string | null
          student_source: string | null
          student_type_id: string | null
          sub_county: string | null
          surname: string
          updated_at: string | null
          upi_number: string | null
          user_id: string | null
        }
        Insert: {
          birth_cert_no?: string | null
          birth_date: string
          class?: string | null
          class_id?: string | null
          county: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          financial_aid?: string | null
          gender: string
          id?: string
          kcpe_grade?: string | null
          kcpe_index?: string | null
          kcpe_year?: number | null
          kcse_grade?: string | null
          kcse_index?: string | null
          kcse_year?: number | null
          nationality: string
          other_name: string
          phone: string
          physical_address?: string | null
          postal_address?: string | null
          religion?: string | null
          sports_house?: string | null
          status?: string | null
          stay_status?: string | null
          stream?: string | null
          student_no?: string | null
          student_source?: string | null
          student_type_id?: string | null
          sub_county?: string | null
          surname: string
          updated_at?: string | null
          upi_number?: string | null
          user_id?: string | null
        }
        Update: {
          birth_cert_no?: string | null
          birth_date?: string
          class?: string | null
          class_id?: string | null
          county?: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          financial_aid?: string | null
          gender?: string
          id?: string
          kcpe_grade?: string | null
          kcpe_index?: string | null
          kcpe_year?: number | null
          kcse_grade?: string | null
          kcse_index?: string | null
          kcse_year?: number | null
          nationality?: string
          other_name?: string
          phone?: string
          physical_address?: string | null
          postal_address?: string | null
          religion?: string | null
          sports_house?: string | null
          status?: string | null
          stay_status?: string | null
          stream?: string | null
          student_no?: string | null
          student_source?: string | null
          student_type_id?: string | null
          sub_county?: string | null
          surname?: string
          updated_at?: string | null
          upi_number?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_student_type_id_fkey"
            columns: ["student_type_id"]
            isOneToOne: false
            referencedRelation: "student_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          rate: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rate: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rate?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          app_role_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          app_role_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          app_role_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_app_role_id_fkey"
            columns: ["app_role_id"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          tax_id: string | null
          updated_at: string | null
          vendor_type_id: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vendor_type_id?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vendor_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_vendor_type_id_fkey"
            columns: ["vendor_type_id"]
            isOneToOne: false
            referencedRelation: "vendor_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_certificate_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_journal_number: { Args: never; Returns: string }
      generate_receipt_number: { Args: never; Returns: string }
      get_user_app_role: { Args: { _user_id: string }; Returns: string }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          action: Database["public"]["Enums"]["permission_action"]
          module_code: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_enrolled_course_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      user_has_permission: {
        Args: {
          _action: Database["public"]["Enums"]["permission_action"]
          _module_code: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      employment_status:
        | "active"
        | "probation"
        | "confirmed"
        | "suspended"
        | "resigned"
        | "terminated"
        | "retired"
        | "deceased"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      permission_action: "view" | "add" | "edit" | "delete" | "change_status"
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
      app_role: ["admin", "teacher", "student"],
      employment_status: [
        "active",
        "probation",
        "confirmed",
        "suspended",
        "resigned",
        "terminated",
        "retired",
        "deceased",
      ],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      permission_action: ["view", "add", "edit", "delete", "change_status"],
    },
  },
} as const
