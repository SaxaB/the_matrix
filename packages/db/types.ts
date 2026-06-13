/**
 * Tipos TS del contrato de datos (espejo de packages/db/migrations/).
 * Consumidos por apps/etl y apps/client vía supabase-js. Mantener en sincronía
 * con las migraciones: cambio de esquema ⇒ migración nueva + actualizar aquí.
 *
 * Origen: database.types.ts de FinAI, reorganizado en schemas market/finance.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  vault: {
    Tables: {
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          doc_type:
            | "identity"
            | "immigration"
            | "health"
            | "insurance"
            | "contract"
            | "tax"
            | "other";
          holder: string | null;
          country: string | null;
          issuer: string | null;
          doc_number_last4: string | null;
          issue_date: string | null;
          expiry_date: string | null;
          tags: string[];
          notes: string | null;
          storage_backend: string | null;
          storage_ref: string | null;
          status: "active" | "archived" | "deleted";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          doc_type:
            | "identity"
            | "immigration"
            | "health"
            | "insurance"
            | "contract"
            | "tax"
            | "other";
          holder?: string | null;
          country?: string | null;
          issuer?: string | null;
          doc_number_last4?: string | null;
          issue_date?: string | null;
          expiry_date?: string | null;
          tags?: string[];
          notes?: string | null;
          storage_backend?: string | null;
          storage_ref?: string | null;
          status?: "active" | "archived" | "deleted";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          doc_type?:
            | "identity"
            | "immigration"
            | "health"
            | "insurance"
            | "contract"
            | "tax"
            | "other";
          holder?: string | null;
          country?: string | null;
          issuer?: string | null;
          doc_number_last4?: string | null;
          issue_date?: string | null;
          expiry_date?: string | null;
          tags?: string[];
          notes?: string | null;
          status?: "active" | "archived" | "deleted";
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  travel: {
    Tables: {
      tm47_reports: {
        Row: {
          id: string;
          user_id: string;
          due_date: string | null;
          filed_date: string | null;
          channel: "online" | "in_person";
          status:
            | "scheduled"
            | "preparing"
            | "awaiting_approval"
            | "submitted"
            | "approved"
            | "rejected"
            | "in_person"
            | "cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          due_date?: string | null;
          filed_date?: string | null;
          channel?: "online" | "in_person";
          status?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
          filed_date?: string | null;
          due_date?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  chat: {
    Tables: {
      messages: {
        Row: {
          id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          domain: string | null;
          status: "pending" | "processing" | "done" | "error";
          error: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          domain?: string | null;
          status?: "pending" | "processing" | "done" | "error";
          error?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "user" | "assistant";
          content?: string;
          domain?: string | null;
          status?: "pending" | "processing" | "done" | "error";
          error?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  market: {
    Tables: {
      us_symbols: {
        Row: {
          ticker: string;
          cik: string;
          entity_name: string;
          exchange: string | null;
          updated_at: string;
        };
        Insert: {
          ticker: string;
          cik: string;
          entity_name: string;
          exchange?: string | null;
          updated_at?: string;
        };
        Update: {
          ticker?: string;
          cik?: string;
          entity_name?: string;
          exchange?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sec_companyfacts_snapshot: {
        Row: {
          cik: string;
          entity_name: string | null;
          fetched_at: string;
        };
        Insert: {
          cik: string;
          entity_name?: string | null;
          fetched_at?: string;
        };
        Update: {
          cik?: string;
          entity_name?: string | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      sec_edgar_metrics: {
        Row: {
          id: string;
          cik: string;
          ticker: string | null;
          taxonomy: string;
          concept: string;
          label: string | null;
          period_end: string;
          value: number;
          unit: string;
          form: string | null;
          filed: string | null;
          fiscal_year: number | null;
          fiscal_period: string | null;
          accession: string | null;
        };
        Insert: {
          id?: string;
          cik: string;
          ticker?: string | null;
          taxonomy: string;
          concept: string;
          label?: string | null;
          period_end: string;
          value: number;
          unit: string;
          form?: string | null;
          filed?: string | null;
          fiscal_year?: number | null;
          fiscal_period?: string | null;
          accession?: string | null;
        };
        Update: {
          id?: string;
          cik?: string;
          ticker?: string | null;
          taxonomy?: string;
          concept?: string;
          label?: string | null;
          period_end?: string;
          value?: number;
          unit?: string;
          form?: string | null;
          filed?: string | null;
          fiscal_year?: number | null;
          fiscal_period?: string | null;
          accession?: string | null;
        };
        Relationships: [];
      };
      yahoo_eod_bars: {
        Row: {
          ticker: string;
          trade_date: string;
          open: number | null;
          high: number | null;
          low: number | null;
          close: number;
          adj_close: number | null;
          volume: number | null;
        };
        Insert: {
          ticker: string;
          trade_date: string;
          open?: number | null;
          high?: number | null;
          low?: number | null;
          close: number;
          adj_close?: number | null;
          volume?: number | null;
        };
        Update: {
          ticker?: string;
          trade_date?: string;
          open?: number | null;
          high?: number | null;
          low?: number | null;
          close?: number;
          adj_close?: number | null;
          volume?: number | null;
        };
        Relationships: [];
      };
      yahoo_asset_snapshot: {
        Row: {
          ticker: string;
          long_name: string | null;
          sector: string | null;
          industry: string | null;
          market_cap: number | null;
          trailing_pe: number | null;
          forward_pe: number | null;
          dividend_yield: number | null;
          beta: number | null;
          fifty_two_week_high: number | null;
          fifty_two_week_low: number | null;
          average_volume: number | null;
          regular_market_volume: number | null;
          currency: string | null;
          exchange: string | null;
          raw_summary: Json | null;
          earnings_next_date: string | null;
          earnings_is_estimate: boolean | null;
          earnings_eps_consensus: number | null;
          earnings_revenue_consensus: number | null;
          fetched_at: string;
          finai_risk_score: number | null;
          finai_risk_computed_at: string | null;
          finai_risk_breakdown: Json | null;
        };
        Insert: {
          ticker: string;
          long_name?: string | null;
          sector?: string | null;
          industry?: string | null;
          market_cap?: number | null;
          trailing_pe?: number | null;
          forward_pe?: number | null;
          dividend_yield?: number | null;
          beta?: number | null;
          fifty_two_week_high?: number | null;
          fifty_two_week_low?: number | null;
          average_volume?: number | null;
          regular_market_volume?: number | null;
          currency?: string | null;
          exchange?: string | null;
          raw_summary?: Json | null;
          earnings_next_date?: string | null;
          earnings_is_estimate?: boolean | null;
          earnings_eps_consensus?: number | null;
          earnings_revenue_consensus?: number | null;
          fetched_at?: string;
          finai_risk_score?: number | null;
          finai_risk_computed_at?: string | null;
          finai_risk_breakdown?: Json | null;
        };
        Update: {
          ticker?: string;
          long_name?: string | null;
          sector?: string | null;
          industry?: string | null;
          market_cap?: number | null;
          trailing_pe?: number | null;
          forward_pe?: number | null;
          dividend_yield?: number | null;
          beta?: number | null;
          fifty_two_week_high?: number | null;
          fifty_two_week_low?: number | null;
          average_volume?: number | null;
          regular_market_volume?: number | null;
          currency?: string | null;
          exchange?: string | null;
          raw_summary?: Json | null;
          earnings_next_date?: string | null;
          earnings_is_estimate?: boolean | null;
          earnings_eps_consensus?: number | null;
          earnings_revenue_consensus?: number | null;
          fetched_at?: string;
          finai_risk_score?: number | null;
          finai_risk_computed_at?: string | null;
          finai_risk_breakdown?: Json | null;
        };
        Relationships: [];
      };
      asset_quotes: {
        Row: {
          ticker: string;
          price: number;
          currency: string;
          fetched_at: string;
        };
        Insert: {
          ticker: string;
          price: number;
          currency?: string;
          fetched_at?: string;
        };
        Update: {
          ticker?: string;
          price?: number;
          currency?: string;
          fetched_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  finance: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          risk_level: "conservative" | "moderate" | "aggressive";
          risk_score: number;
          questionnaire_answers: Json;
          ai_investor_report: string | null;
          ai_investor_report_at: string | null;
          questionnaire_edited_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          risk_level: "conservative" | "moderate" | "aggressive";
          risk_score: number;
          questionnaire_answers?: Json;
          ai_investor_report?: string | null;
          ai_investor_report_at?: string | null;
          questionnaire_edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          risk_level?: "conservative" | "moderate" | "aggressive";
          risk_score?: number;
          questionnaire_answers?: Json;
          ai_investor_report?: string | null;
          ai_investor_report_at?: string | null;
          questionnaire_edited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      holdings: {
        Row: {
          id: string;
          user_id: string;
          ticker: string;
          name: string;
          quantity: number;
          avg_price: number;
          current_price: number;
          asset_class: "stocks" | "bonds" | "cash" | "alternatives";
          sector: string;
          currency: string;
          price_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ticker: string;
          name: string;
          quantity: number;
          avg_price: number;
          current_price: number;
          asset_class: "stocks" | "bonds" | "cash" | "alternatives";
          sector?: string;
          currency?: string;
          price_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ticker?: string;
          name?: string;
          quantity?: number;
          avg_price?: number;
          current_price?: number;
          asset_class?: "stocks" | "bonds" | "cash" | "alternatives";
          sector?: string;
          currency?: string;
          price_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      portfolio_daily_values: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          total_value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date: string;
          total_value: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          snapshot_date?: string;
          total_value?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      risk_level: "conservative" | "moderate" | "aggressive";
      asset_class: "stocks" | "bonds" | "cash" | "alternatives";
    };
    CompositeTypes: Record<string, never>;
  };
}
