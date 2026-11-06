import { useState } from 'react'
import { OfflineBanner } from '@/components/OfflineBanner'
import { Button } from '@/components/ui/button'

// Page temporaire du J0 : aucune interface métier à ce stade.
function App() {
  const [clics, setClics] = useState(0)

  return (
    <>
      <OfflineBanner />
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-2xl font-semibold">SPV Activités — en construction</h1>
        <Button onClick={() => setClics((n) => n + 1)}>
          Bouton de test ({clics} clic{clics > 1 ? 's' : ''})
        </Button>
      </main>
    </>
  )
}

export default App
