export function exportTransactionsCSV(transactions, address) {
  if (!transactions || transactions.length === 0) return false;

  const PRICES = {
    ETH:3200, BNB:420, MATIC:0.85, SOL:180,
    USDC:1, USDT:1, DAI:1, BUSD:1,
    BTC:65000, LINK:15, UNI:8, AAVE:95,
  };

  const headers = [
    "Date",
    "Time",
    "Type",
    "Token",
    "Amount",
    "USD Value",
    "From",
    "To",
    "Status",
    "Gas (ETH)",
    "Network",
    "Tx Hash",
  ];

  const rows = transactions.map(tx => {
    const date     = new Date(tx.timestamp || Date.now());
    const dateStr  = date.toISOString().split("T")[0];
    const timeStr  = date.toTimeString().split(" ")[0];
    const amount   = parseFloat(tx.amount || tx.value || 0);
    const price    = PRICES[tx.token?.toUpperCase()] || 1;
    const usdVal   = (amount * price).toFixed(2);

    return [
      dateStr,
      timeStr,
      (tx.type || "transfer").toUpperCase(),
      (tx.token || "ETH").toUpperCase(),
      amount.toFixed(8),
      "$" + usdVal,
      tx.from  || "",
      tx.to    || "",
      (tx.status || "confirmed").toUpperCase(),
      tx.gasUsed || "0",
      (tx.chain || "ethereum").toUpperCase(),
      tx.hash  || "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });

  const csv  = [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];

  link.href     = url;
  link.download = `toklo-transactions-${(address||"wallet").slice(0,8)}-${date}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
