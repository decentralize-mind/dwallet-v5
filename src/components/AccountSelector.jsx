import { useWallet } from "../context/WalletContext";
import { formatAddress } from "../utils/crypto";

export default function AccountSelector({ onClose }) {
  const { wallet, addAccount, switchAccount } = useWallet();
  const accounts = wallet?.accounts || [];
  const activeIndex = wallet?.activeAccount ?? 0;

  const handleSwitch = (index) => {
    switchAccount(index);
    onClose();
  };

  const handleAdd = () => {
    addAccount();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal small-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Accounts</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="account-list">
            {accounts.map((acc, i) => (
              <button
                key={i}
                className={`account-option ${activeIndex === i ? "account-option--active" : ""}`}
                onClick={() => handleSwitch(i)}
              >
                <div className="account-option-avatar">{acc.name[0]}</div>
                <div className="account-option-info">
                  <p className="account-option-name">{acc.name}</p>
                  <p className="account-option-addr mono">{formatAddress(acc.address)}</p>
                </div>
                {activeIndex === i && <span className="chain-check">✓</span>}
              </button>
            ))}
          </div>
          <button className="btn-secondary full-width" onClick={handleAdd}>
            + Add Account
          </button>
        </div>
      </div>
    </div>
  );
}
