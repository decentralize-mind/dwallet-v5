import { useState } from 'react'
import SupplyChainLogin from './SupplyChainLogin'
import SupplyChainPortal from './SupplyChainPortal'

export default function SupplyChainAuthWrapper() {
  const [authToken, setAuthToken] = useState(null)

  const handleLogin = (authData) => {
    setAuthToken(authData.token)
    localStorage.setItem('sc_auth', JSON.stringify(authData))
  }

  // If we have an auth token, show the portal
  if (authToken) {
    return <SupplyChainPortal authToken={authToken} />
  }

  // Otherwise show the login page
  return <SupplyChainLogin onLogin={handleLogin} />
}
