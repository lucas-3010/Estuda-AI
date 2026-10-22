// Tipos do banco no formato de `supabase gen types typescript`.
// Regenerar com: npx supabase gen types typescript --local > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      study_plans: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          level: string;
          context: string | null;
          created_at: string;
          share_token: string | null;
          exam_date: string | null;
          kind: string;
          cutoff: number | null;
          cutoff_note: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          topic: string;
          level: string;
          context?: string | null;
          created_at?: string;
          share_token?: string | null;
          exam_date?: string | null;
          kind?: string;
          cutoff?: number | null;
          cutoff_note?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          level?: string;
          context?: string | null;
          created_at?: string;
          share_token?: string | null;
          exam_date?: string | null;
          kind?: string;
          cutoff?: number | null;
          cutoff_note?: string | null;
        };
        Relationships: [];
      };
      plan_steps: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          position: number;
          title: string;
          goal: string;
          kind: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          plan_id: string;
          position: number;
          title: string;
          goal: string;
          kind?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          position?: number;
          title?: string;
          goal?: string;
          kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_steps_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "study_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      cards: {
        Row: {
          id: string;
          user_id: string;
          step_id: string | null;
          front: string;
          back: string;
          created_at: string;
          updated_at: string;
          due: string;
          stability: number;
          difficulty: number;
          elapsed_days: number;
          scheduled_days: number;
          learning_steps: number;
          reps: number;
          lapses: number;
          state: number;
          last_review: string | null;
          origin: string | null;
          topic: string | null;
          law_ref: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          step_id?: string | null;
          front: string;
          back: string;
          created_at?: string;
          updated_at?: string;
          due?: string;
          stability?: number;
          difficulty?: number;
          elapsed_days?: number;
          scheduled_days?: number;
          learning_steps?: number;
          reps?: number;
          lapses?: number;
          state?: number;
          last_review?: string | null;
          origin?: string | null;
          topic?: string | null;
          law_ref?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          step_id?: string | null;
          front?: string;
          back?: string;
          created_at?: string;
          updated_at?: string;
          due?: string;
          stability?: number;
          difficulty?: number;
          elapsed_days?: number;
          scheduled_days?: number;
          learning_steps?: number;
          reps?: number;
          lapses?: number;
          state?: number;
          last_review?: string | null;
          origin?: string | null;
          topic?: string | null;
          law_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cards_step_id_fkey";
            columns: ["step_id"];
            isOneToOne: false;
            referencedRelation: "plan_steps";
            referencedColumns: ["id"];
          },
        ];
      };
      review_logs: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          rating: number;
          state: number;
          due: string;
          stability: number;
          difficulty: number;
          elapsed_days: number;
          scheduled_days: number;
          reviewed_at: string;
          confident: boolean | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          card_id: string;
          rating: number;
          state: number;
          due: string;
          stability: number;
          difficulty: number;
          elapsed_days: number;
          scheduled_days: number;
          reviewed_at?: string;
          confident?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          rating?: number;
          state?: number;
          due?: string;
          stability?: number;
          difficulty?: number;
          elapsed_days?: number;
          scheduled_days?: number;
          reviewed_at?: string;
          confident?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "review_logs_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          user_id: string;
          new_cards_per_day: number;
          desired_retention: number;
          daily_goal: number;
          time_zone: string;
          email_reminders: boolean;
          onboarded_at: string | null;
          study_minutes: number[] | null;
        };
        Insert: {
          user_id: string;
          new_cards_per_day?: number;
          desired_retention?: number;
          daily_goal?: number;
          time_zone?: string;
          email_reminders?: boolean;
          onboarded_at?: string | null;
          study_minutes?: number[] | null;
        };
        Update: {
          user_id?: string;
          new_cards_per_day?: number;
          desired_retention?: number;
          daily_goal?: number;
          time_zone?: string;
          email_reminders?: boolean;
          onboarded_at?: string | null;
          study_minutes?: number[] | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          plan: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_end: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: { id: number; user_id: string; kind: string; created_at: string };
        Insert: { id?: never; user_id: string; kind: string; created_at?: string };
        Update: { id?: never; user_id?: string; kind?: string; created_at?: string };
        Relationships: [];
      };
      answer_checks: {
        Row: { id: number; user_id: string; created_at: string };
        Insert: { id?: never; user_id: string; created_at?: string };
        Update: { id?: never; user_id?: string; created_at?: string };
        Relationships: [];
      };
      practice_exams: {
        Row: { id: string; user_id: string; title: string; questions: Json; created_at: string };
        Insert: { id?: string; user_id?: string; title: string; questions: Json; created_at?: string };
        Update: { id?: string; user_id?: string; title?: string; questions?: Json; created_at?: string };
        Relationships: [];
      };
      edital_watches: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          created_at: string;
          checked_at: string | null;
          found_title: string | null;
          found_url: string | null;
          found_at: string | null;
          seen_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          query: string;
          created_at?: string;
          checked_at?: string | null;
          found_title?: string | null;
          found_url?: string | null;
          found_at?: string | null;
          seen_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          query?: string;
          created_at?: string;
          checked_at?: string | null;
          found_title?: string | null;
          found_url?: string | null;
          found_at?: string | null;
          seen_at?: string | null;
        };
        Relationships: [];
      };
      editais: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string | null;
          title: string;
          banca: string | null;
          disciplines: Json;
          generated: number[];
          attempts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id?: string | null;
          title: string;
          banca?: string | null;
          disciplines: Json;
          generated?: number[];
          attempts?: number;
          created_at?: string;
        };
        Update: {
          plan_id?: string | null;
          title?: string;
          banca?: string | null;
          disciplines?: Json;
        };
        Relationships: [];
      };
      law_articles: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          source_url: string | null;
          law_name: string;
          article: string;
          snapshot: string;
          text_hash: string;
          current_snapshot: string | null;
          changed_at: string | null;
          checked_at: string | null;
        };
        Insert: {
          plan_id: string;
          source_url?: string | null;
          law_name: string;
          article: string;
          snapshot: string;
        };
        Update: {
          current_snapshot?: string | null;
          changed_at?: string | null;
          checked_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      shared_plan: {
        Args: { p_token: string };
        Returns: Json;
      };
      copy_shared_plan: {
        Args: { p_token: string };
        Returns: string;
      };
      weak_steps: {
        Args: { p_days: number };
        Returns: {
          step_id: string;
          plan_id: string;
          topic: string;
          level: string;
          title: string;
          goal: string;
          reviews: number;
          misses: number;
        }[];
      };
      save_plan: {
        Args: { p_topic: string; p_level: string; p_context: string | null; p_steps: Json };
        Returns: string;
      };
      record_review: {
        Args: { p_card_id: string; p_rating: number; p_next: Json; p_confident?: boolean | null };
        Returns: undefined;
      };
      confidence_stats: {
        Args: { p_days: number };
        Returns: { sure_total: number; sure_correct: number; guess_total: number; guess_correct: number }[];
      };
      review_stats: {
        Args: { p_days: number; p_tz: string };
        Returns: { day: string; reviews: number; correct: number }[];
      };
      due_forecast: {
        Args: { p_days: number; p_tz: string };
        Returns: { day: string; due_count: number }[];
      };
      new_cards_studied_today: {
        Args: { p_tz: string };
        Returns: number;
      };
      claim_generation: {
        Args: { p_user: string; p_kind: string; p_limit: number };
        Returns: { usage_id: number; used: number }[];
      };
      refund_generation: {
        Args: { p_usage_id: number };
        Returns: undefined;
      };
      claim_answer_check: {
        Args: { p_user: string; p_limit: number };
        Returns: { check_id: number; used: number }[];
      };
      refund_answer_check: {
        Args: { p_check_id: number };
        Returns: undefined;
      };
      study_streak: {
        Args: { p_tz: string };
        Returns: { current_streak: number; best_streak: number; reviews_today: number }[];
      };
      add_mistake: {
        Args: { p_plan_id: string | null; p_front: string; p_back: string };
        Returns: string;
      };
      create_edital_plan: {
        Args: { p_edital_id: string; p_disciplines: Json; p_exam_date: string | null };
        Returns: string;
      };
      claim_edital_step: {
        Args: { p_user: string; p_edital_id: string; p_index: number };
        Returns: {
          plan_id: string;
          step_id: string;
          title: string;
          banca: string | null;
          discipline: Json;
          discipline_count: number;
          plan_created_at: string;
        }[];
      };
      release_edital_step: {
        Args: { p_edital_id: string; p_index: number };
        Returns: undefined;
      };
      acknowledge_law_change: {
        Args: { p_id: string };
        Returns: undefined;
      };
      reminder_candidates: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          email: string;
          plan: string;
          time_zone: string;
          due_today: number;
          generations_used: number;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type CardRow = Tables<"cards">;
