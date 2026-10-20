export type FinanceFormState = {
  status: 'idle' | 'success' | 'invalid' | 'conflict' | 'forbidden' | 'error';
  message: string;
  /** Submitted values, returned so a failed form keeps what the operator typed. */
  values?: Record<string, string>;
  statementId?: string;
};

export const initialFinanceFormState: FinanceFormState = { status: 'idle', message: '' };

export function statementPath(id: string) {
  if (!id || id.includes('/') || id.includes('..')) throw new Error('A safe statement id is required.');
  return `/dashboard/platform/payouts/statements/${encodeURIComponent(id)}`;
}
