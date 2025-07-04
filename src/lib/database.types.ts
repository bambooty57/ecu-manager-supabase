export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string
          id: number
          name: string
          phone: string
          zip_code: string | null
          road_address: string | null
          jibun_address: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          phone: string
          zip_code?: string | null
          road_address?: string | null
          jibun_address?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          phone?: string
          zip_code?: string | null
          road_address?: string | null
          jibun_address?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          acu_type: string | null
          created_at: string | null
          customer_id: number | null
          ecu_type: string | null
          engine_type: string | null
          equipment_type: string
          horsepower: number | null
          id: number
          manufacturer: string
          model: string
          notes: string | null
          serial_number: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          acu_type?: string | null
          created_at?: string | null
          customer_id?: number | null
          ecu_type?: string | null
          engine_type?: string | null
          equipment_type: string
          horsepower?: number | null
          id?: number
          manufacturer: string
          model: string
          notes?: string | null
          serial_number?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          acu_type?: string | null
          created_at?: string | null
          customer_id?: number | null
          ecu_type?: string | null
          engine_type?: string | null
          equipment_type?: string
          horsepower?: number | null
          id?: number
          manufacturer?: string
          model?: string
          notes?: string | null
          serial_number?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_models: {
        Row: {
          created_at: string | null
          id: number
          manufacturer: string
          model: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          manufacturer: string
          model: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          manufacturer?: string
          model?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      file_metadata: {
        Row: {
          bucket_name: string
          category: string
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number
          file_type: string
          id: number
          storage_path: string
          storage_url: string
          updated_at: string | null
          uploaded_at: string | null
          work_record_id: number
        }
        Insert: {
          bucket_name: string
          category: string
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: number
          storage_path: string
          storage_url: string
          updated_at?: string | null
          uploaded_at?: string | null
          work_record_id: number
        }
        Update: {
          bucket_name?: string
          category?: string
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: number
          storage_path?: string
          storage_url?: string
          updated_at?: string | null
          uploaded_at?: string | null
          work_record_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_metadata_work_record_id_fkey"
            columns: ["work_record_id"]
            isOneToOne: false
            referencedRelation: "work_records"
            referencedColumns: ["id"]
          }
        ]
      }
      user_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          id: number
          role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          id?: number
          role?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          id?: number
          role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      work_records: {
        Row: {
          acu_manufacturer: string | null
          acu_model: string | null
          acu_type: string | null
          connection_method: string | null
          created_at: string | null
          customer_id: number | null
          ecu_maker: string | null
          ecu_model: string | null
          equipment_id: number | null
          files: Json | null
          id: number
          price: number | null
          remapping_works: Json | null
          status: string | null
          tools_used: string[] | null
          total_price: number | null
          updated_at: string | null
          work_date: string
          work_description: string | null
          work_type: string
        }
        Insert: {
          acu_manufacturer?: string | null
          acu_model?: string | null
          acu_type?: string | null
          connection_method?: string | null
          created_at?: string | null
          customer_id?: number | null
          ecu_maker?: string | null
          ecu_model?: string | null
          equipment_id?: number | null
          files?: Json | null
          id?: number
          price?: number | null
          remapping_works?: Json | null
          status?: string | null
          tools_used?: string[] | null
          total_price?: number | null
          updated_at?: string | null
          work_date: string
          work_description?: string | null
          work_type: string
        }
        Update: {
          acu_manufacturer?: string | null
          acu_model?: string | null
          acu_type?: string | null
          connection_method?: string | null
          created_at?: string | null
          customer_id?: number | null
          ecu_maker?: string | null
          ecu_model?: string | null
          equipment_id?: number | null
          files?: Json | null
          id?: number
          price?: number | null
          remapping_works?: Json | null
          status?: string | null
          tools_used?: string[] | null
          total_price?: number | null
          updated_at?: string | null
          work_date?: string
          work_description?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_records_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
