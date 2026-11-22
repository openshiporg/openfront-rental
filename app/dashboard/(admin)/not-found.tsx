import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { PageContainer } from '@/features/dashboard/components/PageContainer';

/** A missing record, or a page the signed-in role can't open, inside the dashboard frame. */
export default function DashboardNotFound() {
  return (
    <PageContainer title="Page not found" breadcrumbs={[{ type: 'link', label: 'Dashboard', href: '/dashboard' }, { type: 'page', label: 'Not found' }]}>
      <div className="grid min-h-[50vh] place-items-center p-4 sm:p-6">
        <section className="w-full max-w-lg rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">This page isn’t available</h1>
          <p className="mt-2 text-sm text-muted-foreground">The record doesn’t exist, or your role can’t open this page.</p>
          <div className="mt-5 flex justify-center">
            <Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
