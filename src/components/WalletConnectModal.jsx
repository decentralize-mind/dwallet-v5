import { useState } from "react";
import { useWalletConnect } from "../context/WalletConnectContext";

// ── WalletConnect scan/paste modal ───────────────────────────────────────────
export function WalletConnectModal({ onClose }) {
  const { pairingUri, setPairingUri, connectWithUri, connecting, hasProjectId, wcReady } = useWalletConnect();
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setError("");
    try {
      await connectWithUri(pairingUri);
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">WalletConnect</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!hasProjectId ? (
            <div className="wc-warning">
              <p className="wc-warning-title">⚠️ Project ID required</p>
              <p className="wc-warning-text">
                Add <code>VITE_WALLETCONNECT_PROJECT_ID</code> to your environment variables.
                Get a free ID at{" "}
                <a href="https://cloud.walletconnect.com" target="_blank" rel="noreferrer">
                  cloud.walletconnect.com
                </a>
              </p>
            </div>
          ) : !wcReady ? (
            <div className="wc-loading">
              <div className="wc-spinner" />
              <p>Initializing WalletConnect...</p>
            </div>
          ) : (
            <>
              <p className="wc-instruction">
                Open any dApp, click <strong>WalletConnect</strong>, then paste the URI below.
              </p>

              {/* QR scan hint */}
              <div className="wc-qr-hint">
                <span className="wc-qr-icon">◈</span>
                <span>Or scan the QR code with your device camera and paste the copied link</span>
              </div>

              <div className="form-group">
                <label className="form-label">WalletConnect URI</label>
                <textarea
                  className="field textarea"
                  placeholder="wc:xxxxxxxx@2?relay-protocol=irn&symKey=..."
                  value={pairingUri}
                  onChange={(e) => setPairingUri(e.target.value)}
                  rows={3}
                />
              </div>

              {error && <p className="error-msg">{error}</p>}

              <button
                className="btn-primary full-width"
                onClick={handleConnect}
                disabled={!pairingUri.trim() || connecting}
              >
                {connecting ? "Connecting..." : "Connect to dApp"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Session proposal approval modal ─────────────────────────────────────────
export function SessionProposalModal() {
  const { pendingProposal, approveSession, rejectSession } = useWalletConnect();
  if (!pendingProposal) return null;

  const { params } = pendingProposal;
  const meta = params.proposer?.metadata || {};
  const requiredChains = Object.values(params.requiredNamespaces || {})
    .flatMap((ns) => ns.chains || [])
    .map((c) => c.replace("eip155:", "Chain "));
  const requiredMethods = Object.values(params.requiredNamespaces || {})
    .flatMap((ns) => ns.methods || []);

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Connection Request</h2>
        </div>
        <div className="modal-body">
          {/* dApp info */}
          <div className="wc-dapp-card">
            <div className="wc-dapp-icon">
              {meta.icons?.[0]
                ? <img src={meta.icons[0]} alt="" className="wc-dapp-logo" />
                : <span className="wc-dapp-emoji">⬡</span>
              }
            </div>
            <div className="wc-dapp-info">
              <p className="wc-dapp-name">{meta.name || "Unknown dApp"}</p>
              <p className="wc-dapp-url">{meta.url || ""}</p>
            </div>
          </div>

          {meta.description && (
            <p className="wc-dapp-desc">{meta.description}</p>
          )}

          {/* Permissions */}
          <div className="wc-permissions">
            <p className="wc-permissions-title">This dApp is requesting:</p>
            <div className="wc-permissions-list">
              {requiredChains.length > 0 && (
                <div className="wc-perm-row">
                  <span className="wc-perm-icon allow">✓</span>
                  <span>View your address on {requiredChains.join(", ")}</span>
                </div>
              )}
              <div className="wc-perm-row">
                <span className="wc-perm-icon allow">✓</span>
                <span>Request transaction approvals</span>
              </div>
              <div className="wc-perm-row">
                <span className="wc-perm-icon allow">✓</span>
                <span>Request message signatures</span>
              </div>
              <div className="wc-perm-row">
                <span className="wc-perm-icon deny">✗</span>
                <span>Move funds without your approval</span>
              </div>
            </div>
          </div>

          <div className="wc-methods">
            <p className="wc-methods-label">Requested methods:</p>
            <div className="wc-methods-list">
              {requiredMethods.map((m) => (
                <span key={m} className="wc-method-tag">{m}</span>
              ))}
            </div>
          </div>

          <div className="btn-row">
            <button className="btn-secondary" onClick={rejectSession}>Reject</button>
            <button className="btn-primary" onClick={approveSession}>Connect</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Incoming request approval modal ─────────────────────────────────────────
export function SessionRequestModal() {
  const { pendingRequest, approveRequest, rejectRequest, sessions } = useWalletConnect();
  if (!pendingRequest) return null;

  const { topic, params } = pendingRequest;
  const session = sessions[topic];
  const dappName = session?.peer?.metadata?.name || "Unknown dApp";
  const { request } = params;

  const getRequestDescription = () => {
    switch (request.method) {
      case "personal_sign":
      case "eth_sign":
        return {
          label: "Sign Message",
          detail: request.params[0]?.slice(0, 120) + (request.params[0]?.length > 120 ? "…" : ""),
          icon: "✍",
          risk: "low",
        };
      case "eth_sendTransaction":
        return {
          label: "Send Transaction",
          detail: `To: ${request.params[0]?.to || "Contract"}\nValue: ${
            request.params[0]?.value
              ? (parseInt(request.params[0].value, 16) / 1e18).toFixed(6) + " ETH"
              : "0 ETH"
          }`,
          icon: "↑",
          risk: "high",
        };
      case "eth_signTransaction":
        return {
          label: "Sign Transaction",
          detail: `To: ${request.params[0]?.to || "Contract"}`,
          icon: "✍",
          risk: "medium",
        };
      case "eth_signTypedData_v4":
      case "eth_signTypedData":
        return {
          label: "Sign Typed Data",
          detail: "Structured data signature (EIP-712)",
          icon: "📋",
          risk: "medium",
        };
      default:
        return { label: request.method, detail: "Custom request", icon: "?", risk: "medium" };
    }
  };

  const desc = getRequestDescription();

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{desc.label}</h2>
          <span className={`wc-risk-badge wc-risk--${desc.risk}`}>
            {desc.risk === "high" ? "⚠ High" : desc.risk === "medium" ? "◆ Medium" : "✓ Low"} risk
          </span>
        </div>
        <div className="modal-body">
          <div className="wc-request-from">
            <span className="wc-from-label">From</span>
            <span className="wc-from-name">{dappName}</span>
          </div>

          <div className="wc-request-detail">
            <p className="wc-detail-label">Request details</p>
            <pre className="wc-detail-content">{desc.detail}</pre>
          </div>

          <div className="wc-request-method">
            <span className="wc-method-label">Method</span>
            <code className="wc-method-value">{request.method}</code>
          </div>

          {desc.risk === "high" && (
            <div className="wc-high-risk-warning">
              ⚠️ This action will send a transaction. Double-check all details — it cannot be undone.
            </div>
          )}

          <div className="btn-row">
            <button className="btn-secondary" onClick={rejectRequest}>Reject</button>
            <button className={`btn-primary ${desc.risk === "high" ? "btn-danger-primary" : ""}`} onClick={approveRequest}>
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Active sessions panel (used inside DAppsView) ────────────────────────────
export function ActiveSessionsList() {
  const { sessions, disconnect, wcReady, hasProjectId } = useWalletConnect();
  const sessionList = Object.values(sessions);

  if (!hasProjectId) return null;
  if (!wcReady) return <p className="wc-init-msg">Initializing WalletConnect...</p>;

  if (sessionList.length === 0) {
    return <p className="wc-no-sessions">No active WalletConnect sessions</p>;
  }

  return (
    <div className="wc-sessions-list">
      {sessionList.map((session) => {
        const meta = session.peer?.metadata || {};
        return (
          <div key={session.topic} className="wc-session-item">
            <div className="wc-session-left">
              {meta.icons?.[0]
                ? <img src={meta.icons[0]} alt="" className="wc-session-icon" />
                : <span className="wc-session-emoji">⬡</span>
              }
              <div>
                <p className="wc-session-name">{meta.name || "Unknown dApp"}</p>
                <p className="wc-session-url">{meta.url || ""}</p>
              </div>
            </div>
            <button
              className="wc-disconnect-btn"
              onClick={() => disconnect(session.topic)}
            >
              Disconnect
            </button>
          </div>
        );
      })}
    </div>
  );
}
