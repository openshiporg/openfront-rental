'use client';

import { useActionState, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Eye, EyeOff, Globe2, Loader2, Palette, Save, Shapes, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TimezoneInput } from '@/features/platform/operations/components/FormControls';
import { cn } from '@/lib/utils';
import {
  saveMarketplaceSettings,
  type OperatorMarketplaceSettings,
  type StoreSettingsActionState,
} from '../actions/storeSettings';
import { DEFAULT_STORE_LOGO_ICON, DEFAULT_LIBRARY_LOGO_COLOR, usesDefaultStoreLogo, normalizeStoreLogoColor } from '../lib/store-logo';
import { logoColorForAccentHue, storefrontAccentHueFromLogoColor, STOREFRONT_ACCENT_PRESETS } from '../lib/theme';
import { LogoPicker } from './LogoPicker';
import { StoreLogoMark } from './StoreLogoMark';

const initialActionState: StoreSettingsActionState = { ok: false, message: '' };
const accent = (hue: number) => `oklch(38% 0.09 ${hue})`;

function Field({ label, children, note, className }: { label: string; children: ReactNode; note?: string; className?: string }) {
  return (
    <label className={cn('grid min-w-0 content-start gap-1.5', className)}>
      <span className="text-xs font-medium">{label}</span>
      {children}
      {note ? <span className="text-xs leading-5 text-muted-foreground">{note}</span> : null}
    </label>
  );
}

function SettingsGroup({ icon: Icon, title, description, children }: { icon: typeof Store; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b pb-8 last:border-b-0 last:pb-0 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Icon aria-hidden="true" className="size-4 text-muted-foreground" />{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="min-w-0 rounded-xl border bg-card p-5 shadow-xs">{children}</div>
    </section>
  );
}

const inputClass = 'h-9 px-3 text-sm';

function StorefrontPreview({ hue, logoIcon, logoColor, name, tagline, headline, className }: { hue: number; logoIcon: string; logoColor: string; name: string; tagline: string; headline: string; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}>
      <div className="h-1.5" style={{ background: accent(hue) }} />
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <StoreLogoMark logoIcon={logoIcon} logoColor={logoColor} className="block size-6 shrink-0 overflow-hidden [&>svg]:block [&>svg]:size-full" />
          <span className="truncate text-sm font-semibold">{name || 'Storefront name'}</span>
        </div>
        {tagline ? <p className="text-xs text-muted-foreground">{tagline}</p> : null}
        <p className="text-lg font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">{headline || 'Homepage headline'}</p>
        <span className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-white" style={{ background: accent(hue) }}>Find a stay</span>
      </div>
    </div>
  );
}

export function StoreSettingsForm({ settings }: { settings: OperatorMarketplaceSettings | null }) {
  const [state, formAction, pending] = useActionState(saveMarketplaceSettings, initialActionState);
  const usesDefaultLogo = usesDefaultStoreLogo(settings?.logoIcon, settings?.logoColor);
  const [logoIcon, setLogoIcon] = useState(!usesDefaultLogo && settings?.logoIcon ? settings.logoIcon : DEFAULT_STORE_LOGO_ICON);
  const [logoColor, setLogoColor] = useState(usesDefaultLogo ? DEFAULT_LIBRARY_LOGO_COLOR : normalizeStoreLogoColor(settings?.logoColor));
  const accentHue = storefrontAccentHueFromLogoColor(logoColor);
  const [published, setPublished] = useState(settings?.isPublished ?? false);
  const [preview, setPreview] = useState({ name: settings?.name ?? '', tagline: settings?.tagline ?? '', homepageHeadline: settings?.homepageHeadline ?? '' });

  function trackPreview(event: FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement;
    if (target?.name === 'name' || target?.name === 'tagline' || target?.name === 'homepageHeadline') {
      setPreview((current) => ({ ...current, [target.name]: target.value }));
    }
  }

  return (
    <form action={formAction} onInput={trackPreview} className="min-w-0">
      <div className="grid min-w-0 items-start gap-8 px-4 pb-8 md:px-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          {!settings ? (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100" role="status">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <div><p className="font-medium">No storefront settings saved yet</p><p className="mt-0.5 leading-6 opacity-90">Public pages show an “unconfigured” state until you save and publish this form.</p></div>
            </div>
          ) : null}

          <SettingsGroup icon={Store} title="Identity">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Storefront name"><Input className={inputClass} required minLength={2} maxLength={120} name="name" defaultValue={settings?.name ?? ''} placeholder="Your accommodation marketplace" /></Field>
              <Field label="Tagline"><Input className={inputClass} maxLength={160} name="tagline" defaultValue={settings?.tagline ?? ''} placeholder="Independent homes, directly hosted" /></Field>
              <Field label="Homepage headline" className="sm:col-span-2"><Input className={inputClass} required minLength={2} maxLength={160} name="homepageHeadline" defaultValue={settings?.homepageHeadline ?? ''} placeholder="Stay somewhere considered." /></Field>
              <Field label="Public description" className="sm:col-span-2" note="Up to 1,000 characters."><Textarea maxLength={1000} rows={4} name="publicDescription" defaultValue={settings?.publicDescription ?? ''} placeholder="Describe the homes and the direct host relationship." /></Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={Globe2} title="Contact & region">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
              <Field label="Support email" className="lg:col-span-3"><Input className={inputClass} type="email" name="supportEmail" defaultValue={settings?.supportEmail ?? ''} placeholder="hello@example.com" /></Field>
              <Field label="Support phone" className="lg:col-span-3"><Input className={inputClass} maxLength={80} name="supportPhone" defaultValue={settings?.supportPhone ?? ''} placeholder="+1 555 0100" /></Field>
              <Field label="Support hours" className="lg:col-span-3" note="When guests can expect a reply. Leave blank to hide."><Textarea maxLength={300} rows={3} name="supportHours" defaultValue={settings?.supportHours ?? ''} placeholder="Mon–Fri, 9:00–17:00" /></Field>
              <Field label="Office address" className="lg:col-span-3" note="Business mailing address. Leave blank to hide."><Textarea maxLength={300} rows={3} name="officeAddress" defaultValue={settings?.officeAddress ?? ''} placeholder={'Street and number\nCity, region, postal code'} /></Field>
              <Field label="Privacy policy link" className="lg:col-span-3" note="Your published policy (https:// or a page on this site). Leave blank if not published."><Input className={inputClass} type="text" maxLength={500} name="privacyPolicyUrl" defaultValue={settings?.privacyPolicyUrl ?? ''} placeholder="https://" /></Field>
              <Field label="Terms of use link" className="lg:col-span-3" note="Your published terms. Leave blank if not published."><Input className={inputClass} type="text" maxLength={500} name="termsUrl" defaultValue={settings?.termsUrl ?? ''} placeholder="https://" /></Field>
              <Field label="Privacy policy version" className="lg:col-span-3" note="Required with a link, e.g. its publication date. Recorded with what guests were shown."><Input className={inputClass} type="text" maxLength={60} name="privacyPolicyVersion" defaultValue={settings?.privacyPolicyVersion ?? ''} placeholder="2026-10-01" /></Field>
              <Field label="Terms of use version" className="lg:col-span-3" note="Required with a link. Guests accept this exact version at sign-up and checkout."><Input className={inputClass} type="text" maxLength={60} name="termsVersion" defaultValue={settings?.termsVersion ?? ''} placeholder="2026-10-01" /></Field>
              <Field label="Currency" className="lg:col-span-2" note="ISO code, e.g. USD"><Input className={cn(inputClass, 'uppercase')} required minLength={3} maxLength={3} name="currencyCode" defaultValue={settings?.currencyCode ?? 'USD'} /></Field>
              <Field label="Storefront locale" className="lg:col-span-2" note="e.g. en-US"><Input className={inputClass} required name="locale" defaultValue={settings?.locale ?? 'en-US'} /></Field>
              <Field label="Storefront timezone" className="lg:col-span-2" note="IANA name"><TimezoneInput listId="storefront-timezones" required name="timezone" defaultValue={settings?.timezone ?? 'America/New_York'} /></Field>
              <Field label="Map center latitude" className="lg:col-span-3"><Input className={inputClass} type="number" min={-90} max={90} step="any" name="defaultMapLatitude" defaultValue={settings?.defaultMapLatitude ?? ''} placeholder="40.7128" /></Field>
              <Field label="Map center longitude" className="lg:col-span-3"><Input className={inputClass} type="number" min={-180} max={180} step="any" name="defaultMapLongitude" defaultValue={settings?.defaultMapLongitude ?? ''} placeholder="-74.0060" /></Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={Shapes} title="Logo" description="Logo color also sets the storefront color.">
            <input type="hidden" name="logoIcon" value={logoIcon} />
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <div className="flex size-16 items-center justify-center rounded-lg border bg-background p-2">
                <StoreLogoMark logoIcon={logoIcon} logoColor={logoColor} className="block size-full [&>svg]:block [&>svg]:size-full" />
              </div>
              <LogoPicker value={logoIcon} hue={logoColor} onChange={setLogoIcon} />
            </div>
            <div className="mt-5 border-t pt-4">
              <div className="flex items-center justify-between gap-4"><span className="text-xs font-medium">Logo color</span><output className="font-mono text-[11px] text-muted-foreground">{logoColor}°</output></div>
              <input type="range" name="logoColor" min="0" max="359" step="1" value={logoColor} onChange={(event) => setLogoColor(event.target.value)} aria-label="Logo hue rotation" className="mt-3 w-full accent-primary" />
            </div>
          </SettingsGroup>

          <SettingsGroup icon={Palette} title="Storefront color" description="Follows the logo color.">
            <div className="grid gap-5">
              <StorefrontPreview hue={accentHue} logoIcon={logoIcon} logoColor={logoColor} name={preview.name} tagline={preview.tagline} headline={preview.homepageHeadline} className="2xl:hidden" />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="group" aria-label="Accent presets">
                {STOREFRONT_ACCENT_PRESETS.map((preset) => {
                  const active = accentHue === preset.value;
                  return (
                    <button key={preset.value} type="button" onClick={() => setLogoColor(logoColorForAccentHue(preset.value))} aria-pressed={active} aria-label={`Use ${preset.label} color`} className={cn('grid justify-items-center gap-1.5 rounded-lg border p-2.5 text-xs transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active && 'border-foreground/40 bg-muted/60')}>
                      <span className="size-7 rounded-full ring-1 ring-black/10 dark:ring-white/15" style={{ background: accent(preset.value) }} />
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4">
                <span className="size-10 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15" style={{ background: accent(accentHue) }} aria-hidden="true" />
                <p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">Storefront hue <output className="font-mono text-foreground">{accentHue}°</output></p>
              </div>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={published ? Eye : EyeOff} title="Visibility" description="Publishing opens the storefront for browsing and booking. Listing publication and availability still apply per home.">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="isPublished" defaultChecked={settings?.isPublished ?? false} onChange={(event) => setPublished(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
              <span>
                <span className="block text-sm font-medium">Publish storefront</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{published ? 'Public pages use these settings once saved, and guests can quote and book.' : 'While unpublished, browsing, new quotes and new bookings are paused. Existing guests can still open their trips, agreements, messages and account.'}</span>
              </span>
            </label>
            <label className="mt-4 flex items-start gap-3 border-t pt-4">
              <input type="checkbox" name="allowTestBookings" defaultChecked={settings?.allowTestBookings ?? false} className="mt-0.5 size-4 shrink-0 accent-primary" />
              <span>
                <span className="block text-sm font-medium">Allow test bookings</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">Only while card checkout runs in Stripe test mode. A guest must choose a test booking at checkout: it holds no dates, takes only test-card payments, and stays out of real money, statements and reports. Ordinary bookings stay real.</span>
              </span>
            </label>
          </SettingsGroup>
        </div>

        <aside className="hidden min-w-0 2xl:block">
          <div className="sticky top-20 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Preview</p>
            <StorefrontPreview hue={accentHue} logoIcon={logoIcon} logoColor={logoColor} name={preview.name} tagline={preview.tagline} headline={preview.homepageHeadline} />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{published ? <Eye aria-hidden="true" className="size-3.5" /> : <EyeOff aria-hidden="true" className="size-3.5" />}{published ? 'Will be public after saving' : 'Not public'}</p>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="status" aria-live="polite" className="min-h-5 text-sm">
            {state.message ? (
              <span className={cn('inline-flex items-center gap-1.5', state.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
                {state.ok ? <CheckCircle2 aria-hidden="true" className="size-4" /> : <CircleAlert aria-hidden="true" className="size-4" />}{state.message}
              </span>
            ) : <span className="text-muted-foreground">{published ? 'Published on save' : 'Saved as unpublished'}</span>}
          </div>
          <Button type="submit" disabled={pending} className="sm:w-auto">
            {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
            {pending ? 'Saving…' : settings ? 'Save settings' : 'Create storefront settings'}
          </Button>
        </div>
      </div>
    </form>
  );
}
