const ENV = import.meta.env || {}
const API_HOST = ENV.VITE_API_HOST?.trim()
const BASE = ENV.VITE_API_URL || (API_HOST ? `https://${API_HOST}/api` : '/api')

// Cache local pour le mode hors ligne
const CACHE_KEY = 'elevage_cache'

function lireCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function ecrireCache(cle, valeur) {
  try {
    const cache = lireCache()
    cache[cle] = { valeur, date: new Date().toISOString() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Stockage indisponible — continuer sans cache
  }
}

function lireDepuisCache(cle) {
  try {
    const cache = lireCache()
    return cache[cle] || null
  } catch {
    return null
  }
}

// Requêtes en attente (mode hors ligne)
const FILE_ATTENTE_KEY = 'elevage_queue'

export function lireFileAttente() {
  try {
    const file = JSON.parse(localStorage.getItem(FILE_ATTENTE_KEY) || '[]')
    return Array.isArray(file) ? file : []
  } catch {
    return []
  }
}

function ajouterFileAttente(requete) {
  try {
    const file = lireFileAttente()
    file.push({ ...requete, id: identifiantRequete(), userId: idUtilisateur() })
    localStorage.setItem(FILE_ATTENTE_KEY, JSON.stringify(file))
  } catch {}
}

function identifiantRequete() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function viderFileAttente() {
  try {
    localStorage.removeItem(FILE_ATTENTE_KEY)
  } catch {}
}

// GET avec cache hors ligne
export async function get(chemin) {
  const cle = 'get:' + chemin
  try {
    const res = await fetch(BASE + chemin, { headers: { 'X-User-ID': idUtilisateur() } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    ecrireCache(cle, data)
    return { data, horsLigne: false, erreur: null }
  } catch {
    const cached = lireDepuisCache(cle)
    if (cached) {
      return { data: cached.valeur, horsLigne: true, dateCache: cached.date, erreur: null }
    }
    return { data: null, horsLigne: true, erreur: 'Impossible de contacter le serveur' }
  }
}

// POST — si hors ligne, met en file d'attente
export async function post(chemin, corps) {
  try {
    const res = await fetch(BASE + chemin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': idUtilisateur(),
      },
      body: JSON.stringify(corps),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ erreur: 'Erreur serveur' }))
      return { data: null, erreur: err.erreur || `Erreur ${res.status}`, horsLigne: false }
    }
    const data = await res.json()
    return { data, erreur: null, horsLigne: false }
  } catch {
    ajouterFileAttente({ chemin, corps, methode: 'POST' })
    return {
      data: null,
      erreur: null,
      horsLigne: true,
      enAttente: true,
      message: 'Enregistré — sera synchronisé dès que la connexion revient',
    }
  }
}

function idUtilisateur() {
  try {
    return localStorage.getItem('user_id') || '1'
  } catch {
    return '1'
  }
}

export function setIdUtilisateur(id) {
  try {
    localStorage.setItem('user_id', String(id))
  } catch {}
}

// Formater les centimes en dollars lisibles
export function formatCts(cts) {
  if (cts == null) return '—'
  const dollars = cts / 100
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(dollars)
}

// Synchroniser la file d'attente quand le réseau revient
let synchronisationEnCours = null

export function synchroniser() {
  if (synchronisationEnCours) return synchronisationEnCours
  synchronisationEnCours = synchroniserFile().finally(() => {
    synchronisationEnCours = null
  })
  return synchronisationEnCours
}

async function synchroniserFile() {
  const file = lireFileAttente()
  if (file.length === 0) return { synchronise: 0, echecs: 0 }
  // Les anciennes versions utilisaient Date.now(), qui pouvait créer deux IDs identiques.
  const ids = new Set()
  const requetes = file.map(req => {
    const id = req.id != null && !ids.has(req.id) ? req.id : identifiantRequete()
    ids.add(id)
    return { ...req, id }
  })
  try {
    localStorage.setItem(FILE_ATTENTE_KEY, JSON.stringify(requetes))
  } catch {
    return { synchronise: 0, echecs: file.length }
  }
  let synchronise = 0
  let echecs = 0
  const reussies = new Set()
  for (const req of requetes) {
    try {
      const res = await fetch(BASE + req.chemin, {
        method: req.methode || 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': req.userId || idUtilisateur() },
        body: JSON.stringify(req.corps),
      })
      if (res.ok) {
        synchronise++
        reussies.add(req.id)
      } else echecs++
    } catch {
      echecs++
    }
  }
  // Relire la file préserve aussi les opérations ajoutées pendant la synchronisation.
  const restantes = lireFileAttente().filter(req => !reussies.has(req.id))
  if (restantes.length === 0) viderFileAttente()
  else localStorage.setItem(FILE_ATTENTE_KEY, JSON.stringify(restantes))
  return { synchronise, echecs }
}
