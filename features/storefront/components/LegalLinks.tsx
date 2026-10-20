import Link from 'next/link';

export type LegalDocumentLink = { url: string; version: string };

/** A store document link: external documents open in a new tab. */
export function LegalDocumentAnchor({ document, label }: { document: LegalDocumentLink; label: string }) {
  const external = document.url.startsWith('http');
  return <Link className="stay-text-link" href={document.url} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{label}</Link>;
}

/** The published documents from public settings (a document needs both its link and version). */
export function legalDocuments(settings: { privacyPolicyUrl?: string | null; privacyPolicyVersion?: string | null; termsUrl?: string | null; termsVersion?: string | null } | null | undefined) {
  return {
    privacyPolicy: settings?.privacyPolicyUrl && settings.privacyPolicyVersion ? { url: settings.privacyPolicyUrl, version: settings.privacyPolicyVersion } : null,
    termsOfUse: settings?.termsUrl && settings.termsVersion ? { url: settings.termsUrl, version: settings.termsVersion } : null,
  };
}

/**
 * The store's own published privacy policy and terms, when it has set them in Store Settings.
 * Nothing is implied to exist, or to have been accepted, when they aren't published. Reading
 * the privacy policy is a notice; accepting the terms is asked for separately where required.
 */
export function LegalLinks({ privacyPolicy, termsOfUse, context }: { privacyPolicy?: LegalDocumentLink | null; termsOfUse?: LegalDocumentLink | null; context: 'account' | 'booking' }) {
  const links = [
    privacyPolicy ? { document: privacyPolicy, label: `Privacy policy (version ${privacyPolicy.version})` } : null,
    termsOfUse ? { document: termsOfUse, label: `Terms of use (version ${termsOfUse.version})` } : null,
  ].filter(Boolean) as Array<{ document: LegalDocumentLink; label: string }>;
  if (!links.length) {
    return <p className="stay-form-note">This store hasn’t published a privacy policy or terms of use here. Ask the host for them before you {context === 'account' ? 'create an account' : 'book'} if you need them.</p>;
  }
  return <p className="stay-form-note">
    {context === 'account' ? 'Before creating an account, read the store’s ' : 'Before booking, read the store’s '}
    {links.map((link, index) => <span key={link.document.url}>{index ? ' and ' : ''}<LegalDocumentAnchor document={link.document} label={link.label} /></span>)}.
  </p>;
}
