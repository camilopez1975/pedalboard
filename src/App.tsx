import { PedalPicker } from './components/PedalPicker.tsx'
import { Workbench } from './components/Workbench.tsx'
import { getPedal } from './model/pedals/index.ts'
import { useApp } from './store.ts'

export function App() {
  const pedalId = useApp((s) => s.pedalId)
  const pedal = pedalId ? getPedal(pedalId) : undefined
  return pedal ? <Workbench pedal={pedal} /> : <PedalPicker />
}
