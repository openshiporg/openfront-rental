'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Loader2, Palette, Save, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  saveMarketplaceSettings,
  type OperatorMarketplaceSettings,
  type StoreSettingsActionState,
} from '../actions/storeSettings';
import { DEFAULT_STOREFRONT_ACCENT_HUE, STOREFRONT_ACCENT_PRESETS } from '../lib/theme';

const initialActionState: StoreSettingsActionState = { ok: false, message: '' };

function Field({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {note ? <span className="text-xs font-normal leading-5 text-muted-foreground">{note}</span> : null}
    </label>
  );
}

export function StoreSettingsForm({ settings }: { settings: OperatorMarketplaceSettings | null }) {
  const [state, formAction, pending] = useActionState(saveMarketplaceSettings, initialActionState);
  const [accentHue, setAccentHue] = useState(settings?.accentHue ?? DEFAULT_STOREFRONT_ACCENT_HUE);

  return (
    <form action={formAction} className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
      <div className="grid gap-6">
        {!settings ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" role="status">
            <p className="font-semibold">No storefront settings are saved.</p>
            <p className="mt-1">Public routes show an explicit unconfigured state until an authorized operator saves and publishes this form.</p>
          </div>
        ) : !settings.isPublished ? (
          <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100" role="status">
            <p className="font-semibold">The storefront identity is unpublished.</p>
            <p className="mt-1">Public routes show an unavailable state. This does not change listing publication, calendar availability, quotes, reservations, or payments.</p>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border bg-card">
          <header className="flex items-center gap-2 border-b bg-muted/20 px-5 py-3">
            <Store className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Identity and contact</h2>
          </header>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Field label="Storefront name"><Input required minLength={2} maxLength={120} name="name" defaultValue={settings?.name ?? ''} placeholder="Your accommodation marketplace" /></Field>
            <Field label="Tagline"><Input maxLength={160} name="tagline" defaultValue={settings?.tagline ?? ''} placeholder="Independent homes, directly hosted" /></Field>
            <div className="sm:col-span-2"><Field label="Homepage headline"><Input required minLength={2} maxLength={160} name="homepageHeadline" defaultValue={settings?.homepageHeadline ?? ''} placeholder="Stay somewhere considered." /></Field></div>
            <div className="sm:col-span-2"><Field label="Public description"><Textarea maxLength={1000} rows={4} name="publicDescription" defaultValue={settings?.publicDescription ?? ''} placeholder="Describe the homes and direct host relationship without making unsupported availability or payment claims." /></Field></div>
            <Field label="Support email"><Input type="email" name="supportEmail" defaultValue={settings?.supportEmail ?? ''} placeholder="hello@example.com" /></Field>
            <Field label="Support phone"><Input maxLength={80} name="supportPhone" defaultValue={settings?.supportPhone ?? ''} placeholder="+1 555 0100" /></Field>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border bg-card">
          <header className="border-b bg-muted/20 px-5 py-3"><h2 className="text-sm font-semibold">Localization and map center</h2></header>
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <Field label="Currency"><Input required minLength={3} maxLength={3} name="currencyCode" defaultValue={settings?.currencyCode ?? 'USD'} /></Field>
            <Field label="Locale"><Input required name="locale" defaultValue={settings?.locale ?? 'en-US'} /></Field>
            <Field label="Timezone"><Input required name="timezone" defaultValue={settings?.timezone ?? 'America/New_York'} /></Field>
            <Field label="Map latitude"><Input type="number" min={-90} max={90} step="any" name="defaultMapLatitude" defaultValue={settings?.defaultMapLatitude ?? ''} /></Field>
            <Field label="Map longitude"><Input type="number" min={-180} max={180} step="any" name="defaultMapLongitude" defaultValue={settings?.defaultMapLongitude ?? ''} /></Field>
          </div>
        </section>
      </div>

      <aside className="grid content-start gap-6">
        <section className="overflow-hidden rounded-lg border bg-card">
          <header className="flex items-center gap-2 border-b bg-muted/20 px-5 py-3">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Storefront accent</h2>
          </header>
          <div className="grid gap-5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-sm font-medium">Accent hue</p><p className="text-xs text-muted-foreground">Lightness and chroma remain fixed for legibility.</p></div>
              <div className="h-10 w-10 rounded-full border" style={{ background: `oklch(38% 0.09 ${accentHue})` }} aria-hidden="true" />
            </div>
            <input type="range" name="accentHue" min="0" max="359" step="1" value={accentHue} onChange={(event) => setAccentHue(Number(event.target.value))} aria-label="Storefront accent hue" className="w-full accent-primary" />
            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground"><span>0°</span><output>{accentHue}°</output><span>359°</span></div>
            <div className="grid grid-cols-3 gap-2">
              {STOREFRONT_ACCENT_PRESETS.map((preset) => (
                <button key={preset.value} type="button" onClick={() => setAccentHue(preset.value)} className="grid justify-items-center gap-1 rounded-md border p-2 text-xs hover:bg-muted" aria-label={`Use ${preset.label} accent`}>
                  <span className="h-6 w-6 rounded-full border" style={{ background: `oklch(38% 0.09 ${preset.value})` }} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="isPublished" defaultChecked={settings?.isPublished ?? false} className="mt-1 h-4 w-4 accent-primary" />
            <span><span className="block text-sm font-semibold">Publish storefront identity and theme</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">This switch never asserts home availability, quote validity, reservation confirmation, payment acceptance, or settlement.</span></span>
          </label>
        </section>

        {state.message ? <div role="status" className={`rounded-lg border p-4 text-sm ${state.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100'}`}>{state.message}</div> : null}

        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {pending ? 'Saving…' : settings ? 'Save storefront settings' : 'Create storefront settings'}
        </Button>
      </aside>
    </form>
  );
}
