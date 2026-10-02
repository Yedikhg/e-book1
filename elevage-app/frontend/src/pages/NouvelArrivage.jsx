import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post } from '../utils/api.js'

export function NouvelArrivage() {
  const navigate = useNavigate()
  const [proprietaires, setProprietaires] = useState([])
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const [recuLe, setRecuLe] = useState(new Date().toISOString().slice(0, 10))
  const [effectif, setEffectif] = useState('')
  const [prixUnit, setPrixUnit] = useState('')
  const [notes, setNotes] = useState('')
  const [parts, setParts] = useState([{ proprietaireId: '', effectif: '' }])

  useEffect(() => {
    get('/proprietaires').then(({ data }) => {
      if (data) setProprietaires(data)
    })
  }, [])

  function ajouterPart() {
    setParts(p => [...p, { proprietaireId: '', effectif: '' }])
  }

  function mettreAJourPart(i, champ, val) {
    setParts(p => p.map((part, idx) => idx === i ? { ...part, [champ]: val } : part))
  }

  function supprimerPart(i) {
    setParts(p => p.filter((_, idx) => idx !== i))
  }

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')

    const eff = parseInt(effectif, 10)
    const prix = Math.round(parseFloat(prixUnit) * 100)
    if (!eff || eff <= 0) { setErreur('Effectif invalide'); return }
    if (isNaN(prix) || prix < 0) { setErreur('Prix invalide'); return }

    const partsValides = parts.filter(p => p.proprietaireId && p.effectif)
    if (partsValides.length === 0) { setErreur('Ajoutez au moins une part'); return }

    const sommeParts = partsValides.reduce((s, p) => s + parseInt(p.effectif, 10), 0)
    if (sommeParts !== eff) {
      setErreur(`La somme des parts (${sommeParts}) ≠ effectif total (${eff})`)
      return
    }

    setEnvoi(true)
    const { erreur: err } = await post('/arrivages', {
      recu_le: recuLe,
      effectif_initial: eff,
      prix_unitaire_cts: prix,
      notes,
      parts: partsValides.map(p => ({
        proprietaire_id: parseInt(p.proprietaireId, 10),
        effectif: parseInt(p.effectif, 10),
      })),
    })
    setEnvoi(false)
    if (err) { setErreur(err); return }
    navigate('/', { replace: true })
  }

  const sommeParts = parts.reduce((s, p) => s + (parseInt(p.effectif, 10) || 0), 0)
  const eff = parseInt(effectif, 10) || 0

  return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>
      <h1 style={{ marginBottom: '1.5rem' }}>Nouvel arrivage</h1>

      <form onSubmit={soumettre}>
        <div className="champ">
          <label htmlFor="recu_le">Date d'arrivée</label>
          <input id="recu_le" type="date" value={recuLe} onChange={e => setRecuLe(e.target.value)} required />
        </div>
        <div className="champ">
          <label htmlFor="effectif">Effectif total (nombre de bêtes)</label>
          <input id="effectif" type="number" min="1" value={effectif} onChange={e => setEffectif(e.target.value)}
            placeholder="ex : 1000" inputMode="numeric" required />
        </div>
        <div className="champ">
          <label htmlFor="prix">Prix unitaire (USD)</label>
          <input id="prix" type="number" min="0" step="0.01" value={prixUnit}
            onChange={e => setPrixUnit(e.target.value)} placeholder="ex : 1.50" inputMode="decimal" required />
        </div>
        <div className="champ">
          <label htmlFor="notes">Notes (facultatif)</label>
          <input id="notes" type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Lot printemps 2026…" />
        </div>

        {/* Parts */}
        <p className="titre-section">Répartition entre propriétaires</p>
        {eff > 0 && (
          <p style={{ fontSize: '0.8rem', color: sommeParts === eff ? 'var(--vert)' : 'var(--accent)', marginBottom: '0.75rem' }}>
            {sommeParts} / {eff} bêtes réparties
          </p>
        )}

        {parts.map((p, i) => (
          <div key={i} className="carte" style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div className="champ" style={{ flex: 2, marginBottom: 0 }}>
                <label>Propriétaire</label>
                <select value={p.proprietaireId} onChange={e => mettreAJourPart(i, 'proprietaireId', e.target.value)}>
                  <option value="">Choisir…</option>
                  {proprietaires.map(pr => (
                    <option key={pr.ID ?? pr.id} value={pr.ID ?? pr.id}>{pr.Nom ?? pr.nom}</option>
                  ))}
                </select>
              </div>
              <div className="champ" style={{ flex: 1, marginBottom: 0 }}>
                <label>Bêtes</label>
                <input type="number" min="1" value={p.effectif}
                  onChange={e => mettreAJourPart(i, 'effectif', e.target.value)}
                  placeholder="ex : 900" inputMode="numeric" />
              </div>
              {parts.length > 1 && (
                <button type="button" onClick={() => supprimerPart(i)}
                  style={{ background: 'none', color: 'var(--rouge)', minHeight: '48px', padding: '0 0.5rem' }}
                  aria-label="Supprimer">✕</button>
              )}
            </div>
          </div>
        ))}

        <button type="button" className="btn-secondaire" style={{ marginBottom: '1rem' }} onClick={ajouterPart}>
          + Ajouter un propriétaire
        </button>

        {erreur && (
          <div className="etat-erreur" style={{ marginBottom: '1rem' }}>
            <p>{erreur}</p>
          </div>
        )}

        <button type="submit" className="btn-principal" disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer l\'arrivage'}
        </button>
      </form>
    </div>
  )
}
