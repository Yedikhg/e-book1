import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { Aujourd_hui } from './pages/Aujourd_hui.jsx'
import { NouvelArrivage } from './pages/NouvelArrivage.jsx'
import { LeLot } from './pages/LeLot.jsx'
import { SaisieMortalite } from './pages/SaisieMortalite.jsx'
import { EnregistrerVente } from './pages/EnregistrerVente.jsx'
import { EnregistrerPaiement } from './pages/EnregistrerPaiement.jsx'
import { ListeVentes } from './pages/ListeVentes.jsx'
import { Parametres } from './pages/Parametres.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <aside
        role="note"
        style={{
          background: '#fff3cd',
          color: '#664d03',
          padding: '0.75rem 1rem',
          textAlign: 'center',
          fontSize: '0.875rem',
        }}
      >
        Démonstration publique : les données sont partagées. N’y saisissez aucune donnée réelle.
      </aside>
      <nav aria-label="Navigation principale" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.5rem', padding: '1rem' }}>
        <Link to="/">Aujourd'hui</Link>
        <Link to="/ventes">Ventes</Link>
        <Link to="/parametres">Paramètres</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Aujourd_hui />} />
        <Route path="/arrivages/nouveau" element={<NouvelArrivage />} />
        <Route path="/arrivages/:id" element={<LeLot />} />
        <Route path="/arrivages/:id/mortalite" element={<SaisieMortalite />} />
        <Route path="/arrivages/:id/vente" element={<EnregistrerVente />} />
        <Route path="/ventes" element={<ListeVentes />} />
        <Route path="/ventes/:venteId/paiement" element={<EnregistrerPaiement />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
