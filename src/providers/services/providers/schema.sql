/**
 * Schema de provider_registry (SQL a ser executado no Supabase)
 * 
 * CREATE TABLE IF NOT EXISTS provider_registry (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   provider_code TEXT UNIQUE NOT NULL,
 *   enabled BOOLEAN DEFAULT true,
 *   interval_minutes INTEGER DEFAULT 240,
 *   last_execution TIMESTAMP WITH TIME ZONE,
 *   next_execution TIMESTAMP WITH TIME ZONE,
 *   last_error TEXT,
 *   sync_running BOOLEAN DEFAULT false
 * );
 */
