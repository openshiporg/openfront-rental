// Demo-account guard: features/keystone/lib/demo-guard.ts. Offline, no DB.
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
  vm.runInNewContext(output, { module, exports: module.exports, require, process, Symbol }, { filename });
  return module.exports;
}

const guard = load('features/keystone/lib/demo-guard.ts');
const { DEMO_GUARD_MESSAGE, withDemoGuard, DEMO_GUARD_POLICY, rewriteDemoErrors } = guard;
const env = { DEMO_USER_EMAILS: ' Other@example.com , HOUSEKIND@openship.org ' };

const DEMO = { itemId: 'demo', listKey: 'User', data: { email: 'housekind@openship.org' } };
const ADMIN = { itemId: 'admin', listKey: 'User', data: { email: 'owner@openship.org' } };

// Lists shaped like the real ones; Listing (the catalogue) carries an existing hook to prove it still runs.
let productHookRan = 0;
const lists = withDemoGuard({
  User: { fields: {} },
  Role: { fields: {} },
  MarketplaceSettings: { fields: {} },
  HostOrganization: { fields: {} },
  Listing: { fields: {}, hooks: { beforeOperation: { update: () => { productHookRan++; } } } },
}, DEMO_GUARD_POLICY, env);

function run(listKey, operation, session, { item, inputData } = {}) {
  const context = { session, sudo: () => context };
  const hook = lists[listKey].hooks?.beforeOperation;
  const fn = typeof hook === 'function' ? hook : hook?.[operation];
  if (!fn) return Promise.resolve();
  return fn({ listKey, operation, context, item, inputData, resolvedData: inputData });
}

async function refused(promise) {
  await assert.rejects(promise, (error) => error.message === DEMO_GUARD_MESSAGE);
}

test('the exact copy', () => {
  assert.equal(DEMO_GUARD_MESSAGE, "Demo accounts can't change this.");
});

test('1. a demo user cannot change any password or email, its own included', async () => {
  await refused(run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { password: 'x' } }));
  await refused(run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { email: 'a@b.c' } }));
  await refused(run('User', 'update', DEMO, { item: { id: 'admin' }, inputData: { password: 'x' } }));
  await refused(run('User', 'update', DEMO, { item: { id: 'admin' }, inputData: { email: 'a@b.c' } }));
});

test('2. a demo user cannot change roles or a user\'s role', async () => {
  await refused(run('Role', 'create', DEMO, { inputData: { name: 'X' } }));
  await refused(run('Role', 'update', DEMO, { item: { id: 'r' }, inputData: { canManageUsers: true } }));
  await refused(run('Role', 'delete', DEMO, { item: { id: 'r' } }));
  await refused(run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { role: { connect: { id: 'r' } } } }));
});

test('3. a demo user cannot create, delete or update users, including the real admin', async () => {
  await refused(run('User', 'create', DEMO, { inputData: { name: 'New' } }));
  await refused(run('User', 'delete', DEMO, { item: { id: 'admin' } }));
  await refused(run('User', 'delete', DEMO, { item: { id: 'demo' } }));
  await refused(run('User', 'update', DEMO, { item: { id: 'admin' }, inputData: { name: 'Hacked' } }));
});

test('4. a demo user cannot change the store name, logo or URL settings', async () => {
  for (const field of ['name', 'tagline', 'logoIcon', 'logoColor']) {
    await refused(run('MarketplaceSettings', 'update', DEMO, { item: { id: 's' }, inputData: { [field]: 'x' } }));
  }
  await refused(run('HostOrganization', 'update', DEMO, { item: { id: 'h' }, inputData: { slug: 'x' } }));
  await refused(run('MarketplaceSettings', 'create', DEMO, { inputData: {} }));
  await refused(run('MarketplaceSettings', 'delete', DEMO, { item: { id: 's' } }));
});

test('a demo user can still edit a booking and its own onboarding state', async () => {
  await run('Listing', 'update', DEMO, { item: { id: 'p' }, inputData: { status: 'confirmed' } });
  assert.equal(productHookRan, 1, 'the existing Listing hook still runs');
  await run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { onboardingStatus: 'dismissed' } });
  await run('MarketplaceSettings', 'update', DEMO, { item: { id: 's' }, inputData: { supportEmail: 'a@b.c', accentHue: 200 } });
});

test('a non-demo admin is unaffected', async () => {
  await run('User', 'update', ADMIN, { item: { id: 'demo' }, inputData: { password: 'x', email: 'a@b.c', role: {} } });
  await run('User', 'create', ADMIN, { inputData: { name: 'New' } });
  await run('User', 'delete', ADMIN, { item: { id: 'x' } });
  await run('Role', 'update', ADMIN, { item: { id: 'r' }, inputData: { name: 'Y' } });
  await run('MarketplaceSettings', 'update', ADMIN, { item: { id: 's' }, inputData: { name: 'New name' } });
  await run('User', 'update', null, { item: { id: 'x' }, inputData: { password: 'x' } });
});

test('a session without data.email is resolved from the user record', async () => {
  const session = { itemId: 'demo', listKey: 'User' };
  const context = { session, sudo: () => ({ db: { User: { findOne: async () => ({ email: 'Housekind@Openship.org' }) } } }) };
  await refused(lists.User.hooks.beforeOperation({ listKey: 'User', operation: 'update', context, item: { id: 'demo' }, inputData: { password: 'x' } }));
});

test('no DEMO_USER_EMAILS means no guard', async () => {
  const open = withDemoGuard({ Role: { fields: {} } }, DEMO_GUARD_POLICY, {});
  await open.Role.hooks.beforeOperation({ listKey: 'Role', operation: 'delete', context: { session: DEMO }, item: { id: 'r' } });
});

test('Keystone\'s hook wrapper is rewritten to the exact copy', () => {
  const wrapped = { message: `An error occurred while running "beforeOperation".\n  - MarketplaceSettings.hooks.beforeOperation: ${DEMO_GUARD_MESSAGE}`, path: ['updateMarketplaceSettings'] };
  const other = { message: 'Something else' };
  const result = rewriteDemoErrors({ data: { updateMarketplaceSettings: null }, errors: [wrapped, other] });
  assert.equal(result.errors[0].message, DEMO_GUARD_MESSAGE);
  assert.equal(result.errors[0].extensions.code, 'KS_ACCESS_DENIED');
  assert.equal(result.errors[1], other);
});

test('the guard is wired into the Keystone config and the GraphQL route', () => {
  const config = fs.readFileSync(path.join(root, 'features/keystone/index.ts'), 'utf8');
  assert.match(config, /lists: boundedModels|withDemoGuard\(models\)/);
  const route = fs.readFileSync(path.join(root, 'pages/api/graphql.ts'), 'utf8');
  assert.match(route, /useDemoGuardErrors\(\)/);
});

test('guest-profile writes past the list hooks refuse a demo session', () => {
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  assert.equal((read('features/keystone/mutations/guestJourneys.ts').match(/assertNotDemo\(context\)/g) || []).length, 2);
  assert.match(read('features/keystone/onboarding/rentalOnboarding.ts'), /assertNotDemo\(context\)/);
});

test('a demo user can still change other User fields on its own record', async () => {
  await run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { phone: '1', onboardingStatus: 'completed' } });
});

test('day-to-day lists are outside the policy: listing photos, payments and refunds are never guarded', async () => {
  assert.deepEqual(Object.keys(DEMO_GUARD_POLICY).sort(), ['HostOrganization', 'MarketplaceSettings', 'Role', 'User']);
  const mutations = fs.readFileSync(path.join(root, 'features/keystone/mutations/stayFinancialOperations.ts'), 'utf8')
    + fs.readFileSync(path.join(root, 'features/keystone/mutations/stayRefundOperations.ts'), 'utf8');
  assert.doesNotMatch(mutations, /assertNotDemo|demo-guard/);
});
