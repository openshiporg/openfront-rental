// Load every dashboard and storefront page as each role; print PASS/FAIL per page.
// CRAWL_BASE=<url> CRAWL_LOGINS=<json {role:{email,password}}> [CRAWL_OUT=<prefix>] node scripts/r6-crawl.mjs [roles...]
import fs from 'node:fs'
import { chromium } from '/Users/junaid/Code/vibeghost/vibeghost/node_modules/playwright/index.mjs'

const BASE = process.env.CRAWL_BASE
const people = JSON.parse(fs.readFileSync(process.env.CRAWL_LOGINS, 'utf8'))
const roles = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(people)
const OUT = process.env.CRAWL_OUT

async function gql(query, cookie) {
  const r = await fetch(BASE + '/api/graphql', { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ query }) })
  return r.json()
}
const p0 = people[roles[0]]
const tr = await (await fetch(BASE + '/api/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'mutation($e:String!,$p:String!){authenticateUserWithPassword(email:$e,password:$p){... on UserAuthenticationWithPasswordSuccess{sessionToken}}}', variables: { e: p0.email, p: p0.password } }) })).json()
const cookie = 'keystonejs-session=' + tr.data?.authenticateUserWithPassword?.sessionToken
const dr = await gql(`{properties(take:1){id} listings(take:1){id slug} guests:guestProfiles(take:1){id} reservations(take:1){id} agreements:stayAgreements(take:1){id} payments(take:1){id} reviews(take:1){id} payouts(take:1){id} conversations(take:1){id}}`, cookie)
if (!dr.data) { console.log('CHECK crawl id lookup: FAIL ' + JSON.stringify(dr.errors?.[0]?.message)); process.exit(1) }
const d = dr.data
const one = (k) => d[k]?.[0]?.id
const sections = ['today', 'calendar', 'channels', 'channels?view=jobs', 'channels?view=events', 'listings', 'properties', 'reservations', 'guests', 'inbox', 'tasks', 'payments', 'payouts', 'pricing', 'agreements', 'reviews', 'reports', 'store-settings']
const lists = { listings: 'listings', properties: 'properties', reservations: 'reservations', guests: 'guests', inbox: 'conversations', payments: 'payments', agreements: 'agreements', reviews: 'reviews', payouts: 'payouts' }
const items = Object.entries(lists).filter(([, k]) => one(k)).map(([path, k]) => `${path}/${one(k)}`)
const nope = ['listings', 'properties', 'reservations', 'guests', 'inbox', 'payments', 'agreements', 'reviews', 'pricing', 'payouts'].map((s) => `${s}/nope123`)
const staff = [...sections, ...items].map((s) => ['/dashboard/platform/' + s, false]).concat(nope.map((s) => ['/dashboard/platform/' + s, true]))
const slug = d.listings?.[0]?.slug
const pub = ['/', '/search', '/collections', '/compare', '/help', '/policies', '/stays/nope123', '/dashboard/platform/inbox/nope123'].map((s) => [s, s.includes('nope123')])
pub.push(['/trips/nope123', false])
if (slug) pub.push(['/stays/' + slug, false])
const paths = [...staff, ...pub]
const b = await chromium.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
const res = {}; let bad = 0
for (const role of roles) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })
  const p = await ctx.newPage()
  await p.goto(BASE + '/dashboard/signin')
  await p.fill('input[name=email]', people[role].email)
  await p.fill('input[name=password]', people[role].password)
  await Promise.all([p.waitForURL((u) => !u.pathname.includes('signin'), { timeout: 30000 }), p.click('button[type=submit]')])
  for (const [path, expect404] of paths) {
    const r = await p.goto(BASE + path, { waitUntil: 'load', timeout: 120000 }).catch(() => null)
    const txt = await p.evaluate(() => document.body.innerText).catch(() => '')
    const http = r?.status() ?? 0
    const broken = !expect404 && /this page could not be loaded|something went wrong|application error|QUERY_TOO_BROAD|too broad/i.test(txt)
    const ok = expect404 ? http === 404 : http === 200 && !broken
    res[`${role} ${path}`] = { http, broken, expect404 }
    if (!ok) bad++
    console.log(`CHECK ${role} ${path}: ${ok ? 'PASS' : 'FAIL'} (${http}${expect404 ? ' expected 404' : ''})`)
  }
  await ctx.close()
}
await b.close()
if (OUT) fs.writeFileSync(OUT + '.json', JSON.stringify(res, null, 1))
console.log(`CHECK all pages: ${bad ? 'FAIL' : 'PASS'} (${Object.keys(res).length} loads, ${bad} failed)`)
process.exit(bad ? 1 : 0)
