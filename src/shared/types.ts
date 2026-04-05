/**
 * Shared types for OpenMarcus frontend and backend
 */

export interface ProfileDTO {
  id: string;
  name: string;
  bio: string | null;
  encrypted_data?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  name: string;
  bio: string;
}

/**
 * Session data transfer object (from backend)
 */
export interface SessionDTO {
  id: string;
  profile_id: string;
  status: 'intro' | 'active' | 'closing' | 'summary';
  summary: string | null;
  action_items: string[] | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Session detail response (session + messages)
 */
export interface SessionDetail {
  session: SessionDTO;
  messages: MessageDTO[];
}

/**
 * Message data transfer object
 */
export interface MessageDTO {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * Action item from session summary
 */
export interface ActionItemDTO {
  id?: string;
  session_id?: string;
  content: string;
  completed?: boolean;
}

/**
 * Session summary response
 */
export interface SessionSummaryResponse {
  session: SessionDTO;
  summary: string;
  actionItems: string[];
}

/**
 * NDJSON streaming token
 */
export interface StreamToken {
  token?: string;
  done?: boolean;
  full_response?: string;
  error?: string;
}

export interface ValidationErrors {
  name?: string;
}

export type ProfileStatus = 'loading' | 'not_found' | 'loaded' | 'error';
