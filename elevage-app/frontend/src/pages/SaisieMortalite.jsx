import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { post } from '../utils/api.js'
import { useEtatArrivage } from '../hooks/useArrivages.js'
import { Spinner } from '../components/Spinner.jsx'

// Écran de saisie des morts — gère les 5 états
// Deux touchers depuis l'écran d'accueil : ouvrir + valider
export function SaisieMortalite() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { etat, donnees, horsLigne, messageErreur, recharger } = useEtatArrivage(id)
  const [valeur, setValeur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreurEnvoi, setErreurEnvoi] = useState('')
  const [succes, setSucces] = useState(false)

  function appuyerChiffre(c) {
    if (valeur.length >= 4) return
    setValeur(v => (v === '0' ? c : v + c))
  }

  function effacer() {
    setValeur(v => v.slice(0, -1))
  }

  async function valider() {
    const nombre = parseInt(valeur, 10)
    if (!nombre || nombre <= 0) {
      setErreurEnvoi('Entrez un nombre supérieur à zéro')
      return
    }
    setEnvoi(true)
    setErreurEnvoi('')
    const { erreur, horsLigne: hl, message } = await post(`/arrivages/${id}/mortalites`, { nombre })
    setEnvoi(false)
    if (erreur) {
      setErreurEnvoi(erreur)
      return
    }
    // Succès ou mise en file d'attente hors ligne
    setSucces(hl ? (message || 'Enregistré hors ligne') : true)
    setTimeout(() => navigate(-1), 1200)
  }

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

  const vivantes = donnees?.Vivantes ?? donnees?.vivantes ?? '?'

  return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>

      <div className="entete">
        <h1>Morts de ce matin</h1>
        {horsLigne && <span className="badge hors-ligne">Hors ligne</span>}
      </div>

      <div className="carte" style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--texte-sec)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bêtes vivantes</p>
        <p style={{ fontSize: '2rem', fontWeight: 700 }}>
          {typeof vivantes === 'number' ? vivantes.toLocaleString('fr-FR') : vivantes}
        </p>
      </div>

      {/* Chiffre saisi */}
      <div className="champ-nombre" role="status" aria-live="polite">
        {valeur || <span style={{ color: 'var(--texte-sec)' }}>0</span>}
      </div>

      {/* Erreur envoi */}
      {erreurEnvoi && (
        <div className="etat-erreur" style={{ marginTop: '0.75rem' }}>
          <p>{erreurEnvoi}</p>
        </div>
      )}

      {/* Succès */}
      {succes && (
        <div style={{ background: '#d4f0dc', borderRadius: 'var(--rayon)', padding: '0.75rem 1rem', marginTop: '0.75rem', color: 'var(--vert)', fontWeight: 600 }}>
          {typeof succes === 'string' ? succes : '✓ Enregistré'}
        </div>
      )}

      {/* Pavé numérique */}
      <div className="pave" role="group" aria-label="Pavé numérique">
        {['1','2','3','4','5','6','7','8','9'].map(c => (
          <button key={c} onClick={() => appuyerChiffre(c)} aria-label={c}>{c}</button>
        ))}
        <button onClick={effacer} aria-label="Effacer">⌫</button>
        <button onClick={() => appuyerChiffre('0')} aria-label="0">0</button>
        <button
          onClick={valider}
          disabled={!valeur || envoi}
          style={{ background: 'var(--accent)', color: 'white', fontWeight: 700 }}
          aria-label="Valider"
        >
          {envoi ? '…' : '✓'}
        </button>
      </div>

      {/* Bouton valider pleine largeur */}
      <button
        className="btn-principal"
        style={{ marginTop: '1rem' }}
        onClick={valider}
        disabled={!valeur || envoi}
      >
        {envoi ? 'Envoi…' : `Valider ${valeur ? `(${valeur} mort${parseInt(valeur) > 1 ? 's' : ''})` : ''}`}
      </button>
    </div>
  )
}
