import { useState, useEffect, useRef } from "react";
import { fetchPriceHistory } from "../utils/prices";

const PERIODS = [{label:"7D",days:7},{label:"30D",days:30},{label:"90D",days:90}];

export default function PortfolioChart({ balances, prices }) {
  const canvasRef = useRef(null);
  const [period,  setPeriod]  = useState("7D");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [change,  setChange]  = useState(null);

  useEffect(() => {
    const days = PERIODS.find(p => p.label === period)?.days || 7;
    setLoading(true);
    fetchPriceHistory("ETH", days).then(hist => {
      if (!hist || hist.length < 2) { setLoading(false); return; }
      const ethBal = Object.entries(balances || {})
        .filter(([k]) => k.includes("ETH"))
        .reduce((s,[,v]) => s + parseFloat(v||0), 0);
      const totalBal = Object.values(balances||{}).reduce((s,v) => s+parseFloat(v||0),0);
      const scale = totalBal > 0 ? Math.max(totalBal / Math.max(ethBal,0.001), 1) : 1;
      const series = hist.map(({ts,price}) => ({ ts, value: price * Math.max(ethBal,0.001) * scale }));
      setHistory(series);
      if (series.length >= 2) {
        const first = series[0].value, last = series[series.length-1].value;
        setChange(first > 0 ? (last-first)/first*100 : 0);
      }
      setLoading(false);
    });
  }, [period, balances]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const values = history.map(h => h.value);
    const min = Math.min(...values), max = Math.max(...values), range = max-min||1;
    const isUp = values[values.length-1] >= values[0];
    const color = isUp ? "#10b981" : "#ef4444";
    const toX = i => (i/(history.length-1))*W;
    const toY = v => H - ((v-min)/range)*(H-20) - 10;
    ctx.clearRect(0,0,W,H);
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(values[0]));
    history.forEach((_,i) => { if(i>0) ctx.lineTo(toX(i), toY(history[i].value)); });
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
    ctx.lineTo(toX(history.length-1), H); ctx.lineTo(0, H); ctx.closePath();
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, color+"44"); grad.addColorStop(1, color+"00");
    ctx.fillStyle = grad; ctx.fill();
  }, [history]);

  const isUp = change !== null && change >= 0;
  return (
    <div className="portfolio-chart-wrap">
      <div className="portfolio-chart-header">
        <div>
          {change !== null && (
            <span className={"portfolio-change " + (isUp?"positive":"negative")}>
              {isUp?"▲":"▼"} {Math.abs(change).toFixed(2)}%
            </span>
          )}
          <span className="portfolio-period-label"> this {period.toLowerCase()}</span>
        </div>
        <div className="portfolio-period-tabs">
          {PERIODS.map(p => (
            <button key={p.label}
              className={"period-tab " + (period===p.label?"period-tab--active":"")}
              onClick={() => setPeriod(p.label)}>{p.label}</button>
          ))}
        </div>
      </div>
      <div className="portfolio-canvas-wrap">
        {loading ? (
          <div className="portfolio-loading">
            <div className="wc-spinner" style={{width:20,height:20,borderWidth:2}}/>
          </div>
        ) : history.length < 2 ? (
          <div className="portfolio-loading">
            <span style={{fontSize:12,color:"var(--text3)"}}>Chart unavailable</span>
          </div>
        ) : (
          <canvas ref={canvasRef} className="portfolio-canvas"/>
        )}
      </div>
    </div>
  );
}