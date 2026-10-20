import { Building2, Lock, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { DetailGrid, EmptyState, PageBody, PageHeader, PlatformPage, Section } from '@/features/platform/operations/components/PlatformUI';
import { platformCreatePath, rawRecordPath } from '@/features/platform/operations/lib/routes';
import { PropertyCreateForm } from '../components/PropertyCreateForm';
import { getPropertyCreateHosts } from '../actions/hostWorkspaces';

const steps = [
  { title: 'Create the property', detail: 'Name, internal code, type, and timezone. It starts in onboarding.' },
  { title: 'Add address and units', detail: 'Record the guest location and each independently bookable unit.' },
  { title: 'Record registration', detail: 'Enter the registration number issued by your jurisdiction.' },
  { title: 'Create and publish a listing', detail: 'Draft a listing for a unit, complete it, then publish.' },
  { title: 'Activate the property', detail: 'Once every step is done, activate it from the property page.' },
];

const backToProperties = <Button asChild size="sm" variant="outline"><Link href="/dashboard/platform/properties">Back to properties</Link></Button>;
const retry = <Button asChild size="sm" variant="outline"><Link href={platformCreatePath('property')}><RefreshCcw aria-hidden="true" />Try again</Link></Button>;

export async function PropertyCreatePage() {
  const capabilities = await getPlatformCapabilities();
  const hosts = capabilities.canManageProperties ? await getPropertyCreateHosts() : null;
  // A failed permission or host read is a retry, never a read-only denial.
  const main = !capabilities.known
    ? <Section><EmptyState icon={RefreshCcw} title="Property creation is unavailable" description="Your permissions couldn’t be checked. Try again in a moment." action={retry} /></Section>
    : !capabilities.canManageProperties
      ? <Section><EmptyState icon={Lock} title="You can’t create properties" description="Your role has read-only access to properties. Ask an admin for property management permission." action={backToProperties} /></Section>
      : !hosts || hosts.error
        ? <Section><EmptyState icon={RefreshCcw} title="Property creation is unavailable" description="Your host organizations couldn’t be loaded. Try again in a moment." action={retry} /></Section>
        : !hosts.hosts.length
          ? <Section><EmptyState icon={Building2} title="No host organization available" description="Properties belong to a host organization. You need an active membership in one to add a property." action={backToProperties} /></Section>
          : <Section title="Property basics" flush><PropertyCreateForm hosts={hosts.hosts} hostTotal={hosts.total} /></Section>;
  return <PlatformPage section="Properties" sectionHref="/platform/properties" current="New property">
    <PageHeader back={{ href: '/dashboard/platform/properties', label: 'Properties' }} title="Add a property" description="Create the property record. You’ll finish setup — address, units, registration, and listings — on the next page." />
    <PageBody>
      <div className="max-w-5xl">
        <DetailGrid
          main={main}
          aside={<>
            <Section title="What happens next">
              <ol className="space-y-4">
                {steps.map((step, index) => <li key={step.title} className="flex gap-3">
                  <span className={index === 0 ? 'grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background' : 'grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-medium text-muted-foreground'}>{index + 1}</span>
                  <span className="min-w-0"><span className="block text-sm font-medium">{step.title}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{step.detail}</span></span>
                </li>)}
              </ol>
            </Section>
            {capabilities.canManageProperties ? <Link href={rawRecordPath('properties')} className="block px-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Property records</Link> : null}
          </>}
        />
      </div>
    </PageBody>
  </PlatformPage>;
}
export default PropertyCreatePage;
