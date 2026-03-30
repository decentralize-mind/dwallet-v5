import { useState, useMemo } from 'react'
import { useWallet } from '../hooks/useWallet'
import { WelcomeStep } from './onboarding/WelcomeStep'
import { BackupSeedStep } from './onboarding/BackupSeedStep'
import { CreateWalletStep } from './onboarding/CreateWalletStep'
import { ImportWalletStep } from './onboarding/ImportWalletStep'
import { VerifySeedStep } from './onboarding/VerifySeedStep'
import { CompleteStep } from './onboarding/CompleteStep'
import { ProgressBar } from './onboarding/ProgressBar'

// Steps for each flow
const CREATE_STEPS = ['welcome', 'backup', 'verify', 'create', 'complete']
const IMPORT_STEPS = ['welcome', 'import', 'complete']

function pwdScore(pwd) {
  let score = 0
  if (pwd.length >= 8)          score++
  if (pwd.length >= 12)         score++
  if (/[A-Z]/.test(pwd))        score++
  if (/\d/.test(pwd))           score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return Math.min(4, Math.floor(score * (4 / 5)))
}

// Pick 3 random indices for verification
function pickVerifyIdxs(words) {
  const idxs = []
  while (idxs.length < 3) {
    const n = Math.floor(Math.random() * words.length)
    if (!idxs.includes(n)) idxs.push(n)
  }
  return idxs.sort((a, b) => a - b)
}

export default function OnboardingScreen() {
  const { createWallet, confirmWallet, importWallet } = useWallet()

  // flow
  const [mode, setMode] = useState(null)   // 'new' | 'import'
  const [step, setStep] = useState('welcome')

  // new wallet state
  const [mnemonic, setMnemonic]           = useState('')
  const [pendingData, setPendingData]     = useState(null)
  const [seedRevealed, setSeedRevealed]   = useState(false)
  const [seedCopied, setSeedCopied]       = useState(false)
  const [checkedWrite, setCheckedWrite]   = useState(false)
  const [checkedStore, setCheckedStore]   = useState(false)
  const words = useMemo(() => (mnemonic ? mnemonic.split(' ') : []), [mnemonic])

  // verify step
  const [verifyIdxs, setVerifyIdxs]     = useState([])
  const [verifyWords, setVerifyWords]   = useState({})
  const [verifyError, setVerifyError]   = useState('')

  // import state
  const [importInput, setImportInput] = useState('')

  // shared password fields
  const [password, setPassword]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const pwdStrong = pwdScore(password)
  const pwdChecks = [
    { label: '8+ characters',    ok: password.length >= 8 },
    { label: '12+ characters',   ok: password.length >= 12 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number',           ok: /\d/.test(password) },
    { label: 'Symbol',           ok: /[^A-Za-z0-9]/.test(password) },
    { label: 'Passwords match',  ok: password === confirmPwd && confirmPwd.length > 0 },
  ]

  // active step list for progress bar
  const activeSteps = mode === 'import' ? IMPORT_STEPS : CREATE_STEPS

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectCreate = async () => {
    const { mnemonic: m, pending } = await createWallet()
    setMnemonic(m)
    setPendingData(pending)
    setMode('new')
    setStep('backup')
  }

  const handleSelectImport = () => {
    setMode('import')
    setStep('import')
  }

  const handleBackupNext = () => {
    const idxs = pickVerifyIdxs(words)
    setVerifyIdxs(idxs)
    setVerifyWords({})
    setVerifyError('')
    setStep('verify')
  }

  const handleVerify = () => {
    const allCorrect = verifyIdxs.every(
      idx => verifyWords[idx]?.trim().toLowerCase() === words[idx]?.toLowerCase()
    )
    if (!allCorrect) {
      setVerifyError('One or more words are incorrect. Please check your seed phrase.')
      return
    }
    setStep('create')
  }

  const handleCreate = async () => {
    setError('')
    setLoading(true)
    try {
      await confirmWallet(pendingData, password)
      setStep('complete')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    setError('')
    setLoading(true)
    try {
      await importWallet(importInput, password)
      setStep('complete')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <ProgressBar steps={activeSteps} current={step} />

        {step === 'welcome' && (
          <WelcomeStep
            onSelectCreate={handleSelectCreate}
            onSelectImport={handleSelectImport}
          />
        )}

        {step === 'backup' && (
          <BackupSeedStep
            words={words}
            newMnemonic={mnemonic}
            seedRevealed={seedRevealed}
            setSeedRevealed={setSeedRevealed}
            seedCopied={seedCopied}
            setSeedCopied={setSeedCopied}
            checkedWrite={checkedWrite}
            setCheckedWrite={setCheckedWrite}
            checkedStore={checkedStore}
            setCheckedStore={setCheckedStore}
            onNext={handleBackupNext}
          />
        )}

        {step === 'verify' && (
          <VerifySeedStep
            words={words}
            verifyIdxs={verifyIdxs}
            verifyWords={verifyWords}
            setVerifyWords={setVerifyWords}
            error={verifyError}
            onVerify={handleVerify}
            onBack={() => setStep('backup')}
          />
        )}

        {step === 'create' && (
          <CreateWalletStep
            password={password}
            setPassword={setPassword}
            confirmPwd={confirmPwd}
            setConfirmPwd={setConfirmPwd}
            showPwd={showPwd}
            setShowPwd={setShowPwd}
            pwdStrong={pwdStrong}
            pwdChecks={pwdChecks}
            loading={loading}
            error={error}
            onCreate={handleCreate}
            onBack={() => setStep('verify')}
          />
        )}

        {step === 'import' && (
          <ImportWalletStep
            importInput={importInput}
            setImportInput={setImportInput}
            password={password}
            setPassword={setPassword}
            confirmPwd={confirmPwd}
            setConfirmPwd={setConfirmPwd}
            showPwd={showPwd}
            setShowPwd={setShowPwd}
            loading={loading}
            error={error}
            onImport={handleImport}
            onBack={() => setStep('welcome')}
          />
        )}

        {step === 'complete' && (
          <CompleteStep flow={mode === 'import' ? 'import' : 'create'} />
        )}
      </div>
    </div>
  )
}
