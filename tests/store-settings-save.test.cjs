// Store Settings save path and storefront render rule. Offline.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relative) {
  const filename = path.resolve(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const module = { exports: {} };
  const localRequire = (spec) => spec.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(filename), spec.endsWith('.ts') ? spec : `${spec}.ts`))) : require(spec);
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire }, { filename });
  return module.exports;
}
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const { sanitizeStoreLogoSvg } = load('features/keystone/utils/storeLogo.ts');
const { normalizeStoreLogoColor, DEFAULT_STORE_LOGO_COLOR, DEFAULT_STORE_LOGO_ICON } = load('features/platform/store-settings/lib/store-logo.ts');
const { LOGO_ICONS } = load('features/platform/store-settings/lib/icon-registry.ts');
const { parseMarketplaceSettingsForm } = load('features/platform/store-settings/lib/validation.ts');

function form(fields) {
  const base = { name: 'Stay Co', homepageHeadline: 'Stay here', currencyCode: 'USD', locale: 'en-US', timezone: 'America/New_York' };
  const data = new Map(Object.entries({ ...base, ...fields }));
  return { get: (key) => (data.has(key) ? data.get(key) : null) };
}

test('the action composes sanitize, normalize, mutation and revalidate', () => {
  const action = read('features/platform/store-settings/actions/storeSettings.ts');
  assert.match(action, /parseMarketplaceSettingsForm\(formData\)/);
  assert.match(action, /\{ data: parsed\.data \}/);
  assert.match(action, /revalidatePath\('\/dashboard\/platform\/store-settings'\)/);
  const validation = read('features/platform/store-settings/lib/validation.ts');
  assert.ok(validation.indexOf('sanitizeStoreLogoSvg(submittedLogo)') < validation.indexOf('normalizeStoreLogoColor(formData.get'));
});

test('a preset icon and hue reach the mutation payload unchanged; name and tagline stay editable', () => {
  const icon = LOGO_ICONS[3].lightSvg;
  const result = parseMarketplaceSettingsForm(form({ logoIcon: icon, logoColor: '120', name: 'Renamed', tagline: 'New tagline' }));
  assert.equal(result.ok, true);
  assert.equal(result.data.logoIcon, icon);
  assert.equal(result.data.logoColor, '120');
  assert.equal(result.data.name, 'Renamed');
  assert.equal(result.data.tagline, 'New tagline');
});

test('every preset survives the sanitizer', () => {
  for (const icon of LOGO_ICONS) assert.equal(sanitizeStoreLogoSvg(icon.lightSvg), icon.lightSvg.trim(), icon.id);
});

test('a pasted custom SVG is kept, trimmed', () => {
  const svg = '<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m48 11h-17z" fill="#087443"/></svg>';
  assert.equal(parseMarketplaceSettingsForm(form({ logoIcon: `\n${svg} ` })).data.logoIcon, svg);
});

test('the hue is normalized to 0-359', () => {
  assert.equal(normalizeStoreLogoColor('-90'), '270');
  assert.equal(normalizeStoreLogoColor('400'), '40');
  assert.equal(normalizeStoreLogoColor('red'), DEFAULT_STORE_LOGO_COLOR);
  assert.equal(parseMarketplaceSettingsForm(form({ logoColor: '-90' })).data.logoColor, '270');
});

test('an unsafe SVG rejects the save', () => {
  const result = parseMarketplaceSettingsForm(form({ logoIcon: '<svg onload="alert(1)"></svg>' }));
  assert.equal(result.ok, false);
});

test('render rule: the icon is always shown; an empty icon renders the default, never a hidden mark', () => {
  assert.ok(sanitizeStoreLogoSvg(DEFAULT_STORE_LOGO_ICON));
  const shell = read('features/storefront/components/StorefrontShell.tsx');
  assert.doesNotMatch(shell, /storeOwnMark/);
  assert.match(shell, /DEFAULT_STORE_LOGO_ICON/);
  assert.equal(fs.existsSync(path.join(root, 'features/storefront/lib/store-mark.ts')), false);
  const publicQuery = read('features/keystone/mutations/publicMarketplaceSettings.ts');
  assert.match(publicQuery, /savedLogo \|\| DEFAULT_STORE_LOGO_ICON/);
});
