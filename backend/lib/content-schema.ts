/**
 * Content schema and types for stoic content library
 */

export interface ContentItem {
  id: string;
  author: string;
  source: string;
  book?: string;
  section?: string;
  letter?: string;
  type: 'quote' | 'saying' | 'excerpt';
  content: string;
  tags: string[];
}

export interface SearchQuery {
  query?: string;
  tag?: string;
  author?: string;
  limit?: number;
}

export interface ContentResult {
  items: ContentItem[];
  total: number;
  query: string;
}

export interface RAGContext {
  systemPromptSection: string;
  relevantQuotes: ContentItem[];
  injectedAt: string;
}
