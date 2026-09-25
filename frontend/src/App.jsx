import { Route, Routes } from 'react-router-dom'
import { useElections } from './hooks/useElections'
import { useWallet } from './hooks/useWallet'
import ElectionListPage from './pages/ElectionListPage'
import ElectionPage from './pages/ElectionPage'
import './App.css'

function App() {
  const wallet = useWallet()
  const factory = useElections()

  function handleConnect() {
    return wallet.connect(async (browserProvider) => {
      await factory.loadElections(browserProvider)
    })
  }

  return (
    <section id="center">
      <span className="contract-watermark" aria-hidden="true">VERIFIABLE</span>

      <Routes key={wallet.account ?? 'disconnected'}>
        <Route
          path="/"
          element={<ElectionListPage wallet={wallet} factory={factory} onConnect={handleConnect} />}
        />
        <Route
          path="/election/:address"
          element={<ElectionPage wallet={wallet} factory={factory} onConnect={handleConnect} />}
        />
      </Routes>
    </section>
  )
}

export default App
