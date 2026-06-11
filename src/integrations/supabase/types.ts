export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      plant_notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          plant_id: string | null;
          read: boolean;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          plant_id?: string | null;
          read?: boolean;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          plant_id?: string | null;
          read?: boolean;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plant_notifications_plant_id_fkey";
            columns: ["plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plant_notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "plant_users";
            referencedColumns: ["id"];
          },
        ];
      };
      plant_users: {
        Row: {
          auth_user_id: string | null;
          avatar_color: string;
          created_at: string;
          discord_display_name: string | null;
          discord_user_id: string | null;
          email: string | null;
          id: string;
          is_available: boolean;
          name: string;
          rotation_order: number;
        };
        Insert: {
          auth_user_id?: string | null;
          avatar_color?: string;
          created_at?: string;
          discord_display_name?: string | null;
          discord_user_id?: string | null;
          email?: string | null;
          id?: string;
          is_available?: boolean;
          name: string;
          rotation_order: number;
        };
        Update: {
          auth_user_id?: string | null;
          avatar_color?: string;
          created_at?: string;
          discord_display_name?: string | null;
          discord_user_id?: string | null;
          email?: string | null;
          id?: string;
          is_available?: boolean;
          name?: string;
          rotation_order?: number;
        };
        Relationships: [];
      };
      plants: {
        Row: {
          assigned_user_id: string | null;
          created_at: string;
          id: string;
          image_url: string;
          last_watered_by_user_id: string | null;
          last_watered_date: string | null;
          location: string | null;
          moisture_status: Database["public"]["Enums"]["moisture_status"];
          name: string;
          next_watering_date: string;
          notes: string | null;
          overdue_since: string | null;
          watering_interval_days: number;
        };
        Insert: {
          assigned_user_id?: string | null;
          created_at?: string;
          id?: string;
          image_url: string;
          last_watered_by_user_id?: string | null;
          last_watered_date?: string | null;
          location?: string | null;
          moisture_status?: Database["public"]["Enums"]["moisture_status"];
          name: string;
          next_watering_date?: string;
          notes?: string | null;
          overdue_since?: string | null;
          watering_interval_days?: number;
        };
        Update: {
          assigned_user_id?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string;
          last_watered_by_user_id?: string | null;
          last_watered_date?: string | null;
          location?: string | null;
          moisture_status?: Database["public"]["Enums"]["moisture_status"];
          name?: string;
          next_watering_date?: string;
          notes?: string | null;
          overdue_since?: string | null;
          watering_interval_days?: number;
        };
        Relationships: [
          {
            foreignKeyName: "plants_assigned_user_id_fkey";
            columns: ["assigned_user_id"];
            isOneToOne: false;
            referencedRelation: "plant_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plants_last_watered_by_user_id_fkey";
            columns: ["last_watered_by_user_id"];
            isOneToOne: false;
            referencedRelation: "plant_users";
            referencedColumns: ["id"];
          },
        ];
      };
      watering_events: {
        Row: {
          action: Database["public"]["Enums"]["watering_action"];
          created_at: string;
          id: string;
          note: string | null;
          plant_id: string;
          user_id: string | null;
        };
        Insert: {
          action: Database["public"]["Enums"]["watering_action"];
          created_at?: string;
          id?: string;
          note?: string | null;
          plant_id: string;
          user_id?: string | null;
        };
        Update: {
          action?: Database["public"]["Enums"]["watering_action"];
          created_at?: string;
          id?: string;
          note?: string | null;
          plant_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "watering_events_plant_id_fkey";
            columns: ["plant_id"];
            isOneToOne: false;
            referencedRelation: "plants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watering_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "plant_users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_plant_user_id: { Args: never; Returns: string };
    };
    Enums: {
      moisture_status: "dry" | "ok" | "moist";
      notification_type: "your_turn" | "overdue" | "reassigned";
      watering_action: "watered" | "pushed_back" | "reassigned" | "created";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      moisture_status: ["dry", "ok", "moist"],
      notification_type: ["your_turn", "overdue", "reassigned"],
      watering_action: ["watered", "pushed_back", "reassigned", "created"],
    },
  },
} as const;
