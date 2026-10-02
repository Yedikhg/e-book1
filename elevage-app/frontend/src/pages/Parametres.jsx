import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post } from '../utils/api.js'
import { Spinner } from '../components/Spinner.jsx'

function SectionProprietaires() {
  const [liste, setListe] = useState([])
  const [chargement, setChargement] = useState(true)
  const [nomNouveau, setNomNouveau] = useState('')
  const [ajout, setAjout] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    get('/proprietaires').then(({ data }) => {
      setChargement(false)
      if (data) setListe(data)
    })
  }, [])

  async function ajouter(e) {
    e.preventDefault()
    if (!nomNouveau.trim()) return
    setAjout(true)
    setErreur('')
    const { data, erreur: err } = await post('/proprietaires', { nom: nomNouveau.trim() })
    setAjout(false)
    if (err) { setErreur(err); return }
    if (data) setListe(l => [...l, data])
    setNomNouveau('')
  }

  if (chargement) return <Spinner />

  return (
    <div>
      <p className="titre-section">Propriétaires</p>
      {liste.map(p => (
        <div key={p.ID ?? p.id} className="carte" style={{ marginBottom: '0.5rem', padding: '0.75rem 1rem' }}>
          <p style={{ fontWeight: 600 }}>{p.Nom ?? p.nom}</p>
        </div>
      ))}
      {liste.length === 0 && <p style={{ color: 'var(--texte-sec)', fontSize: '0.875rem', marginBottom: '1rem' }}>Aucun propriétaire</p>}

      <form onSubmit={ajouter} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <div className="champ" style={{ flex: 1, marginBottom: 0 }}>
          <input type="text" value={nomNouveau} onChange={e => setNomNouveau(e.target.value)}
            placeholder="Nom du propriétaire" />
        </div>
        <button type="submit" className="btn-principal" style={{ width: 'auto', padding: '0 1rem' }} disabled={ajout || !nomNouveau.trim()}>
          {ajout ? '…' : 'Ajouter'}
        </button>
      </form>
      {erreur && <p style={{ color: 'var(--rouge)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{erreur}</p>}
    </div>
  )
}

function SectionClients() {
  const [liste, setListe] = useState([])
  const [chargement, setChargement] = useState(true)
  const [nomNouveau, setNomNouveau] = useState('')
  const [telephoneNouveau, setTelephoneNouveau] = useState('')
  const [ajout, setAjout] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    get('/clients').then(({ data }) => {
      setChargement(false)
      if (data) setListe(data)
    })
  }, [])

  async function ajouter(e) {
    e.preventDefault()
    if (!nomNouveau.trim()) return
    setAjout(true)
    setErreur('')
    const { data, erreur: err } = await post('/clients', {
      nom: nomNouveau.trim(),
      telephone: telephoneNouveau.trim() || undefined,
    })
    setAjout(false)
    if (err) { setErreur(err); return }
    if (data) setListe(l => [...l, data])
    setNomNouveau('')
    setTelephoneNouveau('')
  }

  if (chargement) return <Spinner />

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <p className="titre-section">Clients</p>
      {liste.map(c => (
        <div key={c.ID ?? c.id} className="carte" style={{ marginBottom: '0.5rem', padding: '0.75rem 1rem' }}>
          <p style={{ fontWeight: 600 }}>{c.Nom ?? c.nom}</p>
          {(c.Telephone ?? c.telephone) && (
            <p style={{ fontSize: '0.8rem', color: 'var(--texte-sec)' }}>{c.Telephone ?? c.telephone}</p>
          )}
        </div>
      ))}
      {liste.length === 0 && <p style={{ color: 'var(--texte-sec)', fontSize: '0.875rem', marginBottom: '1rem' }}>Aucun client</p>}

      <form onSubmit={ajouter} style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="champ" style={{ flex: 2, marginBottom: '0.5rem' }}>
            <input type="text" value={nomNouveau} onChange={e => setNomNouveau(e.target.value)}
              placeholder="Nom du client" />
          </div>
          <div className="champ" style={{ flex: 1, marginBottom: '0.5rem' }}>
            <input type="tel" value={telephoneNouveau} onChange={e => setTelephoneNouveau(e.target.value)}
              placeholder="Téléphone" />
          </div>
        </div>
        <button type="submit" className="btn-secondaire" disabled={ajout || !nomNouveau.trim()}>
          {ajout ? 'Ajout…' : '+ Ajouter un client'}
        </button>
      </form>
      {erreur && <p style={{ color: 'var(--rouge)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{erreur}</p>}
    </div>
  )
}

function SectionPIN() {
  const [ancienPIN, setAncienPIN] = useState('')
  const [nouveauPIN, setNouveauPIN] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  async function changer(e) {
    e.preventDefault()
    if (nouveauPIN.length < 4) { setErreur('Le PIN doit avoir au moins 4 chiffres'); return }
    setEnvoi(true)
    setErreur('')
    setMessage('')
    const { erreur: err } = await post('/utilisateurs/moi/pin', {
      ancien_pin: ancienPIN,
      nouveau_pin: nouveauPIN,
    })
    setEnvoi(false)
    if (err) { setErreur(err); return }
    setMessage('PIN mis à jour avec succès')
    setAncienPIN('')
    setNouveauPIN('')
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <p className="titre-section">Sécurité</p>
      <form onSubmit={changer}>
        <div className="champ">
          <label htmlFor="ancien_pin">PIN actuel</label>
          <input id="ancien_pin" type="password" inputMode="numeric" pattern="[0-9]*"
            value={ancienPIN} onChange={e => setAncienPIN(e.target.value)}
            placeholder="PIN actuel" maxLength={8} required />
        </div>
        <div className="champ">
          <label htmlFor="nouveau_pin">Nouveau PIN</label>
          <input id="nouveau_pin" type="password" inputMode="numeric" pattern="[0-9]*"
            value={nouveauPIN} onChange={e => setNouveauPIN(e.target.value)}
            placeholder="Minimum 4 chiffres" maxLength={8} required />
        </div>
        {erreur && <p style={{ color: 'var(--rouge)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{erreur}</p>}
        {message && <p style={{ color: 'var(--vert)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{message}</p>}
        <button type="submit" className="btn-secondaire" disabled={envoi}>
          {envoi ? 'Mise à jour…' : 'Changer le PIN'}
        </button>
      </form>
    </div>
  )
}

export function Parametres() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <button className="btn-secondaire" style={{ width: 'auto', marginBottom: '1rem' }} onClick={() => navigate(-1)}>← Retour</button>
      <h1 style={{ marginBottom: '1.5rem' }}>Paramètres</h1>

      <SectionProprietaires />
      <SectionClients />
      <SectionPIN />

      <div style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid var(--bordure)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--texte-sec)', textAlign: 'center' }}>
          Élevage App · Gestion de poulets de chair
        </p>
      </div>
    </div>
  )
}
