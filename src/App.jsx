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
import AdminDashboard from './components/AdminDashboard'
import { registerServiceWorker } from './utils/pushNotifications'
import { initializeSessionTracking } from './utils/analytics'
import { trackRetentionEvent } from './utils/retentionTracking'
import './index.css'

function AppContent() {
  const { wallet, sessionReady, isLocked } = useWallet()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  // Check URL for admin route
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/admin' || path.startsWith('/admin')) {
      setShowAdmin(true)
    }
  }, [])

  // Register service worker for push notifications
  useEffect(() => {
    registerServiceWorker().then(success => {
      if (success) {
        console.log('✅ Push notification service worker ready')
      }
    })
  }, [])

  // Initialize session tracking
  useEffect(() => {
    initializeSessionTracking()
  }, [])

  // Track retention on app load
  useEffect(() => {
    const retention = trackRetentionEvent()
    console.log('📊 Retention tracking:', retention)
  }, [])

  // Show admin dashboard if route is /admin
  if (showAdmin) {
    return <AdminDashboard />
  }

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
