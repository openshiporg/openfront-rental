import { Lock, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState, PageBody, PageHeader, PlatformPage, Section } from '@/features/platform/operations/components/PlatformUI';

/** Full-page state for a create or edit route the operator can't use right now. */
export function CatalogPageState({ section, sectionHref, current, title, back, kind, description, retryHref }: {
  section: string;
  sectionHref: string;
  current: string;
  title: string;
  back: { href: string; label: string };
  kind: 'unavailable' | 'denied' | 'missing';
  description: ReactNode;
  retryHref?: string;
}) {
  return <PlatformPage section={section} sectionHref={sectionHref} current={current}>
    <PageHeader back={back} title={title} />
    <PageBody>
      <Section>
        <EmptyState
          icon={kind === 'unavailable' ? RefreshCcw : Lock}
          title={kind === 'unavailable' ? 'This page couldn’t load' : kind === 'denied' ? 'You can’t make this change' : 'This record isn’t available'}
          description={description}
          action={kind === 'unavailable' && retryHref
            ? <Button asChild size="sm" variant="outline"><Link href={retryHref}><RefreshCcw aria-hidden="true" />Try again</Link></Button>
            : <Button asChild size="sm" variant="outline"><Link href={back.href}>Back to {back.label.toLowerCase()}</Link></Button>}
        />
      </Section>
    </PageBody>
  </PlatformPage>;
}
