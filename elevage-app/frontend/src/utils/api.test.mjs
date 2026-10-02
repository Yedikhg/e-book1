import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { lireFileAttente, synchroniser } from './api.js'

const queueKey = 'elevage_queue'

beforeEach(() => {
  const storage = new Map()
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  }
})

function queue(records) {
  localStorage.setItem(queueKey, JSON.stringify(records))
}

test('a partial retry sends only the operation that failed', async () => {
  queue([{ id: 'a', chemin: '/ventes/1/paiements', corps: {} }, { id: 'b', chemin: '/ventes/2/paiements', corps: {} }])
  const sent = []
  globalThis.fetch = async path => {
    sent.push(path)
    return { ok: sent.length !== 2 }
  }
  assert.deepEqual(await synchroniser(), { synchronise: 1, echecs: 1 })
  assert.deepEqual(lireFileAttente().map(req => req.id), ['b'])
  assert.deepEqual(await synchroniser(), { synchronise: 1, echecs: 0 })
  assert.deepEqual(sent, ['/api/ventes/1/paiements', '/api/ventes/2/paiements', '/api/ventes/2/paiements'])
  assert.deepEqual(lireFileAttente(), [])
})

test('operations added during synchronization stay in the queue', async () => {
  queue([{ id: 'a', chemin: '/arrivages', corps: {} }])
  globalThis.fetch = async () => {
    queue([...lireFileAttente(), { id: 'new', chemin: '/arrivages/1/mortalites', corps: {} }])
    return { ok: true }
  }
  await synchroniser()
  assert.deepEqual(lireFileAttente().map(req => req.id), ['new'])
})

test('simultaneous synchronization calls share one request', async () => {
  queue([{ id: 'a', chemin: '/arrivages', corps: {} }])
  let sent = 0
  globalThis.fetch = async () => {
    sent++
    await Promise.resolve()
    return { ok: true }
  }
  await Promise.all([synchroniser(), synchroniser()])
  assert.equal(sent, 1)
})

test('duplicate legacy IDs do not remove an operation that failed', async () => {
  queue([{ id: 1, chemin: '/first', corps: {} }, { id: 1, chemin: '/second', corps: {} }])
  globalThis.fetch = async path => ({ ok: path.endsWith('/first') })
  await synchroniser()
  assert.deepEqual(lireFileAttente().map(req => req.chemin), ['/second'])
})

test('queued operations keep the user who recorded them', async () => {
  localStorage.setItem('user_id', '2')
  queue([{ id: 'a', chemin: '/arrivages', corps: {}, userId: '1' }])
  let sentUser
  globalThis.fetch = async (_path, options) => {
    sentUser = options.headers['X-User-ID']
    return { ok: true }
  }
  await synchroniser()
  assert.equal(sentUser, '1')
})

test('invalid queue storage is handled as an empty queue', async () => {
  localStorage.setItem(queueKey, '{}')
  assert.deepEqual(await synchroniser(), { synchronise: 0, echecs: 0 })
})
