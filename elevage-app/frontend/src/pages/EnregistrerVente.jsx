import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { get, post } from '../utils/api.js'
import { useEtatArrivage } from '../hooks/useArrivages.js'
import { Spinner } from '../components/Spinner.jsx'

export function EnregistrerVente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { etat, donnees, messageErreur, recharger } = useEtatArrivage(id)

  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [nombre, setNombre] = useState('')
  const [prixUnitCts, setPrixUnitCts] = useState('')
  const [estCredit, setEstCredit] = useState(false)
  const [dateVente, setDateVente] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    get('/clients').then(({ data }) => {
      if (data) setClients(data)
    })
  }, [])

  if (etat === 'chargement') return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>
      <Spinner />
    </div>
  )

  if (etat === 'erreur') return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>
      <div className="etat-erreur">
        <p>{messageErreur}</p>
        <button className="btn-secondaire" style={{ marginTop: '0.75rem' }} onClick={recharger}>Réessayer</button>
      </div>
    </div>
  )

  const vivantes = donnees?.Vivantes ?? donnees?.vivantes ?? 0

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')

    const nb = parseInt(nombre, 10)
    if (!nb || nb <= 0) { setErreur('Nombre invalide'); return }
    if (nb > vivantes) { setErreur(`Impossible : seulement ${vivantes} bêtes vivantes`); return }

    const prix = Math.round(parseFloat(prixUnitCts) * 100)
    if (isNaN(prix) || prix < 0) { setErreur('Prix invalide'); return }

    if (estCredit && !clientId) { setErreur('Sélectionnez un client pour une vente à crédit'); return }

    setEnvoi(true)
    const { erreur: err } = await post(`/arrivages/${id}/ventes`, {
      nombre: nb,
      prix_unitaire_cts: prix,
      est_credit: estCredit,
      client_id: clientId ? parseInt(clientId, 10) : null,
      date_vente: dateVente,
      notes,
    })
    setEnvoi(false)
    if (err) { setErreur(err); return }
    navigate(`/arrivages/${id}`, { replace: true })
  }

  return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>
      <h1 style={{ marginBottom: '1.5rem' }}>Enregistrer une vente</h1>

      <div className="carte" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--texte-sec)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bêtes disponibles</p>
        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{vivantes.toLocaleString('fr-FR')}</p>
      </div>

      <form onSubmit={soumettre}>
        <div className="champ">
          <label htmlFor="date_vente">Date de vente</label>
          <input id="date_vente" type="date" value={dateVente} onChange={e => setDateVente(e.target.value)} required />
        </div>

        <div className="champ">
          <label htmlFor="nombre">Nombre de bêtes vendues</label>
          <input id="nombre" type="number" min="1" max={vivantes} value={nombre}
            onChange={e => setNombre(e.target.value)} placeholder="ex : 200" inputMode="numeric" required />
        </div>

        <div className="champ">
          <label htmlFor="prix">Prix unitaire (USD)</label>
          <input id="prix" type="number" min="0" step="0.01" value={prixUnitCts}
            onChange={e => setPrixUnitCts(e.target.value)} placeholder="ex : 3.50" inputMode="decimal" required />
        </div>

        {nombre && prixUnitCts && (
          <div className="carte" style={{ marginBottom: '1rem', background: 'var(--fond-carte)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--texte-sec)' }}>Total estimé</p>
            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {((parseInt(nombre, 10) || 0) * (parseFloat(prixUnitCts) || 0)).toFixed(2)} USD
            </p>
          </div>
        )}

        <div className="champ" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
          <input id="credit" type="checkbox" checked={estCredit} onChange={e => setEstCredit(e.target.checked)}
            style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
          <label htmlFor="credit" style={{ marginBottom: 0 }}>Vente à crédit (paiement différé)</label>
        </div>

        {estCredit && (
          <div className="champ">
            <label htmlFor="client">Client</label>
            <select id="client" value={clientId} onChange={e => setClientId(e.target.value)} required={estCredit}>
              <option value="">Choisir un client…</option>
              {clients.map(c => (
                <option key={c.ID ?? c.id} value={c.ID ?? c.id}>{c.Nom ?? c.nom}</option>
              ))}
            </select>
          </div>
        )}

        <div className="champ">
          <label htmlFor="notes">Notes (facultatif)</label>
          <input id="notes" type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Marché central, lot du matin…" />
        </div>

        {erreur && (
          <div className="etat-erreur" style={{ marginBottom: '1rem' }}>
            <p>{erreur}</p>
          </div>
        )}

        <button type="submit" className="btn-principal" disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer la vente'}
        </button>
      </form>
    </div>
  )
}
