const BASE = import.meta.env.VITE_API_URL || '/api'

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
    return JSON.parse(localStorage.getItem(FILE_ATTENTE_KEY) || '[]')
  } catch {
    return []
  }
}

function ajouterFileAttente(requete) {
  try {
    const file = lireFileAttente()
    file.push({ ...requete, id: Date.now() })
    localStorage.setItem(FILE_ATTENTE_KEY, JSON.stringify(file))
  } catch {}
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
export async function synchroniser() {
  const file = lireFileAttente()
  if (file.length === 0) return { synchronise: 0, echecs: 0 }
  let synchronise = 0
  let echecs = 0
  for (const req of file) {
    try {
      const res = await fetch(BASE + req.chemin, {
        method: req.methode || 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': idUtilisateur() },
        body: JSON.stringify(req.corps),
      })
      if (res.ok) synchronise++
      else echecs++
    } catch {
      echecs++
    }
  }
  if (echecs === 0) viderFileAttente()
  return { synchronise, echecs }
}
