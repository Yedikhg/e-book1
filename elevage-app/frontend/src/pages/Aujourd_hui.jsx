import { useNavigate } from 'react-router-dom'
import { useArrivages } from '../hooks/useArrivages.js'
import { BadgeConnexion } from '../components/BadgeConnexion.jsx'
import { Spinner } from '../components/Spinner.jsx'

// Écran d'accueil — gère les 5 états : vide, chargement, rempli, erreur, hors_ligne
export function Aujourd_hui() {
  const { etat, arrivages, horsLigne, dateCache, messageErreur, recharger } = useArrivages()
  const navigate = useNavigate()

  // Sommer les bêtes vivantes de tous les arrivages actifs
  const totalVivantes = arrivages.reduce((sum, a) => sum + (a.vivantes ?? a.effectif_initial), 0)
  const nbArrivages = arrivages.length

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="page">
      <div className="entete">
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--texte-sec)', textTransform: 'capitalize' }}>{date}</p>
          <h1>Aujourd'hui</h1>
        </div>
        <BadgeConnexion horsLigne={horsLigne} dateCache={dateCache} />
      </div>

      {/* État chargement */}
      {etat === 'chargement' && <Spinner />}

      {/* État vide */}
      {etat === 'vide' && (
        <div className="etat-vide">
          <div className="icone">🐔</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Aucun lot en cours</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--texte-sec)' }}>
            Déclarez votre premier arrivage pour commencer le suivi.
          </p>
          <button className="btn-principal" onClick={() => navigate('/arrivages/nouveau')}>
            Déclarer un arrivage
          </button>
        </div>
      )}

      {/* État erreur */}
      {etat === 'erreur' && (
        <div className="etat-erreur">
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Impossible de charger les données</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--texte-sec)', marginBottom: '1rem' }}>{messageErreur}</p>
          <button className="btn-secondaire" onClick={recharger}>Réessayer</button>
        </div>
      )}

      {/* États rempli et hors_ligne */}
      {(etat === 'rempli' || etat === 'hors_ligne') && (
        <>
          {/* Chiffre principal */}
          <div className="carte carte-accent" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: '0.5rem' }}>
              {nbArrivages > 1 ? `${nbArrivages} lots actifs` : '1 lot actif'}
            </p>
            <div className="chiffre-principal">
              {totalVivantes.toLocaleString('fr-FR')}
              <span> bêtes vivantes</span>
            </div>
            {etat === 'hors_ligne' && (
              <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.5rem' }}>
                Chiffre hors ligne · {dateCache ? new Date(dateCache).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'inconnu'}
              </p>
            )}
          </div>

          {/* Actions principales */}
          {arrivages.length === 1 && (
            <>
              <button
                className="btn-principal"
                style={{ marginTop: '0.75rem' }}
                onClick={() => navigate(`/arrivages/${arrivages[0].id}/mortalite`)}
              >
                Enregistrer des morts
              </button>
              <button
                className="btn-secondaire"
                onClick={() => navigate(`/arrivages/${arrivages[0].id}`)}
              >
                Voir le lot
              </button>
            </>
          )}

          {/* Liste des lots si plusieurs */}
          {arrivages.length > 1 && (
            <>
              <p className="titre-section">Lots actifs</p>
              {arrivages.map(a => (
                <div key={a.id} className="carte" style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/arrivages/${a.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>
                        {a.notes || `Lot du ${new Date(a.recu_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--texte-sec)' }}>
                        {(a.vivantes ?? a.effectif_initial).toLocaleString('fr-FR')} bêtes vivantes
                      </p>
                    </div>
                    <button
                      className="btn-secondaire"
                      style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      onClick={e => { e.stopPropagation(); navigate(`/arrivages/${a.id}/mortalite`) }}
                    >
                      + Morts
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          <button
            className="btn-secondaire"
            style={{ marginTop: '0.5rem' }}
            onClick={() => navigate('/arrivages/nouveau')}
          >
            + Nouvel arrivage
          </button>
        </>
      )}
    </div>
  )
}
