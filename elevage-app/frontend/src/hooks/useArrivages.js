import { useState, useEffect, useCallback } from 'react'
import { get } from '../utils/api.js'

// Les cinq états d'un écran :
// 'vide' | 'chargement' | 'rempli' | 'erreur' | 'hors_ligne'
export function useArrivages() {
  const [etat, setEtat] = useState('chargement')
  const [arrivages, setArrivages] = useState([])
  const [horsLigne, setHorsLigne] = useState(false)
  const [dateCache, setDateCache] = useState(null)
  const [messageErreur, setMessageErreur] = useState('')

  const charger = useCallback(async () => {
    setEtat('chargement')
    const { data, horsLigne: hl, dateCache: dc, erreur } = await get('/arrivages')
    setHorsLigne(hl)
    if (dc) setDateCache(dc)
    if (erreur && !data) {
      setEtat('erreur')
      setMessageErreur(erreur)
      return
    }
    if (!data || data.length === 0) {
      setEtat('vide')
      setArrivages([])
      return
    }
    setArrivages(data)
    setEtat(hl ? 'hors_ligne' : 'rempli')
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  return { etat, arrivages, horsLigne, dateCache, messageErreur, recharger: charger }
}

export function useEtatArrivage(id) {
  const [etat, setEtat] = useState('chargement')
  const [donnees, setDonnees] = useState(null)
  const [horsLigne, setHorsLigne] = useState(false)
  const [messageErreur, setMessageErreur] = useState('')

  const charger = useCallback(async () => {
    if (!id) return
    setEtat('chargement')
    const { data, horsLigne: hl, erreur } = await get(`/arrivages/${id}/etat`)
    setHorsLigne(hl)
    if (erreur && !data) {
      setEtat('erreur')
      setMessageErreur(erreur)
      return
    }
    if (!data) {
      setEtat('erreur')
      setMessageErreur('Arrivage introuvable')
      return
    }
    setDonnees(data)
    setEtat(hl ? 'hors_ligne' : 'rempli')
  }, [id])

  useEffect(() => {
    charger()
  }, [charger])

  return { etat, donnees, horsLigne, messageErreur, recharger: charger }
}
