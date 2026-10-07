export type SafeGraphQLError = {
  message: string;
  path?: Array<string | number>;
};

export const SAFE_GRAPHQL_FAILURE_MESSAGE = 'The request could not be completed. Please try again.';

export function safeErrorLogContext(error: unknown): { errorType: string } {
  // Error.name is mutable and may contain request-derived secrets; log only a
  // fixed category rather than reflecting any property of the thrown value.
  return { errorType: error instanceof Error ? 'Error' : typeof error };
}

export function safeGraphQLErrorCount(errors: unknown): number {
  return Array.isArray(errors) ? errors.length : 0;
}

const SAFE_MESSAGES_BY_CODE: Record<string, string> = {
  BAD_USER_INPUT: 'Some submitted information is invalid. Review it and try again.',
  CONFLICT: 'The record changed or conflicts with the current state. Refresh and try again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  GRAPHQL_VALIDATION_FAILED: 'The request could not be completed.',
  NOT_FOUND: 'The requested record could not be found.',
  UNAUTHENTICATED: 'Please sign in to continue.',
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
}

function safeErrorPath(value: unknown): Array<string | number> | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > 16) return undefined;
  if (!value.every((part) => typeof part === 'string' || (typeof part === 'number' && Number.isSafeInteger(part)))) return undefined;
  return value as Array<string | number>;
}

function safeMessageForCode(value: unknown): string {
  const extensions = asRecord(asRecord(value)?.extensions);
  const code = typeof extensions?.code === 'string' ? extensions.code.toUpperCase().slice(0, 64) : '';
  return SAFE_MESSAGES_BY_CODE[code] ?? SAFE_GRAPHQL_FAILURE_MESSAGE;
}

/**
 * Project GraphQL errors to a small public allowlist. Server messages,
 * extensions, locations, request variables, and exception data are untrusted.
 */
export function sanitizeGraphQLErrors(value: unknown): SafeGraphQLError[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((error) => {
    const path = safeErrorPath(asRecord(error)?.path);
    return { message: safeMessageForCode(error), ...(path ? { path } : {}) };
  });
}

/** Format a graphql-request ClientError without reflecting its request or raw response. */
export function formatSafeGraphQLClientError(error: unknown): {
  message: string;
  errors?: SafeGraphQLError[];
} {
  const response = asRecord(asRecord(error)?.response);
  const errors = sanitizeGraphQLErrors(response?.errors);
  if (errors.length === 0) return { message: SAFE_GRAPHQL_FAILURE_MESSAGE };

  return {
    message: [...new Set(errors.map(({ message }) => message))].join('\n'),
    errors,
  };
}
