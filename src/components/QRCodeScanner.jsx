import { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

/**
 * QR Code Scanner Component
 * Uses device camera to scan QR codes for WalletConnect URIs
 */
export function QRCodeScanner({ onScan, onClose }) {
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [cameraPermission, setCameraPermission] = useState('prompt') // prompt | granted | denied
  const scannerRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    // Check camera permission first
    const checkCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        setCameraPermission('granted')
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop())
      } catch (err) {
        console.error('Camera permission check failed:', err)
        setCameraPermission('denied')
        setError('Camera access denied. Please allow camera access in your browser settings.')
        return
      }
    }

    checkCameraPermission()

    // Initialize scanner
    if (containerRef.current && !scannerRef.current && cameraPermission === 'granted') {
      setScanning(true)
      setError('')

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
        },
        false // verbose
      )

      scanner.render(
        (decodedText) => {
          // Success callback
          console.log('QR Code successfully scanned:', decodedText.substring(0, 50) + '...')
          onScan(decodedText)
          scanner.clear()
          scannerRef.current = null
          setScanning(false)
        },
        (errorMessage) => {
          // Error callback (usually just no QR code in view)
          // Don't show errors during normal scanning
        }
      )

      scannerRef.current = scanner
    }

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [cameraPermission])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📷 Scan QR Code</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="step-sub" style={{ marginBottom: '16px' }}>
            {cameraPermission === 'granted' && scanning 
              ? 'Point your camera at a WalletConnect QR code'
              : cameraPermission === 'denied'
              ? 'Camera access is required to scan QR codes'
              : 'Requesting camera access...'
            }
          </p>

          {cameraPermission === 'granted' && (
            <div
              id="qr-reader"
              ref={containerRef}
              style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            />
          )}

          {error && (
            <div className="error-msg" style={{ marginTop: '12px', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>⚠️ Error</p>
              <p style={{ margin: 0, fontSize: '13px' }}>{error}</p>
              {cameraPermission === 'denied' && (
                <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                  <strong>How to fix:</strong> Click the camera icon in your browser's address bar and allow camera access.
                </p>
              )}
            </div>
          )}

          <div className="wc-note" style={{ marginTop: '16px' }}>
            <p style={{ margin: '4px 0' }}>✓ Camera access required</p>
            <p style={{ margin: '4px 0' }}>✓ QR code will be scanned automatically</p>
            <p style={{ margin: '4px 0' }}>✓ Private and secure - runs locally</p>
          </div>

          <button
            className="btn-secondary full-width"
            style={{ marginTop: '16px' }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * QR Code Display Component
 * Shows a QR code for the given URI
 */
export function QRCodeDisplay({ uri, onClose }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && uri) {
      import('qrcode').then(QRCode => {
        QRCode.default.toCanvas(
          canvasRef.current,
          uri,
          {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          },
          (err) => {
            if (err) console.error('QR Code generation error:', err)
          }
        )
      })
    }
  }, [uri])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📱 Scan to Connect</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="step-sub" style={{ marginBottom: '16px' }}>
            Scan this QR code with your mobile wallet
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '20px',
              background: '#fff',
              borderRadius: '12px',
              marginBottom: '16px',
            }}
          >
            <canvas ref={canvasRef} />
          </div>

          <div className="wc-note">
            <p style={{ margin: '4px 0' }}>✓ Open your mobile wallet app</p>
            <p style={{ margin: '4px 0' }}>✓ Select "Scan QR Code" or "Connect WalletConnect"</p>
            <p style={{ margin: '4px 0' }}>✓ Point camera at this QR code</p>
          </div>

          <button
            className="btn-secondary full-width"
            style={{ marginTop: '16px' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
