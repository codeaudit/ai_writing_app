export class TRPCCustomError extends Error {
  constructor(
    message: string,
    public code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR',
    public cause?: unknown
  ) {
    super(message);
    this.name = 'TRPCCustomError';
  }
} 