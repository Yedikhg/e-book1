import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, formatCts } from '../utils/api.js'
import { Spinner } from '../components/Spinner.jsx'
import { BadgeConnexion } from '../components/BadgeConnexion.jsx'

export function ListeVentes() {
  const navigate = useNavigate()
  const [ventes, setVentes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [horsLigne, setHorsLigne] = useState(false)
  const [dateCache, setDateCache] = useState(null)
  const [filtreCredit, setFiltreCredit] = useState(false)

  useEffect(() => {
    get('/ventes').then(({ data, horsLigne: hl, dateCache: dc, erreur: err }) => {
      setChargement(false)
      setHorsLigne(hl)
      setDateCache(dc)
      if (err) { setErreur(err); return }
      if (data) setVentes(data)
    })
  }, [])

  const ventesFiltrees = filtreCredit ? ventes.filter(v => (v.ResteCts ?? v.reste_cts ?? 0) > 0) : ventes

  const totalCreances = ventes
    .filter(v => (v.ResteCts ?? v.reste_cts ?? 0) > 0)
    .reduce((s, v) => s + (v.ResteCts ?? v.reste_cts ?? 0), 0)

  return (
    <div className="page">
      <div className="entete">
        <div>
          <button className="btn-secondaire" style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.875rem', minHeight: 'auto', marginBottom: '0.5rem' }} onClick={() => navigate(-1)}>← Retour</button>
          <h1>Ventes</h1>
        </div>
        <BadgeConnexion horsLigne={horsLigne} dateCache={dateCache} />
      </div>

      {chargement && <Spinner />}

      {erreur && (
        <div className="etat-erreur">
          <p>{erreur}</p>
          <button className="btn-secondaire" style={{ marginTop: '0.75rem' }} onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </div>
      )}

      {!chargement && !erreur && (
        <>
          {totalCreances > 0 && (
            <div className="carte carte-accent" style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, marginBottom: '0.25rem' }}>
                Créances à recouvrer
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCts(totalCreances)}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              className={filtreCredit ? 'btn-principal' : 'btn-secondaire'}
              style={{ flex: 1, fontSize: '0.875rem' }}
              onClick={() => setFiltreCredit(false)}
            >
              Toutes
            </button>
            <button
              className={filtreCredit ? 'btn-secondaire' : 'btn-principal'}
              style={{ flex: 1, fontSize: '0.875rem' }}
              onClick={() => setFiltreCredit(true)}
            >
              Impayées
            </button>
          </div>

          {ventesFiltrees.length === 0 && (
            <div className="etat-vide">
              <div className="icone">📋</div>
              <h2 style={{ marginBottom: '0.5rem' }}>
                {filtreCredit ? 'Aucune créance en cours' : 'Aucune vente enregistrée'}
              </h2>
            </div>
          )}

          {ventesFiltrees.map((v, i) => {
            const totalCts = v.TotalCts ?? v.total_cts ?? 0
            const resteCts = v.ResteCts ?? v.reste_cts ?? 0
            const clientNom = v.ClientNom ?? v.client_nom ?? null
            const dateVente = v.DateVente ?? v.date_vente
            const nombre = v.Nombre ?? v.nombre ?? 0

            return (
              <div key={v.ID ?? v.id ?? i} className="carte" style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>
                      {nombre.toLocaleString('fr-FR')} bêtes
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--texte-sec)' }}>
                      {dateVente ? new Date(dateVente).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      {clientNom ? ` · ${clientNom}` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700 }}>{formatCts(totalCts)}</p>
                    {resteCts > 0 && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{formatCts(resteCts)} restant</p>
                    )}
                    {resteCts === 0 && clientNom && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--vert)' }}>Soldé ✓</p>
                    )}
                  </div>
                </div>

                {resteCts > 0 && (
                  <button
                    className="btn-secondaire"
                    style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    onClick={() => navigate(`/ventes/${v.ID ?? v.id}/paiement`)}
                  >
                    Encaisser
                  </button>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
