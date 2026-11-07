// Préparation commune aux tests unitaires (vitest.config.ts, setupFiles).
import '@testing-library/jest-dom/vitest' // assertions DOM : toBeInTheDocument, toHaveTextContent…
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Démonte les composants rendus après chaque test (isolation des tests).
afterEach(() => {
  cleanup()
})
