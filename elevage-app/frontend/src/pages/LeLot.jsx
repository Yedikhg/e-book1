import { useNavigate, useParams } from 'react-router-dom'
import { useEtatArrivage } from '../hooks/useArrivages.js'
import { Spinner } from '../components/Spinner.jsx'
import { BadgeConnexion } from '../components/BadgeConnexion.jsx'
import { formatCts } from '../utils/api.js'

// Écran de détail d'un lot — gère les 5 états
export function LeLot() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { etat, donnees, horsLigne, dateCache, messageErreur, recharger } = useEtatArrivage(id)

  if (etat === 'chargement') return (
    <div className="page"><Spinner /></div>
  )

  if (etat === 'erreur') return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>
      <div className="etat-erreur"><p>{messageErreur}</p>
        <button className="btn-secondaire" style={{ marginTop: '0.75rem' }} onClick={recharger}>Réessayer</button>
      </div>
    </div>
  )

  if (!donnees) return null

  const d = donnees
  const vivantes = d.Vivantes ?? d.vivantes ?? 0
  const effectifInitial = d.EffectifInitial ?? d.effectif_initial ?? 0
  const coutTotal = d.CoutTotalCts ?? d.cout_total_cts ?? 0
  const valeurParBete = d.ValeurParBeteCts ?? d.valeur_par_bete_cts ?? 0
  const parts = d.Parts ?? d.parts ?? []
  const derniers = d.DerniersMovts ?? d.derniers_movts ?? []
  const ventesCredit = d.VentesCredit ?? d.ventes_credit ?? []

  const dateArrivee = d.RecuLe ?? d.recu_le
  const joursElevage = dateArrivee
    ? Math.floor((Date.now() - new Date(dateArrivee)) / 86400000)
    : '?'

  const nomLot = `Lot · jour ${joursElevage}`

  function labelType(t) {
    switch (t) {
      case 'mortalite': return 'Mortalité'
      case 'vente': return 'Vente'
      case 'don': return 'Don'
      case 'consommation': return 'Consommation'
      default: return t
    }
  }

  return (
    <div className="page">
      <div className="entete">
        <div>
          <button className="btn-secondaire" style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.875rem', minHeight: 'auto', marginBottom: '0.5rem' }} onClick={() => navigate(-1)}>← Retour</button>
          <h1>{nomLot}</h1>
        </div>
        <BadgeConnexion horsLigne={horsLigne} dateCache={dateCache} />
      </div>

      {etat === 'hors_ligne' && (
        <p style={{ fontSize: '0.75rem', color: 'var(--texte-sec)', marginBottom: '0.75rem' }}>
          Données hors ligne
        </p>
      )}

      {/* Stats principales */}
      <div className="grille-stats">
        <div className="stat">
          <p className="etiquette">Vivantes</p>
          <p className="valeur">{vivantes.toLocaleString('fr-FR')}</p>
        </div>
        <div className="stat">
          <p className="etiquette">Valeur / bête</p>
          <p className="valeur">{formatCts(valeurParBete)}</p>
        </div>
        <div className="stat">
          <p className="etiquette">Coût total</p>
          <p className="valeur">{formatCts(coutTotal)}</p>
        </div>
        <div className="stat">
          <p className="etiquette">Mortalité</p>
          <p className="valeur">
            {effectifInitial > 0
              ? `${(((effectifInitial - vivantes) / effectifInitial) * 100).toFixed(1)} %`
              : '—'}
          </p>
        </div>
      </div>

      {/* Répartition par propriétaire */}
      {parts.length > 0 && (
        <>
          <p className="titre-section">Répartition</p>
          <div className="carte">
            {parts.map((p, i) => {
              const nom = p.ProprietaireNom ?? p.proprietaire_nom ?? `Propriétaire ${i + 1}`
              const v = p.Vivantes ?? p.vivantes_part ?? 0
              const pct = vivantes > 0 ? (v / vivantes * 100).toFixed(0) : 0
              return (
                <div key={p.ProprietaireID ?? i} style={{ marginBottom: i < parts.length - 1 ? '1rem' : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{nom}</span>
                    <span>{v.toLocaleString('fr-FR')} bêtes ({pct} %)</span>
                  </div>
                  <div className="barre-part">
                    <div className="barre-part-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Ventes à crédit */}
      {ventesCredit.length > 0 && (
        <>
          <p className="titre-section">Créances à recouvrer</p>
          {ventesCredit.map((v, i) => (
            <div key={v.VenteID ?? i} className="carte">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600 }}>{v.ClientNom ?? 'Client inconnu'}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--texte-sec)' }}>
                    Payé : {formatCts(v.PayeCts ?? v.paye_cts)} / {formatCts(v.TotalCts ?? v.total_cts)}
                  </p>
                </div>
                <p style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  {formatCts(v.ResteCts ?? v.reste_cts)} restant
                </p>
              </div>
              <button
                className="btn-secondaire"
                style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                onClick={() => navigate(`/ventes/${v.VenteID ?? v.vente_id}/paiement`)}
              >
                Encaisser
              </button>
            </div>
          ))}
        </>
      )}

      {/* Derniers mouvements */}
      {derniers.length > 0 && (
        <>
          <p className="titre-section">Derniers mouvements</p>
          <div className="carte">
            {derniers.map((m, i) => (
              <div key={i} className="mouvement-ligne">
                <div>
                  <p className="mouvement-type">{labelType(m.Type ?? m.type)}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--texte-sec)' }}>
                    {m.Date ? new Date(m.Date ?? m.date).toLocaleDateString('fr-FR') : ''}
                  </p>
                </div>
                <p className="mouvement-valeur">{(m.Nombre ?? m.nombre ?? 0).toLocaleString('fr-FR')} bêtes</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button className="btn-principal" onClick={() => navigate(`/arrivages/${id}/mortalite`)}>
          Enregistrer des morts
        </button>
        <button className="btn-secondaire" onClick={() => navigate(`/arrivages/${id}/vente`)}>
          Enregistrer une vente
        </button>
      </div>
    </div>
  )
}
