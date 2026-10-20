import Form from 'next/form';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { Field, Select } from '@/features/platform/operations/components/FormControls';
import { DetailGrid, EmptyState, PageBody, PageHeader, PlatformPage, Section } from '@/features/platform/operations/components/PlatformUI';
import { readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import { platformDetailPath, rawRecordPath } from '@/features/platform/operations/lib/routes';
import { getRatePlanCreateContext, getRatePlanEditWorkspace } from '../actions/catalogWorkspaces';
import { RatePlanForm } from '../components/RatePlanForm';
import { listingCreatePath, ratePlanCreatePath, ratePlanEditPath } from '../lib/routes';
import { CatalogPageState } from './CatalogAccess';

const pricing = { section: 'Pricing', sectionHref: '/platform/pricing' };
const recordsLink = <Link href={rawRecordPath('rate-plans')} className="block px-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Rate-plan records</Link>;

export async function RatePlanCreatePage({ searchParams }: { searchParams?: PlatformSearchParams }) {
  const { get } = await readSearchParams(searchParams);
  const listingId = /^[A-Za-z0-9_-]+$/.test(get('listingId')) ? get('listingId') : null;
  const retryHref = ratePlanCreatePath({ listingId });
  const page = { ...pricing, current: 'New rate plan', title: 'New rate plan', back: { href: '/dashboard/platform/pricing', label: 'Pricing' } };
  const capabilities = await getPlatformCapabilities();
  if (!capabilities.known) return <CatalogPageState {...page} kind="unavailable" retryHref={retryHref} description="Your permissions couldn’t be checked. Try again in a moment." />;
  if (!capabilities.canManagePricing) return <CatalogPageState {...page} kind="denied" description="Pricing management permission is required to create rate plans." />;
  const context = await getRatePlanCreateContext(listingId);
  if (context.error || !context.data) return <CatalogPageState {...page} kind="unavailable" retryHref={retryHref} description="Try again in a moment." />;
  const listing = context.data.listing;
  if (listingId && (!listing || listing.status === 'archived')) return <CatalogPageState {...page} kind="missing" description="This listing is unavailable, archived, or outside your host scope." />;

  const main = listing
    ? <Section title="Rate plan" flush><RatePlanForm listing={listing} policies={context.data.cancellationPolicies || []} cancelHref={platformDetailPath('listing', listing.id)} /></Section>
    : <Section title="Listing" flush>
        {context.data.listings.length ? <Form action={ratePlanCreatePath()} className="grid gap-4 p-5">
          <Field label="Listing" hint={context.data.listingsCount > context.data.listings.length ? `Showing ${context.data.listings.length} of ${context.data.listingsCount}, by title.` : undefined}>
            <Select required name="listingId" defaultValue=""><option value="" disabled>Choose the listing this plan prices</option>{context.data.listings.map((option: any) => <option key={option.id} value={option.id}>{option.title}{option.property?.name ? ` · ${option.property.name}` : ''} ({option.currencyCode})</option>)}</Select>
          </Field>
          <div><Button type="submit" size="sm">Continue</Button></div>
        </Form> : <EmptyState compact title="No listing to price" description="A rate plan prices one listing." action={capabilities.canManageListings ? <Button asChild size="sm"><Link href={listingCreatePath()}>New listing</Link></Button> : undefined} />}
      </Section>;

  return <PlatformPage section={pricing.section} sectionHref={pricing.sectionHref} current={page.current}>
    <PageHeader back={listing ? { href: platformDetailPath('listing', listing.id), label: listing.title } : page.back} title={page.title} description={listing ? `For ${listing.title}${listing.property?.name ? ` · ${listing.property.name}` : ''}` : undefined} />
    <PageBody><div className="max-w-5xl"><DetailGrid main={main} aside={recordsLink} /></div></PageBody>
  </PlatformPage>;
}

export async function RatePlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = { href: platformDetailPath('ratePlan', id), label: 'Rate plan' };
  const page = { ...pricing, current: 'Edit rate plan', title: 'Edit rate plan', back };
  const capabilities = await getPlatformCapabilities();
  if (!capabilities.known) return <CatalogPageState {...page} kind="unavailable" retryHref={ratePlanEditPath(id)} description="Your permissions couldn’t be checked. Try again in a moment." />;
  if (!capabilities.canManagePricing) return <CatalogPageState {...page} kind="denied" description="Pricing management permission is required to change rate plans." />;
  const result = await getRatePlanEditWorkspace(id);
  if (result.error || !result.data) return <CatalogPageState {...page} kind="unavailable" retryHref={ratePlanEditPath(id)} description="Try again in a moment." />;
  const plan = result.data.ratePlan;
  if (!plan) return <CatalogPageState {...page} kind="missing" description="This rate plan is unavailable or outside your host scope." />;
  if (!plan.listing) return <CatalogPageState {...page} kind="missing" description="This plan isn’t attached to a listing. Attach one in the rate-plan record." />;

  return <PlatformPage section={pricing.section} sectionHref={pricing.sectionHref} current={plan.name}>
    <PageHeader back={back} title={`Edit ${plan.name}`} description={`For ${plan.listing.title}${plan.listing.property?.name ? ` · ${plan.listing.property.name}` : ''}`} />
    <PageBody>
      <div className="max-w-5xl">
        <DetailGrid
          main={<Section title="Rate plan" flush><RatePlanForm listing={plan.listing} plan={plan} policies={result.data.cancellationPolicies || []} cancelHref={platformDetailPath('ratePlan', id)} /></Section>}
          aside={<>
            <Section title="Seasonal overrides"><p className="text-sm text-muted-foreground">Seasonal windows are edited in the seasonal-rate records.</p><Button asChild size="sm" variant="outline" className="mt-3"><Link href={rawRecordPath('seasonal-rates')}>Seasonal-rate records</Link></Button></Section>
            {recordsLink}
          </>}
        />
      </div>
    </PageBody>
  </PlatformPage>;
}
