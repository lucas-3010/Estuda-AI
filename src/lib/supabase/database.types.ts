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
        };
        Insert: {
          id?: string;
          user_id?: string;
          topic: string;
          level: string;
          context?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          level?: string;
          context?: string | null;
          created_at?: string;
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
        };
        Insert: {
          id?: string;
          user_id?: string;
          plan_id: string;
          position: number;
          title: string;
          goal: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          position?: number;
          title?: string;
          goal?: string;
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
        };
        Insert: {
          user_id: string;
          new_cards_per_day?: number;
          desired_retention?: number;
        };
        Update: {
          user_id?: string;
          new_cards_per_day?: number;
          desired_retention?: number;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      record_review: {
        Args: { p_card_id: string; p_rating: number; p_next: Json };
        Returns: undefined;
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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type CardRow = Tables<"cards">;
