import { useState } from "react";
import { useWallet } from "../context/WalletContext";

export default function ReceiveModal({ onClose }) {
  const { currentAddress, activeChain } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(currentAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Generate QR code pattern from address (simplified visual)
  const qrPattern = currentAddress
    ? Array.from(currentAddress.slice(2, 34)).map((c, i) => ({
        x: i % 6,
        y: Math.floor(i / 6),
        filled: parseInt(c, 16) > 7,
      }))
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Receive</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body center">
          <p className="receive-network">Network: <strong>{activeChain}</strong></p>

          {/* QR Code (visual representation) */}
          <div className="qr-container">
            <svg width="160" height="160" viewBox="0 0 7 7">
              {/* QR border */}
              <rect x="0" y="0" width="7" height="7" fill="white"/>
              {/* Corner squares */}
              <rect x="0" y="0" width="2" height="2" fill="#111"/>
              <rect x="5" y="0" width="2" height="2" fill="#111"/>
              <rect x="0" y="5" width="2" height="2" fill="#111"/>
              <rect x="0.25" y="0.25" width="1.5" height="1.5" fill="white"/>
              <rect x="5.25" y="0.25" width="1.5" height="1.5" fill="white"/>
              <rect x="0.25" y="5.25" width="1.5" height="1.5" fill="white"/>
              <rect x="0.6" y="0.6" width="0.8" height="0.8" fill="#111"/>
              <rect x="5.6" y="0.6" width="0.8" height="0.8" fill="#111"/>
              <rect x="0.6" y="5.6" width="0.8" height="0.8" fill="#111"/>
              {/* Data pattern from address */}
              {qrPattern.map((cell, i) =>
                cell.filled ? (
                  <rect key={i} x={cell.x + 0.1} y={cell.y + 0.1} width="0.8" height="0.8" fill="#111"/>
                ) : null
              )}
            </svg>
          </div>

          {/* Address display */}
          <div className="address-display">
            <p className="address-full mono">{currentAddress}</p>
          </div>

          <button className={`btn-primary full-width ${copied ? "btn-success" : ""}`} onClick={copyAddress}>
            {copied ? "✓ Copied!" : "Copy Address"}
          </button>

          <div className="receive-warning">
            Only send <strong>{activeChain.toUpperCase()}</strong> assets to this address
          </div>
        </div>
      </div>
    </div>
  );
}
