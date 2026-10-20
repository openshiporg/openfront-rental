'use client';
import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
export function SubmitButton({ children, pendingLabel = 'Please wait…', block = false, tone = 'accent' }: { children: React.ReactNode; pendingLabel?: string; block?: boolean; tone?: 'accent' | 'danger' }) {
  const { pending } = useFormStatus();
  return <button className={`stay-button ${block ? 'stay-button-block stay-button-large' : ''} ${tone === 'danger' ? 'stay-button-danger' : ''}`} type="submit" disabled={pending} aria-disabled={pending}>{pending ? <><LoaderCircle className="stay-spin" size={16} aria-hidden="true" />{pendingLabel}</> : children}</button>;
}
