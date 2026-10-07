import { ArrowLeft, Home, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Panel, Workspace, WorkspaceBody, WorkspaceHeader } from '@/features/platform/operations/components/OperationsWorkspace';
import { rawRecordPath } from '@/features/platform/operations/lib/routes';
import { PropertyCreateForm } from '../components/PropertyCreateForm';
import { getPropertyCreateCapability } from '../actions/hostWorkspaces';
import { canManageProperties } from '../lib/capabilities';

export async function PropertyCreatePage() {
  const capability = await getPropertyCreateCapability();
  const mayCreateProperty = canManageProperties(capability.data?.actor);
  return <Workspace><WorkspaceHeader sectionLabel="Properties" sectionHref="/platform/properties" currentLabel="New property" eyebrow="Property onboarding" title="Create property workspace" description="Start the physical property record in onboarding state. Address, unit, registration, listing, safety, and owner evidence are completed from the resulting platform detail workspace." actions={<Button asChild size="sm" variant="ghost"><Link href="/dashboard/platform/properties"><ArrowLeft className="mr-2 h-4 w-4" />Properties</Link></Button>} />
    <WorkspaceBody aside={<Panel title="Fail-closed creation" description="Creation requires exactly one accessible host organization."><div className="space-y-3 p-4 text-xs leading-5 text-muted-foreground"><p className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />New properties always begin in onboarding and cannot become sellable from this form.</p><p className="flex gap-2"><Home className="mt-0.5 h-4 w-4 shrink-0" />The platform detail page exposes readiness and legal lifecycle transitions.</p><Button asChild size="sm" variant="outline"><Link href={rawRecordPath('properties')}>Property record configuration</Link></Button></div></Panel>}>
      {mayCreateProperty ? <Panel title="Property identity" description="Use the property’s operational name and local accommodation timezone."><PropertyCreateForm /></Panel> : <Panel title="Property creation unavailable" description="Your role has read-only property access."><div role="alert" className="p-4 text-sm text-muted-foreground">Property management capability is required to create a property.</div></Panel>}
    </WorkspaceBody>
  </Workspace>;
}
export default PropertyCreatePage;
