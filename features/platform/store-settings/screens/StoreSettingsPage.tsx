import { AlertCircle, LockKeyhole } from 'lucide-react';

import { PageBreadcrumbs } from '@/features/dashboard/components/PageBreadcrumbs';
import { getOperatorMarketplaceSettings } from '../actions/storeSettings';
import { StoreSettingsForm } from '../components/StoreSettingsForm';

export async function StoreSettingsPage() {
  const result = await getOperatorMarketplaceSettings();
  const breadcrumbs = [
    { type: 'link' as const, label: 'Dashboard', href: '/dashboard' },
    { type: 'page' as const, label: 'Platform' },
    { type: 'page' as const, label: 'Storefront settings' },
  ];

  return (
    <section className="flex min-h-full flex-col">
      <PageBreadcrumbs items={breadcrumbs} />
      <header className="border-b px-4 py-5 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Storefront settings</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Manage the bounded public identity and accent theme. Inventory availability, quote calculations, reservation state, payment collection, and settlement remain owned by their operational records.</p>
      </header>

      {result.status === 'unauthorized' ? (
        <div className="m-4 flex max-w-2xl gap-3 rounded-lg border p-5 md:m-6" role="alert"><LockKeyhole className="mt-0.5 h-5 w-5" /><div><h2 className="font-semibold">Settings access required</h2><p className="mt-1 text-sm text-muted-foreground">{result.message}</p></div></div>
      ) : result.status === 'error' ? (
        <div className="m-4 flex max-w-2xl gap-3 rounded-lg border border-rose-300 bg-rose-50 p-5 text-rose-950 md:m-6 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100" role="alert"><AlertCircle className="mt-0.5 h-5 w-5" /><div><h2 className="font-semibold">Settings could not be loaded</h2><p className="mt-1 text-sm">{result.message}</p></div></div>
      ) : (
        <StoreSettingsForm settings={result.settings} />
      )}
    </section>
  );
}

export default StoreSettingsPage;
