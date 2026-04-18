import { useState, useEffect } from 'react'
import { WalletProvider } from './context/WalletContext'
import { useWallet } from './hooks/useWallet'
import { WalletConnectProvider } from './context/WalletConnectContext'
import {
  SessionProposalModal,
  SessionRequestModal,
} from './components/WalletConnectModal'
import OnboardingScreen from './components/OnboardingScreen'
import LandingPage from './components/LandingPage'
import LockScreen from './components/LockScreen'
import MainWallet from './components/MainWallet'
import { registerServiceWorker } from './utils/pushNotifications'
import './index.css'

function AppContent() {
  const { wallet, sessionReady, isLocked } = useWallet()
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Register service worker for push notifications
  useEffect(() => {
    registerServiceWorker().then(success => {
      if (success) {
        console.log('✅ Push notification service worker ready')
      }
    })
  }, [])

  // Wait until session check is done to avoid flashing unlock screen
  if (!sessionReady) {
    return (
      <div className="app-loading">
        <div className="app-loading-icon">◈</div>
      </div>
    )
  }

  // Show lock screen if wallet is locked
  if (isLocked) {
    return <LockScreen />
  }

  // Show onboarding if user clicked "Create Wallet" or "Import Wallet"
  if (showOnboarding && !wallet) {
    return <OnboardingScreen onBack={() => setShowOnboarding(false)} />
  }

  // Show landing page if no wallet exists
  if (!wallet) {
    return <LandingPage onGetStarted={() => setShowOnboarding(true)} />
  }

  return (
    <>
      <MainWallet />
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
