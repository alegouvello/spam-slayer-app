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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cleanup_history: {
        Row: {
          ai_reasoning: string | null
          deleted: boolean | null
          email_id: string
          id: string
          processed_at: string
          sender: string | null
          spam_confidence: string | null
          subject: string | null
          unsubscribe_method: string | null
          unsubscribe_status: string | null
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          deleted?: boolean | null
          email_id: string
          id?: string
          processed_at?: string
          sender?: string | null
          spam_confidence?: string | null
          subject?: string | null
          unsubscribe_method?: string | null
          unsubscribe_status?: string | null
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          deleted?: boolean | null
          email_id?: string
          id?: string
          processed_at?: string
          sender?: string | null
          spam_confidence?: string | null
          subject?: string | null
          unsubscribe_method?: string | null
          unsubscribe_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cleanup_runs: {
        Row: {
          created_at: string
          emails_deleted: number
          emails_scanned: number
          emails_unsubscribed: number
          id: string
          is_dismissed: boolean
          run_at: string
          top_senders: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emails_deleted?: number
          emails_scanned?: number
          emails_unsubscribed?: number
          id?: string
          is_dismissed?: boolean
          run_at?: string
          top_senders?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          emails_deleted?: number
          emails_scanned?: number
          emails_unsubscribed?: number
          id?: string
          is_dismissed?: boolean
          run_at?: string
          top_senders?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      gmail_accounts: {
        Row: {
          created_at: string
          gmail_access_token: string | null
          gmail_email: string
          gmail_refresh_token: string | null
          gmail_token_expires_at: string | null
          id: string
          is_primary: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gmail_access_token?: string | null
          gmail_email: string
          gmail_refresh_token?: string | null
          gmail_token_expires_at?: string | null
          id?: string
          is_primary?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gmail_access_token?: string | null
          gmail_email?: string
          gmail_refresh_token?: string | null
          gmail_token_expires_at?: string | null
          id?: string
          is_primary?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_cleanup: {
        Row: {
          auto_approve: boolean | null
          created_at: string
          frequency: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_approve?: boolean | null
          created_at?: string
          frequency: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_approve?: boolean | null
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sender_feedback: {
        Row: {
          created_at: string
          feedback_count: number
          id: string
          marked_as_spam: boolean
          sender_email: string
          sender_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_count?: number
          id?: string
          marked_as_spam?: boolean
          sender_email: string
          sender_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_count?: number
          id?: string
          marked_as_spam?: boolean
          sender_email?: string
          sender_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
