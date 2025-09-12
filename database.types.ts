export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          name: string
          type: 'api' | 'mcp' | 'webhook' | 'local' | 'internal'
          status: 'online' | 'offline' | 'connecting' | 'error' | 'active' | 'inactive'
          endpoint: string | null
          api_key: string | null
          capabilities: string[]
          description: string
          model: string | null
          provider: string | null
          config: Json
          created_at: string
          updated_at: string
          last_seen: string | null
          stats: Json
        }
        Insert: {
          id: string
          name: string
          type: 'api' | 'mcp' | 'webhook' | 'local' | 'internal'
          status?: 'online' | 'offline' | 'connecting' | 'error' | 'active' | 'inactive'
          endpoint?: string | null
          api_key?: string | null
          capabilities?: string[]
          description: string
          model?: string | null
          provider?: string | null
          config?: Json
          created_at?: string
          updated_at?: string
          last_seen?: string | null
          stats?: Json
        }
        Update: {
          id?: string
          name?: string
          type?: 'api' | 'mcp' | 'webhook' | 'local' | 'internal'
          status?: 'online' | 'offline' | 'connecting' | 'error' | 'active' | 'inactive'
          endpoint?: string | null
          api_key?: string | null
          capabilities?: string[]
          description?: string
          model?: string | null
          provider?: string | null
          config?: Json
          created_at?: string
          updated_at?: string
          last_seen?: string | null
          stats?: Json
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string
          status: 'active' | 'paused' | 'completed' | 'archived'
          created_at: string
          updated_at: string
          assigned_agents: string[]
          settings: Json
        }
        Insert: {
          id: string
          name: string
          description: string
          status?: 'active' | 'paused' | 'completed' | 'archived'
          created_at?: string
          updated_at?: string
          assigned_agents?: string[]
          settings?: Json
        }
        Update: {
          id?: string
          name?: string
          description?: string
          status?: 'active' | 'paused' | 'completed' | 'archived'
          created_at?: string
          updated_at?: string
          assigned_agents?: string[]
          settings?: Json
        }
      }
      form_submissions: {
        Row: {
          id: string
          url: string
          status: 'pending' | 'running' | 'completed' | 'failed'
          progress: number
          fields_count: number
          timestamp: string
          agent_id: string | null
          results: Json
          custom_data: string | null
          error_message: string | null
        }
        Insert: {
          id: string
          url: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          progress?: number
          fields_count?: number
          timestamp?: string
          agent_id?: string | null
          results?: Json
          custom_data?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          url?: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          progress?: number
          fields_count?: number
          timestamp?: string
          agent_id?: string | null
          results?: Json
          custom_data?: string | null
          error_message?: string | null
        }
      }
      task_executions: {
        Row: {
          id: string
          project_id: string | null
          agent_id: string | null
          task_name: string
          status: 'pending' | 'running' | 'completed' | 'failed'
          created_at: string
          completed_at: string | null
          results: Json
          error_message: string | null
        }
        Insert: {
          id: string
          project_id?: string | null
          agent_id?: string | null
          task_name: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          created_at?: string
          completed_at?: string | null
          results?: Json
          error_message?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          agent_id?: string | null
          task_name?: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          created_at?: string
          completed_at?: string | null
          results?: Json
          error_message?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          name: string
          browser_type: string
          status: 'pending' | 'active' | 'inactive' | 'completed' | 'failed'
          user_id: string | null
          configuration: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          browser_type?: string
          status?: 'pending' | 'active' | 'inactive' | 'completed' | 'failed'
          user_id?: string | null
          configuration?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          browser_type?: string
          status?: 'pending' | 'active' | 'inactive' | 'completed' | 'failed'
          user_id?: string | null
          configuration?: Json
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          name: string | null
          type: string
          status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          description: string | null
          configuration: Json
          session_id: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          type?: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          description?: string | null
          configuration?: Json
          session_id?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          type?: string
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          description?: string | null
          configuration?: Json
          session_id?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      scripts: {
        Row: {
          id: string
          name: string
          content: string
          language: string
          description: string | null
          status: 'draft' | 'active' | 'archived'
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          content: string
          language?: string
          description?: string | null
          status?: 'draft' | 'active' | 'archived'
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          content?: string
          language?: string
          description?: string | null
          status?: 'draft' | 'active' | 'archived'
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      crm_lists: {
        Row: {
          id: string
          name: string
          type: string
          description: string | null
          status: 'active' | 'inactive' | 'archived'
          contacts_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          type: string
          description?: string | null
          status?: 'active' | 'inactive' | 'archived'
          contacts_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          description?: string | null
          status?: 'active' | 'inactive' | 'archived'
          contacts_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          domain: string | null
          industry: string | null
          size: string | null
          location: string | null
          description: string | null
          website: string | null
          linkedin: string | null
          status: 'active' | 'inactive' | 'prospect'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          domain?: string | null
          industry?: string | null
          size?: string | null
          location?: string | null
          description?: string | null
          website?: string | null
          linkedin?: string | null
          status?: 'active' | 'inactive' | 'prospect'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          industry?: string | null
          size?: string | null
          location?: string | null
          description?: string | null
          website?: string | null
          linkedin?: string | null
          status?: 'active' | 'inactive' | 'prospect'
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          company_id: string | null
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          title: string | null
          department: string | null
          linkedin: string | null
          notes: string | null
          status: 'active' | 'inactive' | 'prospect'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          title?: string | null
          department?: string | null
          linkedin?: string | null
          notes?: string | null
          status?: 'active' | 'inactive' | 'prospect'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          title?: string | null
          department?: string | null
          linkedin?: string | null
          notes?: string | null
          status?: 'active' | 'inactive' | 'prospect'
          created_at?: string
          updated_at?: string
        }
      }
      unified_events: {
        Row: {
          id: string
          type: string
          source: string
          data: Json
          timestamp: string
          session_id: string | null
          user_id: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
        }
        Insert: {
          id: string
          type: string
          source: string
          data?: Json
          timestamp?: string
          session_id?: string | null
          user_id?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
        }
        Update: {
          id?: string
          type?: string
          source?: string
          data?: Json
          timestamp?: string
          session_id?: string | null
          user_id?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
        }
      }
      agent_connections: {
        Row: {
          id: string
          name: string
          type: string
          endpoint: string
          configuration: Json
          status: 'active' | 'inactive'
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          type: string
          endpoint: string
          configuration?: Json
          status?: 'active' | 'inactive'
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          endpoint?: string
          configuration?: Json
          status?: 'active' | 'inactive'
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      computer_use_tasks: {
        Row: {
          id: string
          type: string
          description: string
          status: 'pending' | 'running' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          type: string
          description: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          description?: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          username: string
          password: string | null
          api_key: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          password?: string | null
          api_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          password?: string | null
          api_key?: string | null
          created_at?: string
        }
      }
      metrics: {
        Row: {
          id: string
          user_id: string | null
          sessions_created: number
          tasks_completed: number
          last_activity: string
        }
        Insert: {
          id: string
          user_id?: string | null
          sessions_created?: number
          tasks_completed?: number
          last_activity?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          sessions_created?: number
          tasks_completed?: number
          last_activity?: string
        }
      }
      field_mappings: {
        Row: {
          id: string
          user_id: string | null
          source_field: string
          target_field: string
          transformation: string | null
        }
        Insert: {
          id: string
          user_id?: string | null
          source_field: string
          target_field: string
          transformation?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          source_field?: string
          target_field?: string
          transformation?: string | null
        }
      }
    }
    Views: {
      database_types: {
        Row: {
          table_name: string | null
          columns: Json | null
        }
      }
    }
    Functions: {
      handle_updated_at: {
        Args: {}
        Returns: unknown
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}