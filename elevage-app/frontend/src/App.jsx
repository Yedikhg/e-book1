import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
