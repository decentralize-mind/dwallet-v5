const KEY = "dwallet_price_alerts";

export function getAlerts() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function addAlert(symbol, threshold, direction) {
  const alerts = getAlerts();
  alerts.push({
    id: Date.now(),
    symbol: symbol.toUpperCase(),
    threshold: parseFloat(threshold),
    direction,
    triggered: false,
    createdAt: Date.now(),
  });
  localStorage.setItem(KEY, JSON.stringify(alerts));
}

export function deleteAlert(id) {
  localStorage.setItem(KEY, JSON.stringify(getAlerts().filter(a => a.id !== id)));
}

export function checkAlerts(prices, onTrigger) {
  const alerts = getAlerts();
  let changed = false;
  alerts.forEach(alert => {
    if (alert.triggered) return;
    const price = prices[alert.symbol];
    if (!price) return;
    const hit = (alert.direction === "above" && price >= alert.threshold) ||
                (alert.direction === "below" && price <= alert.threshold);
    if (hit) { alert.triggered = true; changed = true; onTrigger?.(alert, price); }
  });
  if (changed) localStorage.setItem(KEY, JSON.stringify(alerts));
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

export function sendNotification(title, body) {
  if (Notification.permission !== "granted") return;
  try { new Notification(title, { body, icon: "/favicon.svg" }); } catch {}
}