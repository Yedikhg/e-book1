import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { get, post, formatCts } from '../utils/api.js'
import { Spinner } from '../components/Spinner.jsx'

export function EnregistrerPaiement() {
  const { venteId } = useParams()
  const navigate = useNavigate()

  const [vente, setVente] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreurChargement, setErreurChargement] = useState('')

  const [montant, setMontant] = useState('')
  const [mode, setMode] = useState('especes')
  const [reference, setReference] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    get(`/ventes/${venteId}`).then(({ data, erreur: err }) => {
      setChargement(false)
      if (err || !data) { setErreurChargement(err || 'Vente introuvable'); return }
      setVente(data)
      // Pré-remplir avec le reste à payer
      const reste = data.ResteCts ?? data.reste_cts ?? 0
      setMontant((reste / 100).toFixed(2))
    })
  }, [venteId])

  if (chargement) return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>
      <Spinner />
    </div>
  )

  if (erreurChargement || !vente) return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>
      <div className="etat-erreur"><p>{erreurChargement || 'Vente introuvable'}</p></div>
    </div>
  )

  const totalCts = vente.TotalCts ?? vente.total_cts ?? 0
  const payeCts = vente.PayeCts ?? vente.paye_cts ?? 0
  const resteCts = vente.ResteCts ?? vente.reste_cts ?? 0
  const clientNom = vente.ClientNom ?? vente.client_nom ?? 'Client inconnu'

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')

    const montantCts = Math.round(parseFloat(montant) * 100)
    if (isNaN(montantCts) || montantCts <= 0) { setErreur('Montant invalide'); return }
    if (montantCts > resteCts) { setErreur(`Le montant dépasse le reste dû (${formatCts(resteCts)})`); return }

    setEnvoi(true)
    const { erreur: err } = await post(`/ventes/${venteId}/paiements`, {
      montant_cts: montantCts,
      mode_paiement: mode,
      reference: reference || undefined,
    })
    setEnvoi(false)
    if (err) { setErreur(err); return }
    navigate(-1)
  }

  const montantCts = Math.round(parseFloat(montant) * 100) || 0
  const pct = totalCts > 0 ? Math.min(100, ((payeCts + montantCts) / totalCts) * 100) : 0

  return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>
      <h1 style={{ marginBottom: '1.5rem' }}>Encaisser un paiement</h1>

      {/* Récapitulatif créance */}
      <div className="carte" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{clientNom}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          <span style={{ color: 'var(--texte-sec)' }}>Total</span>
          <span>{formatCts(totalCts)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          <span style={{ color: 'var(--texte-sec)' }}>Déjà payé</span>
          <span style={{ color: 'var(--vert)' }}>{formatCts(payeCts)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          <span style={{ color: 'var(--texte-sec)' }}>Reste dû</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCts(resteCts)}</span>
        </div>
        <div className="barre-part">
          <div className="barre-part-fill" style={{ width: `${pct}%`, transition: 'width 0.3s ease' }} />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--texte-sec)', marginTop: '0.25rem', textAlign: 'right' }}>
          {pct.toFixed(0)} % couvert
        </p>
      </div>

      <form onSubmit={soumettre}>
        <div className="champ">
          <label htmlFor="montant">Montant encaissé (USD)</label>
          <input id="montant" type="number" min="0.01" step="0.01" value={montant}
            onChange={e => setMontant(e.target.value)} placeholder="0.00" inputMode="decimal" required />
        </div>

        <div className="champ">
          <label htmlFor="mode">Mode de paiement</label>
          <select id="mode" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="especes">Espèces</option>
            <option value="mobile_money">Mobile money</option>
            <option value="virement">Virement bancaire</option>
            <option value="cheque">Chèque</option>
          </select>
        </div>

        {(mode === 'mobile_money' || mode === 'virement' || mode === 'cheque') && (
          <div className="champ">
            <label htmlFor="reference">Référence / numéro de transaction</label>
            <input id="reference" type="text" value={reference}
              onChange={e => setReference(e.target.value)} placeholder="ex : TXN-20260101-4892" />
          </div>
        )}

        {erreur && (
          <div className="etat-erreur" style={{ marginBottom: '1rem' }}>
            <p>{erreur}</p>
          </div>
        )}

        <button type="submit" className="btn-principal" disabled={envoi || !montant}>
          {envoi ? 'Enregistrement…' : `Encaisser ${montant ? formatCts(Math.round(parseFloat(montant) * 100)) : ''}`}
        </button>
      </form>
    </div>
  )
}
