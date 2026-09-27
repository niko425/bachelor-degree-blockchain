import { Route, Routes } from 'react-router-dom'
import LanguageSwitcher from './components/LanguageSwitcher'
import WalletConnect from './components/WalletConnect'
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
      <header className="page-header">
        <div className="page-header-wallet">
          <WalletConnect
            account={wallet.account}
            connecting={wallet.connecting}
            error={wallet.error}
            onConnect={handleConnect}
          />
        </div>

        <LanguageSwitcher />
      </header>

      <Routes key={wallet.account ?? 'disconnected'}>
        <Route path="/" element={<ElectionListPage wallet={wallet} factory={factory} />} />
        <Route path="/election/:address" element={<ElectionPage wallet={wallet} factory={factory} />} />
      </Routes>
    </section>
  )
}

export default App
