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
import SupplyChainAdmin from './components/admin/SupplyChainAdmin'
import SupplyChainAdminV2 from './components/admin/SupplyChainAdminV2'
import SupplyChainPortal from './components/SupplyChainPortal'
import SupplyChainLanding from './components/SupplyChainLanding'
import SupplyChainAuthWrapper from './components/SupplyChainAuthWrapper'
import { registerServiceWorker } from './utils/pushNotifications'
import { initializeSessionTracking } from './utils/analytics'
import { trackRetentionEvent } from './utils/retentionTracking'
import { SecurityManager } from './utils/security'
import './index.css'

function AppContent() {
  const { wallet, sessionReady, isLocked } = useWallet()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showSupplyChainAdmin, setShowSupplyChainAdmin] = useState(false)
  const [showSupplyChainAdminV2, setShowSupplyChainAdminV2] = useState(false)
  const [showSupplyChainPortal, setShowSupplyChainPortal] = useState(false)

  // Initialize security utilities on app load
  useEffect(() => {
    // Initialize CSRF protection
    SecurityManager.init().catch(err => {
      console.error('Failed to initialize security:', err)
    })
    
    // Set up global XSS protection for all outgoing data
    window.sanitizeOutput = SecurityManager.sanitizeOutput
    window.sanitizeHTML = SecurityManager.sanitizeHTML
    
    console.log('🛡️ Security utilities initialized')
  }, [])

  // Check URL for admin routes
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/admin' || path.startsWith('/admin')) {
      setShowAdmin(true)
    }
    if (path === '/admin-supplychain' || path.startsWith('/admin-supplychain')) {
      setShowSupplyChainAdmin(true)
    }
    if (path === '/admin-supplychain-v2' || path.startsWith('/admin-supplychain-v2')) {
      setShowSupplyChainAdminV2(true)
    }
    if (path === '/supplychain' || path.startsWith('/supplychain')) {
      setShowSupplyChainPortal(true)
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

  // Show supply chain portal/login based on route
  if (showSupplyChainPortal) {
    const path = window.location.pathname
    // Show landing page for /supplychain or /supplychain/
    if (path === '/supplychain' || path === '/supplychain/') {
      return <SupplyChainLanding />
    }
    // Show login/portal for all other /supplychain/* routes
    return <SupplyChainAuthWrapper />
  }

  // Show supply chain admin V2 (new elegant version)
  if (showSupplyChainAdminV2) {
    return <SupplyChainAdminV2 />
  }

  // Show supply chain admin dashboard if route is /admin-supplychain
  if (showSupplyChainAdmin) {
    return <SupplyChainAdmin />
  }

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
