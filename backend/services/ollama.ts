/**
 * Ollama chat service - handles communication with local Ollama API
 * Supports both streaming and non-streaming chat completions
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
}

/**
 * Information about an installed Ollama model
 */
export interface OllamaModelInfo {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
}

export class OllamaOfflineError extends Error {
  constructor(message: string = 'Unable to connect to AI. Please ensure Ollama is running.') {
    super(message);
    this.name = 'OllamaOfflineError';
  }
}

/**
 * Ollama service for chat completions
 */
export class OllamaService {
  private host: string;
  private model: string;

  constructor(host?: string, model?: string) {
    this.host = host || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = model || process.env.OLLAMA_MODEL || 'llama3.2:latest';
  }

  getHost(): string {
    return this.host;
  }

  getModel(): string {
    return this.model;
  }

  /**
   * Update the model (for dynamic model switching)
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Check if Ollama is online and responding
   */
  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the list of installed models from Ollama
   */
  async listModels(): Promise<OllamaModelInfo[]> {
    const response = await fetch(`${this.host}/api/tags`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to list Ollama models: ${response.status} ${response.statusText} - ${text}`);
    }
    const data = await response.json();
    const models: OllamaModelInfo[] = (data.models || []).map((m: { name: string; size?: number; modified_at?: string }) => ({
      name: m.name,
      sizeBytes: m.size || 0,
      modifiedAt: m.modified_at || '',
    }));
    return models;
  }

  /**
   * Send a non-streaming chat request to Ollama
   */
  async chat(messages: OllamaMessage[]): Promise<OllamaChatResponse> {
    const response = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Send a streaming chat request to Ollama
   * Yields each token as it arrives
   * The loop terminates when Ollama sends done:true OR when the response body is exhausted
   */
  async *streamChat(messages: OllamaMessage[]): AsyncIterable<string> {
    const response = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Ollama response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();

        if (done) {
          // Response body exhausted - stream is complete
          streamDone = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          try {
            const data = JSON.parse(line);
            // Check if Ollama signals completion
            if (data.done === true) {
              streamDone = true;
              // Don't yield here - the last message.content was already yielded above
              break;
            }
            if (data.message?.content) {
              yield data.message.content;
            }
          } catch {
            // Skip invalid JSON lines (shouldn't happen but be safe)
          }
        }
      }

      // Process any remaining data in buffer (including final token after done:true)
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Pull a model from Ollama registry with progress streaming.
   * Yields progress updates as the model downloads.
   */
  async *pullModel(modelName: string): AsyncIterable<ModelPullProgress> {
    const response = await fetch(`${this.host}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama pull error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Ollama response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          try {
            const data = JSON.parse(line);
            yield {
              status: data.status || 'unknown',
              digest: data.digest || '',
              total: data.total || 0,
              completed: data.completed || 0,
            };
          } catch {
            // Skip invalid JSON lines
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          yield {
            status: data.status || 'unknown',
            digest: data.digest || '',
            total: data.total || 0,
            completed: data.completed || 0,
          };
        } catch {
          // Skip invalid JSON
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Progress update during model pull
 */
export interface ModelPullProgress {
  status: string;
  digest: string;
  total: number;
  completed: number;
}

// Singleton instance
let ollamaServiceInstance: OllamaService | null = null;

export function getOllamaService(host?: string, model?: string): OllamaService {
  if (!ollamaServiceInstance) {
    ollamaServiceInstance = new OllamaService(host, model);
  }
  return ollamaServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetOllamaService(): void {
  ollamaServiceInstance = null;
}
