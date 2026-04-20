/**
 * 📧 ADMIN ACTIVITY ALERT SYSTEM
 * 
 * Sends notifications for critical security events via:
 * - Discord Webhook
 * - Email (SMTP with nodemailer)
 * - Slack Webhook
 */

const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');

// Alert configuration
const ALERT_CONFIG = {
  discord: {
    enabled: !!process.env.DISCORD_WEBHOOK_URL,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL
  },
  slack: {
    enabled: !!process.env.SLACK_WEBHOOK_URL,
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  },
  email: {
    enabled: !!process.env.ALERT_EMAIL,
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: process.env.SMTP_PORT || 587,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    alertEmail: process.env.ALERT_EMAIL
  },
  // Alert thresholds
  thresholds: {
    failedLoginAlert: 3,      // Alert after 3 failed logins
    newIpAlert: true,          // Alert on new IP login
    criticalActionAlert: true, // Alert on contract operations
    twoFADisableAlert: true,   // Alert when 2FA disabled
    settingsChangeAlert: true  // Alert on settings changes
  }
};

// Track failed login attempts for threshold alerts
const failedLoginTracker = new Map();

/**
 * Send Discord webhook notification
 */
async function sendDiscordAlert(embed) {
  if (!ALERT_CONFIG.discord.enabled) return;

  const payload = {
    username: '🔐 dWallet Security Bot',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/2910/2910768.png',
    embeds: [embed]
  };

  try {
    const url = new URL(ALERT_CONFIG.discord.webhookUrl);
    const data = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        resolve(res.statusCode === 204);
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  } catch (error) {
    console.error('❌ Discord alert failed:', error.message);
    return false;
  }
}

/**
 * Send Slack webhook notification
 */
async function sendSlackAlert(attachment) {
  if (!ALERT_CONFIG.slack.enabled) return;

  const payload = {
    text: '🔐 dWallet Admin Security Alert',
    attachments: [attachment]
  };

  try {
    const url = new URL(ALERT_CONFIG.slack.webhookUrl);
    const data = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  } catch (error) {
    console.error('❌ Slack alert failed:', error.message);
    return false;
  }
}

/**
 * Send email notification (with nodemailer)
 */
async function sendEmailAlert(subject, body) {
  if (!ALERT_CONFIG.email.enabled) return;

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: ALERT_CONFIG.email.smtpHost,
      port: ALERT_CONFIG.email.smtpPort,
      secure: ALERT_CONFIG.email.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: ALERT_CONFIG.email.smtpUser,
        pass: ALERT_CONFIG.email.smtpPass
      }
    });

    // Email options
    const mailOptions = {
      from: `"dWallet Security" <${ALERT_CONFIG.email.smtpUser}>`,
      to: ALERT_CONFIG.email.alertEmail,
      subject: subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff0000;">🔐 dWallet Security Alert</h2>
          <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; font-size: 14px;">${body}</pre>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666; font-size: 12px;">
            This is an automated alert from dWallet Admin Security Monitor.<br />
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email alert sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email alert failed:', error.message);
    return false;
  }
}

/**
 * Main alert dispatcher - sends to all enabled channels
 */
async function sendSecurityAlert(event) {
  const {
    type,
    severity,
    adminId,
    details,
    ipAddress,
    timestamp = new Date().toISOString()
  } = event;

  // Format timestamp for display
  const formattedTime = new Date(timestamp).toLocaleString();

  // Color coding based on severity
  const severityColors = {
    critical: '#ff0000',  // Red
    high: '#ff6600',      // Orange
    medium: '#ffcc00',    // Yellow
    low: '#36a64f'        // Green
  };

  const color = severityColors[severity] || severityColors.low;

  // Discord embed
  const discordEmbed = {
    title: `🚨 ${type}`,
    color: parseInt(color.replace('#', ''), 16),
    timestamp: timestamp,
    fields: [
      { name: 'Severity', value: severity.toUpperCase(), inline: true },
      { name: 'Admin ID', value: adminId || 'Unknown', inline: true },
      { name: 'IP Address', value: ipAddress || 'Unknown', inline: true },
      { name: 'Details', value: details || 'No details provided' }
    ],
    footer: {
      text: 'dWallet Admin Security Monitor'
    }
  };

  // Slack attachment
  const slackAttachment = {
    color: color,
    title: `🚨 ${type}`,
    fields: [
      { title: 'Severity', value: severity.toUpperCase(), short: true },
      { title: 'Admin ID', value: adminId || 'Unknown', short: true },
      { title: 'IP Address', value: ipAddress || 'Unknown', short: true },
      { title: 'Time', value: formattedTime, short: true },
      { title: 'Details', value: details || 'No details provided', short: false }
    ],
    ts: Math.floor(Date.now() / 1000)
  };

  // Email subject and body
  const emailSubject = `[${severity.toUpperCase()}] ${type} - dWallet Admin Alert`;
  const emailBody = `
Security Alert: ${type}
Severity: ${severity.toUpperCase()}
Admin ID: ${adminId || 'Unknown'}
IP Address: ${ipAddress || 'Unknown'}
Time: ${formattedTime}

Details:
${details || 'No details provided'}

---
This is an automated alert from dWallet Admin Security Monitor.
  `.trim();

  // Send to all enabled channels
  const results = await Promise.allSettled([
    sendDiscordAlert(discordEmbed),
    sendSlackAlert(slackAttachment),
    sendEmailAlert(emailSubject, emailBody)
  ]);

  // Log results
  results.forEach((result, index) => {
    const channels = ['Discord', 'Slack', 'Email'];
    if (result.status === 'rejected') {
      console.error(`❌ ${channels[index]} alert failed:`, result.reason.message);
    }
  });

  return results;
}

/**
 * Track failed login attempts and alert if threshold exceeded
 */
async function trackFailedLogin(adminId, ipAddress) {
  const key = `${adminId}:${ipAddress}`;
  const current = failedLoginTracker.get(key) || { count: 0, lastAttempt: null };
  
  current.count++;
  current.lastAttempt = new Date().toISOString();
  failedLoginTracker.set(key, current);

  // Alert if threshold exceeded
  if (current.count >= ALERT_CONFIG.thresholds.failedLoginAlert) {
    await sendSecurityAlert({
      type: 'Multiple Failed Login Attempts',
      severity: 'high',
      adminId,
      ipAddress,
      details: `Failed login attempt #${current.count} from ${ipAddress}. Account may be under attack.`
    });

    // Reset counter after alert
    failedLoginTracker.delete(key);
  }
}

/**
 * Alert on new IP address login
 */
async function alertNewIpLogin(adminId, ipAddress, userAgent) {
  if (!ALERT_CONFIG.thresholds.newIpAlert) return;

  await sendSecurityAlert({
    type: 'New IP Address Login',
    severity: 'medium',
    adminId,
    ipAddress,
    details: `Admin logged in from new IP address.\nIP: ${ipAddress}\nUser Agent: ${userAgent}`
  });
}

/**
 * Alert on critical contract operations
 */
async function alertCriticalAction(adminId, action, contract, ipAddress) {
  if (!ALERT_CONFIG.thresholds.criticalActionAlert) return;

  await sendSecurityAlert({
    type: 'Critical Contract Operation',
    severity: 'high',
    adminId,
    ipAddress,
    details: `Critical action performed:\nAction: ${action}\nContract: ${contract}`
  });
}

/**
 * Alert when 2FA is disabled
 */
async function alert2FADisabled(adminId, ipAddress) {
  if (!ALERT_CONFIG.thresholds.twoFADisableAlert) return;

  await sendSecurityAlert({
    type: '2FA Disabled',
    severity: 'critical',
    adminId,
    ipAddress,
    details: `Two-factor authentication has been DISABLED for admin account. This significantly reduces security.`
  });
}

/**
 * Alert on settings changes
 */
async function alertSettingsChange(adminId, setting, oldValue, newValue, ipAddress) {
  if (!ALERT_CONFIG.thresholds.settingsChangeAlert) return;

  await sendSecurityAlert({
    type: 'Settings Changed',
    severity: 'medium',
    adminId,
    ipAddress,
    details: `Admin setting modified:\nSetting: ${setting}\nOld Value: ${oldValue}\nNew Value: ${newValue}`
  });
}

module.exports = {
  sendSecurityAlert,
  trackFailedLogin,
  alertNewIpLogin,
  alertCriticalAction,
  alert2FADisabled,
  alertSettingsChange,
  ALERT_CONFIG
};
