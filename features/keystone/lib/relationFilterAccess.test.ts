// Needs DATABASE_URL pointing at a migrated scratch database. Run:
//   node --import tsx --test features/keystone/lib/relationFilterAccess.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

const role = (name: string, flags: Record<string, boolean>) => ({
  name, canAccessDashboard: true, ...flags,
})
const fullRole = (flags: string[]) => Object.fromEntries(flags.map(f => [f, true]))

test('where-filters through relations and read-gated fields give the same answer for every probe value', async () => {
  const { keystoneContext } = await import('../context')
  const sudo = keystoneContext.sudo()
  const db: any = (keystoneContext as any).prisma
  const tag = `flt${Date.now()}`
  const org = await db.hostOrganization.create({ data: { name: `${tag} org`, slug: tag, federationId: tag } })
  const roles: Record<string, any> = {}
  const defs: Record<string, string[]> = {
    reservationsOnly: ['canReadReservations'],
    guestsOnly: ['canReadGuests'],
    paymentsOnly: ['canReadPayments'],
    reservationsGuestsNoPeople: ['canReadReservations', 'canReadGuests'],
    admin: ['canManageRoles', 'canManagePeople', 'canSeeOtherPeople', 'canReadReservations', 'canReadGuests', 'canReadPayments', 'canReadProperties', 'canReadListings', 'canManageReservations'],
  }
  const users: Record<string, any> = {}
  for (const [key, flags] of Object.entries(defs)) {
    const r = await db.role.create({ data: role(`${tag} ${key}`, fullRole(flags)) })
    const u = await db.user.create({ data: { name: `${tag} Zed ${key}`, email: `${tag}-${key}@example.com`, password: 'x', roleId: r.id } })
    await db.hostMembership.create({ data: { hostOrganizationId: org.id, userId: u.id, membershipRole: 'manager', status: 'active' } })
    roles[key] = r
    users[key] = u
  }
  const guest = await db.guestProfile.create({ data: { name: `${tag} Alice Hidden`, email: `${tag}-g@example.com`, hostOrganizationId: org.id } })
  const reservation = await db.reservation.create({ data: { hostOrganizationId: org.id, guestId: guest.id, confirmationCode: `${tag}-R`, checkInDate: '2027-01-10', checkOutDate: '2027-01-12', tripTokenHash: `${tag}-hash`, tripTokenExpiresAt: new Date(Date.now() + 1e9), bookedById: users.admin.id } })
  await db.payment.create({ data: { hostOrganizationId: org.id, reservationId: reservation.id, guestId: guest.id, amountCents: 123456, providerPaymentId: `${tag}-pay`, idempotencyKey: `${tag}-idem` } })

  const asRole = (key: string) => keystoneContext.withSession({
    itemId: users[key].id, listKey: 'User',
    data: { name: users[key].name, isActive: true, role: { ...defs[key].reduce((a: any, f) => ({ ...a, [f]: true }), {}) } },
  } as any)
  const count = async (ctx: any, list: string, where: any) => {
    try { return await ctx.query[list].count({ where }) } catch (e: any) { return `error` }
  }
  const attacks = (list: string, make: (v: string) => any, hit: string, miss: string) => ({ list, make, hit, miss })
  const probes = [
    // role, list, where builder, value that exists, value that does not
    ['reservationsOnly', 'Reservation', (v: string) => ({ guest: { name: { startsWith: v } } }), `${tag} Alice`, 'Zzz'],
    ['reservationsOnly', 'Reservation', (v: string) => ({ guest: { email: { startsWith: v } } }), tag, 'zzz'],
    ['reservationsOnly', 'Reservation', (v: string) => ({ payments: { some: { providerPaymentId: { startsWith: v } } } }), tag, 'zzz'],
    ['reservationsOnly', 'Reservation', (v: string) => ({ bookedBy: { name: { startsWith: v } } }), tag, 'zzz'],
    ['reservationsOnly', 'Reservation', (v: string) => ({ tripTokenHash: { startsWith: v } }), tag, 'zzz'],
    ['reservationsOnly', 'Reservation', (v: string) => ({ bookedBy: { email: { startsWith: v } } }), tag, 'zzz'],
    ['reservationsGuestsNoPeople', 'Reservation', (v: string) => ({ bookedBy: { name: { startsWith: v } } }), tag, 'zzz'],
    ['reservationsGuestsNoPeople', 'GuestProfile', (v: string) => ({ reservations: { some: { bookedBy: { name: { startsWith: v } } } } }), tag, 'zzz'],
    ['guestsOnly', 'GuestProfile', (v: string) => ({ reservations: { some: { confirmationCode: { startsWith: v } } } }), tag, 'zzz'],
    ['guestsOnly', 'GuestProfile', (v: string) => ({ payments: { some: { providerPaymentId: { startsWith: v } } } }), tag, 'zzz'],
    ['paymentsOnly', 'Payment', (v: string) => ({ guest: { name: { startsWith: v } } }), `${tag} Alice`, 'Zzz'],
    ['paymentsOnly', 'Payment', (v: string) => ({ reservation: { confirmationCode: { startsWith: v } } }), tag, 'zzz'],
    ['paymentsOnly', 'Payment', (v: string) => ({ reservation: { tripTokenHash: { startsWith: v } } }), tag, 'zzz'],
  ] as const
  void attacks

  // A role that can read both lists keeps the real filter (not blanket-refused).
  const both = asRole('reservationsGuestsNoPeople')
  assert.equal(await count(both, 'Reservation', { guest: { name: { startsWith: `${tag} Alice` } } }), 1)
  assert.equal(await count(both, 'Reservation', { guest: { name: { startsWith: 'Zzz' } } }), 0)

  const results: string[] = []
  for (const [key, list, make, hit, miss] of probes) {
    const ctx = asRole(key)
    const a = await count(ctx, list, make(hit))
    const b = await count(ctx, list, make(miss))
    results.push(`${key} ${list}: hit=${a} miss=${b}`)
    assert.ok(a === b || a === 'error' || b === 'error', `${key} ${list} leaks: hit=${a} miss=${b}`)
  }
  // The same probe order-by is refused too.
  try {
    await asRole('reservationsOnly').query.Reservation.findMany({ orderBy: [{ tripTokenHash: 'asc' }], query: 'id' })
    assert.fail('orderBy tripTokenHash should be refused')
  } catch (e: any) { assert.notEqual(e.code, 'ERR_ASSERTION') }

  // Anonymous: nothing readable, nothing filterable.
  const anon = keystoneContext
  for (const [list, where] of [
    ['Reservation', { guest: { name: { startsWith: `${tag} Alice` } } }], ['Reservation', { guest: { name: { startsWith: 'Zzz' } } }],
    ['GuestProfile', { payments: { some: { amountCents: { gt: 0 } } } }], ['User', { email: { startsWith: tag } }],
  ] as const) {
    const n = await count(anon, list, where)
    assert.ok(n === 0 || n === 'error', `anonymous ${list} count ${n}`)
  }

  // Admin keeps its real filters.
  const adminCtx = asRole('admin')
  assert.equal(await count(adminCtx, 'Reservation', { guest: { name: { startsWith: `${tag} Alice` } } }), 1)
  assert.equal(await count(adminCtx, 'Reservation', { guest: { name: { startsWith: 'Zzz' } } }), 0)
  assert.equal(await count(adminCtx, 'Reservation', { payments: { some: { providerPaymentId: { startsWith: tag } } } }), 1)
  assert.equal(await count(adminCtx, 'GuestProfile', { reservations: { some: { bookedBy: { name: { startsWith: tag } } } } }), 1)
  // Server code (sudo) still finds a record by token hash.
  assert.equal((await sudo.query.Reservation.findMany({ where: { tripTokenHash: { equals: `${tag}-hash` } }, query: 'id' })).length, 1)
  console.log(results.join('\n'))

  await db.payment.deleteMany({ where: { hostOrganizationId: org.id } })
  await db.reservation.deleteMany({ where: { hostOrganizationId: org.id } })
  await db.guestProfile.deleteMany({ where: { hostOrganizationId: org.id } })
  await db.hostMembership.deleteMany({ where: { hostOrganizationId: org.id } })
  await db.user.deleteMany({ where: { email: { startsWith: tag } } })
  await db.role.deleteMany({ where: { name: { startsWith: tag } } })
  await db.hostOrganization.delete({ where: { id: org.id } })
})
