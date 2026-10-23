// Podmetnuti Supabase (testovi): window.__ROWS po tablici, window.__USER, window.__RPC(n,a)
(() => {
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
  window.__CALLS = []
  const rnd = n => Array.from({ length: n }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 32)]).join('')
  const tbl = name => {
    const st = { f: [], ord: null, lim: null, rng: null, head: false, op: 'select', payload: null, one: null, sel: false }
    const run = () => {
      if (window.__BEZ_TABLICA && window.__BEZ_TABLICA.includes(name)) return { data: null, error: { code: '42P01', message: 'relation "public.' + name + '" does not exist' } }
      const all = window.__ROWS[name] || (window.__ROWS[name] = [])
      if (st.op !== 'select') {
        window.__CALLS.push(name + ':' + st.op + ':' + JSON.stringify(st.payload))
        if (window.__ODBIJ && window.__ODBIJ(name, st.op, st.payload)) return { data: null, error: window.__ODBIJ(name, st.op, st.payload) }
        const hit = all.filter(r => st.f.every(fn => fn(r)))
        let data
        if (st.op === 'update') { hit.forEach(r => Object.assign(r, st.payload)); data = hit }
        else if (st.op === 'delete') { window.__ROWS[name] = all.filter(r => !hit.includes(r)); data = hit }
        else {
          const add = [].concat(st.payload).map(r => ({ id: r.id || ('x' + rnd(8)), created_at: new Date().toISOString(), ...(name === 'bookings' && !r.token ? { token: rnd(16), is_active: true } : {}), ...r }))
          if (st.op === 'upsert') add.forEach(n => { const i = all.findIndex(r => (n.id && r.id === n.id) || (name === 'availability' && r.property_id === n.property_id && r.date === n.date)); if (i >= 0) all.splice(i, 1) })
          all.push(...add); data = add
        }
        if (st.one) return { data: data[0] || null, error: null }
        return { data, error: null }
      }
      let d = all.filter(r => st.f.every(fn => fn(r)))
      if (st.ord) d = [...d].sort((a, b) => cmp(a[st.ord.c], b[st.ord.c]) * (st.ord.asc ? 1 : -1))
      const count = d.length
      if (st.rng) d = d.slice(st.rng[0], st.rng[1] + 1)
      if (st.lim != null) d = d.slice(0, st.lim)
      if (st.one === 'single') return d.length ? { data: d[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } }
      if (st.one === 'maybe') return { data: d[0] || null, error: null }
      return { data: st.head ? null : d, error: null, count }
    }
    const self = {
      select(c, o) { if (o && o.head) st.head = true; st.sel = true; return self },
      eq(c, v) { st.f.push(r => r[c] === v); return self }, neq(c, v) { st.f.push(r => r[c] !== v); return self },
      gte(c, v) { st.f.push(r => r[c] >= v); return self }, gt(c, v) { st.f.push(r => r[c] > v); return self },
      lt(c, v) { st.f.push(r => r[c] < v); return self }, lte(c, v) { st.f.push(r => r[c] <= v); return self },
      in(c, v) { st.f.push(r => v.includes(r[c])); return self }, is(c, v) { st.f.push(r => (r[c] ?? null) === v); return self },
      not() { return self }, or() { return self }, filter() { return self }, match(o) { Object.entries(o).forEach(([c, v]) => st.f.push(r => r[c] === v)); return self },
      order(c, o) { st.ord = { c, asc: !(o && o.ascending === false) }; return self }, limit(n) { st.lim = n; return self }, range(a, b) { st.rng = [a, b]; return self },
      single() { st.one = 'single'; return self }, maybeSingle() { st.one = 'maybe'; return self },
      insert(p) { st.op = 'insert'; st.payload = p; return self }, update(p) { st.op = 'update'; st.payload = p; return self },
      upsert(p) { st.op = 'upsert'; st.payload = p; return self }, delete() { st.op = 'delete'; return self },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej) }
    }
    return self
  }
  const sess = () => window.__USER ? { user: window.__USER, access_token: 'tok' } : null
  globalThis.__SB = {
    from: tbl,
    rpc: (n, a) => { (window.__RPCS = window.__RPCS || []).push(n); return Promise.resolve(window.__RPC ? window.__RPC(n, a) : { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }) },
    storage: { from: () => ({}) },
    auth: { getSession: async () => ({ data: { session: sess() } }), getUser: async () => ({ data: { user: window.__USER || null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({}), updateUser: async () => ({ data: {}, error: null }),
      signInWithPassword: async () => ({ data: { user: window.__USER }, error: null }),
      // prijava u dva koraka: window.__MFA = { aal: {currentLevel, nextLevel}, totp: [{id}], kod: '123456' }
      mfa: (() => { const M = () => window.__MFA || { aal: { currentLevel: 'aal1', nextLevel: 'aal1' }, totp: [] }, z = s => (window.__CALLS = window.__CALLS || []).push('mfa:' + s)
        return {
          getAuthenticatorAssuranceLevel: async () => ({ data: M().aal, error: null }),
          listFactors: async () => ({ data: { totp: M().totp, all: M().totp.map(f => ({ ...f, status: 'verified' })) }, error: null }),
          enroll: async () => { z('enroll'); return { data: { id: 'f-novi', totp: { qr_code: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22/>', secret: 'TAJNA' } }, error: null } },
          challengeAndVerify: async ({ code }) => { z('verify:' + code); const ok = code === (M().kod || '123456'); if (ok && window.__MFA) window.__MFA.aal = { currentLevel: 'aal2', nextLevel: 'aal2' }; return ok ? { data: {}, error: null } : { data: null, error: { message: 'Invalid TOTP code' } } },
          unenroll: async ({ factorId }) => { z('unenroll:' + factorId); return { data: {}, error: null } }
        } })() },
    channel: () => ({ on() { return this }, subscribe() { return this } }), removeChannel() {}
  }
})()
