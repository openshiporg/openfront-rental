import Form from 'next/form';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { Field, Select } from '@/features/platform/operations/components/FormControls';
import { DetailGrid, EmptyState, PageBody, PageHeader, PlatformPage, Section } from '@/features/platform/operations/components/PlatformUI';
import { readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import { platformCreatePath, platformDetailPath, rawRecordPath } from '@/features/platform/operations/lib/routes';
import { getListingCreateContext } from '../actions/catalogWorkspaces';
import { ListingCreateForm } from '../components/ListingCreateForm';
import { listingCreatePath } from '../lib/routes';
import { CatalogPageState } from './CatalogAccess';

const page = { section: 'Listings', sectionHref: '/platform/listings', current: 'New listing', title: 'New listing', back: { href: '/dashboard/platform/listings', label: 'Listings' } };

export async function ListingCreatePage({ searchParams }: { searchParams?: PlatformSearchParams }) {
  const { get } = await readSearchParams(searchParams);
  const propertyId = /^[A-Za-z0-9_-]+$/.test(get('propertyId')) ? get('propertyId') : null;
  const unitId = get('unitId');
  const retryHref = listingCreatePath({ propertyId, unitId });
  const capabilities = await getPlatformCapabilities();
  if (!capabilities.known) return <CatalogPageState {...page} kind="unavailable" retryHref={retryHref} description="Your permissions couldn’t be checked. Try again in a moment." />;
  if (!capabilities.canManageListings) return <CatalogPageState {...page} kind="denied" description="Listing management permission is required to create listings." />;
  const context = await getListingCreateContext(propertyId);
  if (context.error || !context.data) return <CatalogPageState {...page} kind="unavailable" retryHref={retryHref} description="Try again in a moment." />;
  const property = context.data.property;
  if (propertyId && (!property || property.status === 'archived')) return <CatalogPageState {...page} kind="missing" description="This property is unavailable, archived, or outside your host scope." />;

  const main = !propertyId
    ? <Section title="Property" flush>
        {context.data.properties.length ? <Form action={listingCreatePath()} className="grid gap-4 p-5">
          <Field label="Property" hint={context.data.propertiesCount > context.data.properties.length ? `Showing ${context.data.properties.length} of ${context.data.propertiesCount}, by name.` : undefined}>
            <Select required name="propertyId" defaultValue=""><option value="" disabled>Choose a property</option>{context.data.properties.map((option: any) => <option key={option.id} value={option.id} disabled={!option.unitsCount}>{option.name}{option.unitsCount ? '' : ' (no units)'}</option>)}</Select>
          </Field>
          <div><Button type="submit" size="sm">Continue</Button></div>
        </Form> : <EmptyState compact title="No property yet" description="Every listing sells a unit of a property." action={capabilities.canManageProperties ? <Button asChild size="sm"><Link href={platformCreatePath('property')}>Add property</Link></Button> : undefined} />}
      </Section>
    : property.units.length
      ? <Section title="Listing details" flush><ListingCreateForm property={property} units={property.units} defaultUnitId={property.units.some((unit: any) => unit.id === unitId) ? unitId : undefined} defaultCurrency={property.firstListing?.[0]?.currencyCode} /></Section>
      : <Section><EmptyState compact title="No unit to list" description="Every listing sells one unit. Add a unit to this property first." action={<Button asChild size="sm" variant="outline"><Link href={`${platformDetailPath('property', property.id)}#property-unit-action`}>Open property</Link></Button>} /></Section>;

  return <PlatformPage section={page.section} sectionHref={page.sectionHref} current={page.current}>
    <PageHeader back={property ? { href: platformDetailPath('property', property.id), label: property.name } : page.back} title={page.title} description={property ? `For ${property.name}` : undefined} />
    <PageBody>
      <div className="max-w-5xl">
        <DetailGrid
          main={main}
          aside={<Link href={rawRecordPath('listings')} className="block px-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Listing records</Link>}
        />
      </div>
    </PageBody>
  </PlatformPage>;
}
export default ListingCreatePage;
