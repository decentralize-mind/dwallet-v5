import { useState, useEffect } from 'react';

/**
 * 📢 Notification Banner Component (Vercel-Compatible Version)
 * 
 * Uses HTTP polling instead of WebSocket for Vercel compatibility.
 * Checks for new broadcasts every 10 seconds.
 */
export default function NotificationBanner() {
  const [activeNotification, setActiveNotification] = useState(null);
  const [lastChecked, setLastChecked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll for new notifications every 10 seconds
  useEffect(() => {
    const fetchLatestNotification = async () => {
      try {
        const apiUrl = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3001';
        const baseUrl = apiUrl.includes('/api/admin') 
          ? apiUrl.replace('/api/admin', '') 
          : apiUrl;

        const response = await fetch(`${baseUrl}/api/admin/services/notification/latest`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.campaign && data.campaign.created_at > lastChecked) {
          console.log('📢 New broadcast notification detected via polling');
          
          setActiveNotification({
            id: data.campaign.id,
            title: data.campaign.title,
            message: data.campaign.message,
            type: data.campaign.type || 'info',
            timestamp: data.campaign.created_at,
            recipientCount: data.campaign.sent_count
          });
          
          setLastChecked(Date.now());

          // Auto-dismiss after 15 seconds
          setTimeout(() => {
            setActiveNotification(null);
          }, 15000);
        }
        
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchLatestNotification();

    // Poll every 10 seconds
    const interval = setInterval(fetchLatestNotification, 10000);

    // Cleanup
    return () => clearInterval(interval);
  }, [lastChecked]);

  // Dismiss notification manually
  const dismissNotification = () => {
    setActiveNotification(null);
  };

  // Get notification type styling
  const getNotificationStyle = (type) => {
    const styles = {
      info: {
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)',
        border: '1px solid rgba(59,130,246,0.3)',
        icon: 'ℹ️'
      },
      success: {
        background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)',
        border: '1px solid rgba(16,185,129,0.3)',
        icon: '✅'
      },
      warning: {
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
        border: '1px solid rgba(245,158,11,0.3)',
        icon: '⚠️'
      },
      error: {
        background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)',
        border: '1px solid rgba(239,68,68,0.3)',
        icon: '❌'
      },
      system: {
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
        icon: '🔧'
      },
      promotion: {
        background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 100%)',
        border: '1px solid rgba(168,85,247,0.3)',
        icon: '🎉'
      }
    };
    return styles[type] || styles.info;
  };

  // Show loading state on first load
  if (loading && !activeNotification) {
    return null;
  }

  // Don't render if no active notification
  if (!activeNotification) return null;

  const style = getNotificationStyle(activeNotification.type);

  return (
    <div
      style={{
        background: style.background,
        border: style.border,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        animation: 'slideIn 0.3s ease-out',
        position: 'relative'
      }}
    >
      {/* Close button */}
      <button
        onClick={dismissNotification}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0,0,0,0.2)',
          border: 'none',
          borderRadius: '6px',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text)',
          fontSize: '16px',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(0,0,0,0.2)';
        }}
        aria-label="Dismiss notification"
      >
        ×
      </button>

      {/* Notification content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Icon */}
        <div style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>
          {style.icon}
        </div>

        {/* Text content */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 6px 0',
              fontSize: '16px',
              fontWeight: '700',
              color: 'var(--text)'
            }}
          >
            {activeNotification.title}
          </h3>
          {activeNotification.message && (
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                lineHeight: '1.5',
                color: 'var(--text2)'
              }}
            >
              {activeNotification.message}
            </p>
          )}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text3)',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}
          >
            <span>
              🕒 {new Date(activeNotification.timestamp).toLocaleString()}
            </span>
            {activeNotification.recipientCount && (
              <span>👥 Sent to {activeNotification.recipientCount.toLocaleString()} users</span>
            )}
            <span style={{ fontSize: '9px', opacity: 0.7 }}>
              (Auto-refresh: 10s)
            </span>
          </div>
        </div>
      </div>

      {/* Inline animation styles */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
