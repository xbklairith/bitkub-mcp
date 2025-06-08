// MCP Tool Types

export interface MCPToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: number;
    latency: number;
    cached?: boolean;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
  handler: (params: any) => Promise<MCPToolResponse>;
}

export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class RateLimitError extends MCPError {
  constructor(public retryAfterSeconds: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', {
      retryAfter: retryAfterSeconds,
    });
  }
}
