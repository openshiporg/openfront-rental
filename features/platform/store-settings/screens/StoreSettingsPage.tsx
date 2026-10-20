import { AlertCircle, ExternalLink, LockKeyhole } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Callout, PageBody, PageHeader, PlatformPage, StatusBadge } from '@/features/platform/operations/components/PlatformUI';
import { getOperatorMarketplaceSettings } from '../actions/storeSettings';
import { StoreSettingsForm } from '../components/StoreSettingsForm';

export async function StoreSettingsPage() {
  const result = await getOperatorMarketplaceSettings();
  const settings = result.status === 'ready' ? result.settings : null;

  return (
    <PlatformPage section="Store Settings" sectionHref="/platform/store-settings">
      <PageHeader
        title="Store Settings"
        badges={result.status === 'ready' ? <StatusBadge tone={settings?.isPublished ? 'success' : 'neutral'} label={settings?.isPublished ? 'Published' : 'Unpublished'} /> : result.status === 'unconfigured' ? <StatusBadge tone="warning" label="Not configured" /> : null}
        actions={result.status === 'ready' || result.status === 'unconfigured' ? <Button asChild size="sm" variant="outline"><Link href="/" target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />View storefront</Link></Button> : undefined}
      />
      {result.status === 'unauthorized' ? (
        <PageBody><Callout tone="neutral" icon={LockKeyhole} title="Settings access required">{result.message}</Callout></PageBody>
      ) : result.status === 'error' ? (
        <PageBody><Callout live tone="danger" icon={AlertCircle} title="Settings couldn’t be loaded">{result.message}</Callout></PageBody>
      ) : (
        <StoreSettingsForm settings={result.settings} />
      )}
    </PlatformPage>
  );
}

export default StoreSettingsPage;
