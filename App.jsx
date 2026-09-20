import { useEffect, useState } from 'react'
import SetupScreen from './components/SetupScreen'
import ScanScreen from './components/ScanScreen'
import MapScreen from './components/MapScreen'
import JournalModal from './components/JournalModal'
import ManualLocationModal from './components/ManualLocationModal'
import { requestUserLocation } from './lib/geo'
import { generateQuantumPoint } from './lib/randonaut'
import { haptic, initTelegram } from './lib/telegram'
import { loadManualOrigin, saveManualOrigin, nextCaseNumber } from './lib/journal'

export default function App() {
  const [screen, setScreen] = useState('setup')
  const [mode, setMode] = useState('attractor')
  const [radius, setRadius] = useState(1000)
  const [intent, setIntent] = useState('')
  const [user, setUser] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [originMode, setOriginMode] = useState(() => (loadManualOrigin() ? 'manual' : 'gps'))
  const [manualOrigin, setManualOrigin] = useState(() => loadManualOrigin())

  useEffect(() => {
    initTelegram()
  }, [])

  async function onGenerate() {
    setError('')
    setLocating(true)
    try {
      const location =
        originMode === 'manual' && manualOrigin
          ? { ...manualOrigin, accuracy: null, origin: 'manual' }
          : { ...(await requestUserLocation()), origin: 'gps' }
      setUser(location)
      setLocating(false)
      setScreen('scan')
      const started = Date.now()
      const generated = await generateQuantumPoint({
        mode,
        origin: location,
        maxRadiusM: radius,
      })
      const wait = 1600 - (Date.now() - started)
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      setResult({ ...generated, caseNumber: nextCaseNumber() })
      haptic('success')
      setScreen('map')
    } catch (err) {
      setLocating(false)
      setScreen('setup')
      haptic('error')
      if (err?.code === 1) {
        setError('Нужен доступ к геолокации — или введите координаты вручную.')
      } else {
        setError(err?.message || 'Не удалось получить координаты.')
      }
    }
  }

  const originLabel = manualOrigin
    ? `${manualOrigin.lat.toFixed(5)}, ${manualOrigin.lng.toFixed(5)}`
    : 'не заданы'

  return (
    <div className="app-shell">
      <div className="app-bg" />
      {screen === 'setup' && (
        <SetupScreen
          mode={mode}
          setMode={setMode}
          radius={radius}
          setRadius={setRadius}
          intent={intent}
          setIntent={setIntent}
          onGenerate={onGenerate}
          error={error}
          locating={locating}
          originMode={originMode}
          originLabel={originLabel}
          onOpenManual={() => {
            haptic('light')
            setManualOpen(true)
          }}
          onUseGps={() => {
            haptic('light')
            setOriginMode('gps')
            setManualOrigin(null)
            saveManualOrigin(null)
            setUser(null)
          }}
        />
      )}
      {screen === 'scan' && <ScanScreen />}
      {screen === 'map' && user && result && (
        <MapScreen
          user={user}
          result={result}
          intent={intent}
          radius={radius}
          onBack={() => setScreen('setup')}
          onJournal={() => setJournalOpen(true)}
        />
      )}
      <JournalModal
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        context={result ? { ...result, intent, mode: result.mode } : null}
      />
      <ManualLocationModal
        open={manualOpen}
        initial={manualOrigin}
        onClose={() => setManualOpen(false)}
        onSave={(coords) => {
          setManualOrigin(coords)
          setOriginMode('manual')
          setUser({ ...coords, origin: 'manual' })
          saveManualOrigin(coords)
          setManualOpen(false)
        }}
      />
    </div>
  )
}
