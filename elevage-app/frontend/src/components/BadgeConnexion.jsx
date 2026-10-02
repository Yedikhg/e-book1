export function BadgeConnexion({ horsLigne, dateCache }) {
  if (!horsLigne) {
    return <span className="badge ok">● Connecté</span>
  }
  const date = dateCache ? new Date(dateCache) : null
  const heure = date
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null
  return (
    <span className="badge hors-ligne" title={date ? `Synchronisé le ${date.toLocaleDateString('fr-FR')} à ${heure}` : ''}>
      ○ Hors ligne{heure ? ` · synchro ${heure}` : ''}
    </span>
  )
}
