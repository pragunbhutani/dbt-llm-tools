export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      organisations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organisations_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      organisation_members: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organisation_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      organisation_settings: {
        Row: {
          id: string;
          organisation_id: string;
          llm_chat_provider: string | null;
          llm_chat_model: string | null;
          llm_embeddings_provider: string | null;
          llm_embeddings_model: string | null;
          llm_openai_api_key_path: string | null;
          llm_google_api_key_path: string | null;
          llm_anthropic_api_key_path: string | null;
          mcp_api_key: string | null;
          slack_team_id: string | null;
          slack_bot_token: string | null;
          slack_bot_user_id: string | null;
          github_access_token: string | null;
          github_installation_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          llm_chat_provider?: string | null;
          llm_chat_model?: string | null;
          llm_embeddings_provider?: string | null;
          llm_embeddings_model?: string | null;
          llm_openai_api_key_path?: string | null;
          llm_google_api_key_path?: string | null;
          llm_anthropic_api_key_path?: string | null;
          mcp_api_key?: string | null;
          slack_team_id?: string | null;
          slack_bot_token?: string | null;
          slack_bot_user_id?: string | null;
          github_access_token?: string | null;
          github_installation_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          llm_chat_provider?: string | null;
          llm_chat_model?: string | null;
          llm_embeddings_provider?: string | null;
          llm_embeddings_model?: string | null;
          llm_openai_api_key_path?: string | null;
          llm_google_api_key_path?: string | null;
          llm_anthropic_api_key_path?: string | null;
          mcp_api_key?: string | null;
          slack_team_id?: string | null;
          slack_bot_token?: string | null;
          slack_bot_user_id?: string | null;
          github_access_token?: string | null;
          github_installation_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_settings_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: true;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      dbt_projects: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          connection_type: "dbt_cloud" | "github";
          dbt_cloud_url: string | null;
          dbt_cloud_account_id: number | null;
          dbt_cloud_api_key: string | null;
          github_repository_url: string | null;
          github_branch: string | null;
          github_project_folder: string | null;
          credentials_path: string | null;
          status: "pending" | "syncing" | "synced" | "error";
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          connection_type?: "dbt_cloud" | "github";
          dbt_cloud_url?: string | null;
          dbt_cloud_account_id?: number | null;
          dbt_cloud_api_key?: string | null;
          github_repository_url?: string | null;
          github_branch?: string | null;
          github_project_folder?: string | null;
          credentials_path?: string | null;
          status?: "pending" | "syncing" | "synced" | "error";
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          connection_type?: "dbt_cloud" | "github";
          dbt_cloud_url?: string | null;
          dbt_cloud_account_id?: number | null;
          dbt_cloud_api_key?: string | null;
          github_repository_url?: string | null;
          github_branch?: string | null;
          github_project_folder?: string | null;
          credentials_path?: string | null;
          status?: "pending" | "syncing" | "synced" | "error";
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dbt_projects_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      dbt_models: {
        Row: {
          id: string;
          organisation_id: string;
          dbt_project_id: string;
          name: string;
          unique_id: string | null;
          path: string | null;
          database_name: string | null;
          schema_name: string | null;
          materialization: string | null;
          raw_sql: string | null;
          compiled_sql: string | null;
          yml_description: string | null;
          yml_columns: Json | null;
          interpreted_description: string | null;
          interpreted_columns: Json | null;
          interpretation_details: Json | null;
          tags: string[] | null;
          depends_on: string[] | null;
          all_upstream_models: string[] | null;
          tests: Json | null;
          meta: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          dbt_project_id: string;
          name: string;
          unique_id?: string | null;
          path?: string | null;
          database_name?: string | null;
          schema_name?: string | null;
          materialization?: string | null;
          raw_sql?: string | null;
          compiled_sql?: string | null;
          yml_description?: string | null;
          yml_columns?: Json | null;
          interpreted_description?: string | null;
          interpreted_columns?: Json | null;
          interpretation_details?: Json | null;
          tags?: string[] | null;
          depends_on?: string[] | null;
          all_upstream_models?: string[] | null;
          tests?: Json | null;
          meta?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          dbt_project_id?: string;
          name?: string;
          unique_id?: string | null;
          path?: string | null;
          database_name?: string | null;
          schema_name?: string | null;
          materialization?: string | null;
          raw_sql?: string | null;
          compiled_sql?: string | null;
          yml_description?: string | null;
          yml_columns?: Json | null;
          interpreted_description?: string | null;
          interpreted_columns?: Json | null;
          interpretation_details?: Json | null;
          tags?: string[] | null;
          depends_on?: string[] | null;
          all_upstream_models?: string[] | null;
          tests?: Json | null;
          meta?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dbt_models_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dbt_models_dbt_project_id_fkey";
            columns: ["dbt_project_id"];
            isOneToOne: false;
            referencedRelation: "dbt_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      model_embeddings: {
        Row: {
          id: string;
          organisation_id: string;
          dbt_project_id: string | null;
          model_id: string | null;
          document_text: string;
          embedding: string;
          can_be_used_for_answers: boolean;
          is_processing: boolean;
          model_metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          dbt_project_id?: string | null;
          model_id?: string | null;
          document_text: string;
          embedding: string;
          can_be_used_for_answers?: boolean;
          is_processing?: boolean;
          model_metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          dbt_project_id?: string | null;
          model_id?: string | null;
          document_text?: string;
          embedding?: string;
          can_be_used_for_answers?: boolean;
          is_processing?: boolean;
          model_metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "model_embeddings_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "model_embeddings_dbt_project_id_fkey";
            columns: ["dbt_project_id"];
            isOneToOne: false;
            referencedRelation: "dbt_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "model_embeddings_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "dbt_models";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          organisation_id: string;
          external_id: string | null;
          channel: "slack" | "web" | "mcp" | "api";
          user_id: string | null;
          status: "active" | "completed" | "error" | "timeout";
          trigger:
            | "slack_mention"
            | "web_interface"
            | "mcp_server"
            | "api_call";
          title: string | null;
          summary: string | null;
          initial_question: string;
          channel_type: string | null;
          channel_id: string | null;
          user_external_id: string | null;
          llm_provider: string | null;
          llm_chat_model: string | null;
          enabled_integrations: Json;
          total_parts: number;
          total_tokens_used: number;
          total_cost: number;
          started_at: string;
          completed_at: string | null;
          user_rating: number | null;
          user_feedback: string | null;
          conversation_context: Json;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          external_id?: string | null;
          channel: "slack" | "web" | "mcp" | "api";
          user_id?: string | null;
          status?: "active" | "completed" | "error" | "timeout";
          trigger?:
            | "slack_mention"
            | "web_interface"
            | "mcp_server"
            | "api_call";
          title?: string | null;
          summary?: string | null;
          initial_question: string;
          channel_type?: string | null;
          channel_id?: string | null;
          user_external_id?: string | null;
          llm_provider?: string | null;
          llm_chat_model?: string | null;
          enabled_integrations?: Json;
          total_parts?: number;
          total_tokens_used?: number;
          total_cost?: number;
          started_at?: string;
          completed_at?: string | null;
          user_rating?: number | null;
          user_feedback?: string | null;
          conversation_context?: Json;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          external_id?: string | null;
          channel?: "slack" | "web" | "mcp" | "api";
          user_id?: string | null;
          status?: "active" | "completed" | "error" | "timeout";
          trigger?:
            | "slack_mention"
            | "web_interface"
            | "mcp_server"
            | "api_call";
          title?: string | null;
          summary?: string | null;
          initial_question?: string;
          channel_type?: string | null;
          channel_id?: string | null;
          user_external_id?: string | null;
          llm_provider?: string | null;
          llm_chat_model?: string | null;
          enabled_integrations?: Json;
          total_parts?: number;
          total_tokens_used?: number;
          total_cost?: number;
          started_at?: string;
          completed_at?: string | null;
          user_rating?: number | null;
          user_feedback?: string | null;
          conversation_context?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_parts: {
        Row: {
          id: string;
          conversation_id: string;
          sequence_number: number;
          actor: "user" | "agent" | "system" | "llm" | "tool";
          message_type:
            | "message"
            | "intent_classification"
            | "llm_input"
            | "llm_output"
            | "tool_call"
            | "tool_execution"
            | "tool_error"
            | "slack_output"
            | "slack_file_output"
            | "workflow_completion"
            | "error"
            | "thinking";
          content: string;
          tool_name: string | null;
          tool_input: Json | null;
          tool_output: Json | null;
          result_summary: string | null;
          tokens_used: number;
          cost: number;
          duration_ms: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sequence_number: number;
          actor: "user" | "agent" | "system" | "llm" | "tool";
          message_type:
            | "message"
            | "intent_classification"
            | "llm_input"
            | "llm_output"
            | "tool_call"
            | "tool_execution"
            | "tool_error"
            | "slack_output"
            | "slack_file_output"
            | "workflow_completion"
            | "error"
            | "thinking";
          content: string;
          tool_name?: string | null;
          tool_input?: Json | null;
          tool_output?: Json | null;
          result_summary?: string | null;
          tokens_used?: number;
          cost?: number;
          duration_ms?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sequence_number?: number;
          actor?: "user" | "agent" | "system" | "llm" | "tool";
          message_type?:
            | "message"
            | "intent_classification"
            | "llm_input"
            | "llm_output"
            | "tool_call"
            | "tool_execution"
            | "tool_error"
            | "slack_output"
            | "slack_file_output"
            | "workflow_completion"
            | "error"
            | "thinking";
          content?: string;
          tool_name?: string | null;
          tool_input?: Json | null;
          tool_output?: Json | null;
          result_summary?: string | null;
          tokens_used?: number;
          cost?: number;
          duration_ms?: number;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_parts_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          organisation_id: string;
          question_text: string;
          answer_text: string | null;
          question_embedding: string | null;
          was_useful: boolean | null;
          feedback: string | null;
          feedback_embedding: string | null;
          question_metadata: Json;
          original_message_text: string | null;
          original_message_ts: string | null;
          response_message_ts: string | null;
          original_message_embedding: string | null;
          response_file_message_ts: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          question_text: string;
          answer_text?: string | null;
          question_embedding?: string | null;
          was_useful?: boolean | null;
          feedback?: string | null;
          feedback_embedding?: string | null;
          question_metadata?: Json;
          original_message_text?: string | null;
          original_message_ts?: string | null;
          response_message_ts?: string | null;
          original_message_embedding?: string | null;
          response_file_message_ts?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          question_text?: string;
          answer_text?: string | null;
          question_embedding?: string | null;
          was_useful?: boolean | null;
          feedback?: string | null;
          feedback_embedding?: string | null;
          question_metadata?: Json;
          original_message_text?: string | null;
          original_message_ts?: string | null;
          response_message_ts?: string | null;
          original_message_embedding?: string | null;
          response_file_message_ts?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      question_models: {
        Row: {
          question_id: string;
          model_id: string;
          relevance_score: number | null;
          created_at: string;
        };
        Insert: {
          question_id: string;
          model_id: string;
          relevance_score?: number | null;
          created_at?: string;
        };
        Update: {
          question_id?: string;
          model_id?: string;
          relevance_score?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_models_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_models_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "dbt_models";
            referencedColumns: ["id"];
          },
        ];
      };
      organisation_integrations: {
        Row: {
          id: string;
          organisation_id: string;
          integration_key: string;
          is_enabled: boolean;
          configuration: Json;
          credentials_path: string | null;
          last_test_result: Json;
          last_tested_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          integration_key?: string;
          is_enabled?: boolean;
          configuration?: Json;
          credentials_path?: string | null;
          last_test_result?: Json;
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          integration_key?: string;
          is_enabled?: boolean;
          configuration?: Json;
          credentials_path?: string | null;
          last_test_result?: Json;
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_integrations_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist_entries: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          company: string | null;
          team_size: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          company?: string | null;
          team_size?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          company?: string | null;
          team_size?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      signup_whitelist: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      warehouse_connections: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          type: "snowflake" | "postgres" | "redshift";
          credentials: Json;
          status: "untested" | "connected" | "error";
          last_tested_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          type: "snowflake" | "postgres" | "redshift";
          credentials?: Json;
          status?: "untested" | "connected" | "error";
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          type?: "snowflake" | "postgres" | "redshift";
          credentials?: Json;
          status?: "untested" | "connected" | "error";
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_connections_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      metabase_connections: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          url: string;
          api_key: string;
          database_id: number | null;
          collection_path: string | null;
          status: "untested" | "connected" | "error";
          last_tested_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          url: string;
          api_key: string;
          database_id?: number | null;
          collection_path?: string | null;
          status?: "untested" | "connected" | "error";
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          name?: string;
          url?: string;
          api_key?: string;
          database_id?: number | null;
          collection_path?: string | null;
          status?: "untested" | "connected" | "error";
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "metabase_connections_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_models: {
        Args: {
          query_embedding: string;
          org_id: string;
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: {
          model_id: string;
          model_name: string;
          document_text: string;
          similarity: number;
        }[];
      };
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_org_owner: {
        Args: { org_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}
