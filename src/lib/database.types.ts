export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: number
          name: string
          phone: string
          zip_code: string | null
          road_address: string | null
          jibun_address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          phone: string
          zip_code?: string | null
          road_address?: string | null
          jibun_address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          phone?: string
          zip_code?: string | null
          road_address?: string | null
          jibun_address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      equipment: {
        Row: {
          id: number
          customer_id: number
          equipment_type: string
          manufacturer: string
          model: string
          year: number | null
          serial_number: string | null
          engine_type: string | null
          horsepower: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_id: number
          equipment_type: string
          manufacturer: string
          model: string
          year?: number | null
          serial_number?: string | null
          engine_type?: string | null
          horsepower?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_id?: number
          equipment_type?: string
          manufacturer?: string
          model?: string
          year?: number | null
          serial_number?: string | null
          engine_type?: string | null
          horsepower?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      work_records: {
        Row: {
          id: number
          customer_id: number
          equipment_id: number | null
          work_type: string
          ecu_model: string | null
          connection_method: string | null
          tools_used: string[] | null
          work_description: string | null
          price: number | null
          status: string
          work_date: string
          files: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_id: number
          equipment_id?: number | null
          work_type: string
          ecu_model?: string | null
          connection_method?: string | null
          tools_used?: string[] | null
          work_description?: string | null
          price?: number | null
          status?: string
          work_date: string
          files?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_id?: number
          equipment_id?: number | null
          work_type?: string
          ecu_model?: string | null
          connection_method?: string | null
          tools_used?: string[] | null
          work_description?: string | null
          price?: number | null
          status?: string
          work_date?: string
          files?: any | null
          created_at?: string
          updated_at?: string
        }
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
  }
} 