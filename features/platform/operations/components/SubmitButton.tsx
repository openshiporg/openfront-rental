'use client';

import { Loader2 } from 'lucide-react';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';

type ButtonProps = ComponentProps<typeof Button>;

/** Submit button that reflects the parent form's pending server action. */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: Omit<ButtonProps, 'type'> & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} {...props}>
    {pending ? <><Loader2 aria-hidden="true" className="animate-spin" />{pendingLabel ?? children}</> : children}
  </Button>;
}

/**
 * Asks for confirmation before submitting the parent form — for transitions that cannot be
 * undone from this workspace (archive, cancel, void, release).
 */
export function ConfirmSubmitButton({ children, title, description, confirmLabel, cancelLabel = 'Keep as is', destructive = true, variant = 'outline', size = 'sm', className, pendingLabel }: {
  children: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  pendingLabel?: ReactNode;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const { pending } = useFormStatus();
  return <>
    <span ref={anchor} hidden />
    <Button type="button" variant={variant} size={size} className={className} disabled={pending} aria-busy={pending || undefined} onClick={() => setOpen(true)}>
      {pending ? <><Loader2 aria-hidden="true" className="animate-spin" />{pendingLabel ?? children}</> : children}
    </Button>
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild><div className="text-sm leading-6 text-muted-foreground">{description}</div></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? buttonVariants({ variant: 'destructive' }) : undefined}
            onClick={() => { anchor.current?.closest('form')?.requestSubmit(); }}
          >{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
