import { WalletProvider } from './context/WalletContext'
import { useWallet } from './hooks/useWallet'
import { WalletConnectProvider } from './context/WalletConnectContext'
import {
  SessionProposalModal,
  SessionRequestModal,
} from './components/WalletConnectModal'
import OnboardingScreen from './components/OnboardingScreen'
import MainWallet from './components/MainWallet'
import './index.css'

function AppContent() {
  const { wallet, sessionReady } = useWallet()

  // Wait until session check is done to avoid flashing unlock screen
  if (!sessionReady) {
    return (
      <div className="app-loading">
        <div className="app-loading-icon">◈</div>
      </div>
    )
  }

  return (
    <>
      {wallet ? <MainWallet /> : <OnboardingScreen />}
      <SessionProposalModal />
      <SessionRequestModal />
    </>
  )
}

export default function App() {
  return (
    <WalletProvider>
      <WalletConnectProvider>
        <AppContent />
      </WalletConnectProvider>
    </WalletProvider>
  )
}
