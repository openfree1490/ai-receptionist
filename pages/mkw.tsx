import { useState, useEffect } from "react";

// ═══ CONVERGENCE-SCORED MOCK DATA ═══
// Each stock scored against the full MKW convergence checklist
const STOCKS = [
  // FULL CONVERGENCE — all 3 frameworks agree
  { tk: "TSEM", nm: "Tower Semiconductor", px: 141.96, dp: 2.97, wp: 18.85, mp: 12.79,
    wein: { stage: "2A", ma30w: 120.01, maSlope: "rising 11wk", vol: "2.3x avg" },
    min: { tpl: [1,1,1,1,1,1,1,1], rs: 99, vcp: { ct: 3, depths: "18→10→5.2%", pivot: 138.50, vol: "1.6x" }, eps: 34, rev: 22, margins: "expanding" },
    kell: { phase: "EMA Crossback→Pop", emaD: "bull", emaW: "bull", emaM: "bull", light: "green", base: 1 },
    conv: { primary: true, secondary: false, score: 22, max: 22, zone: "CONVERGENCE" },
    setup: "Full convergence breakout — VCP pivot cleared on 2.3x volume at EMA crossback",
    exit: [], risk: "SOX sector pullback", optPlay: "$140C Apr 17 · IV Rank 38" },
  { tk: "RKLB", nm: "Rocket Lab USA", px: 27.84, dp: 4.12, wp: 11.30, mp: 8.45,
    wein: { stage: "2A", ma30w: 22.10, maSlope: "rising 8wk", vol: "1.8x avg" },
    min: { tpl: [1,1,1,1,1,1,1,1], rs: 94, vcp: { ct: 2, depths: "22→9%", pivot: 26.50, vol: "1.5x" }, eps: 0, rev: 55, margins: "expanding" },
    kell: { phase: "EMA Crossback", emaD: "bull", emaW: "bull", emaM: "bull", light: "green", base: 1 },
    conv: { primary: true, secondary: false, score: 20, max: 22, zone: "CONVERGENCE" },
    setup: "1st base EMA crossback — VCP tightening with 55% rev growth, pivot $26.50 cleared",
    exit: [], risk: "Pre-profit company — EPS negative. Size smaller.", optPlay: "$28C May 16 · IV Rank 42" },
  // SECONDARY CONVERGENCE — Base n' Break / continuation
  { tk: "DELL", nm: "Dell Technologies", px: 149.21, dp: -2.48, wp: 1.25, mp: 25.32,
    wein: { stage: "2B", ma30w: 128.40, maSlope: "rising 16wk", vol: "0.9x avg" },
    min: { tpl: [1,1,1,1,1,1,1,1], rs: 80, vcp: { ct: 2, depths: "15→8%", pivot: 152.00, vol: "pending" }, eps: 18, rev: 12, margins: "stable" },
    kell: { phase: "Base n Break", emaD: "neutral", emaW: "bull", emaM: "bull", light: "green", base: 2 },
    conv: { primary: false, secondary: true, score: 17, max: 22, zone: "SECONDARY" },
    setup: "2nd base consolidation near EMAs — waiting for volume expansion above $152 pivot",
    exit: [{ signal: "2nd base — lower success rate per Minervini", severity: "caution" }], risk: "Late-stage base. Tighter stop required.", optPlay: "Wait for breakout confirmation" },
  { tk: "CF", nm: "CF Industries", px: 126.73, dp: 2.79, wp: 5.49, mp: 27.42,
    wein: { stage: "2A", ma30w: 105.60, maSlope: "rising 9wk", vol: "1.2x avg" },
    min: { tpl: [1,1,1,1,1,1,0,1], rs: 57, vcp: { ct: 0, depths: "—", pivot: null, vol: "—" }, eps: 28, rev: 15, margins: "expanding" },
    kell: { phase: "EMA Crossback", emaD: "bull", emaW: "bull", emaM: "bull", light: "green", base: 1 },
    conv: { primary: false, secondary: false, score: 14, max: 22, zone: "BUILDING" },
    setup: "EMA crossback in play but RS only 57 — fails Minervini RS criterion. Watch for improvement.",
    exit: [{ signal: "RS < 70 — not a confirmed leader", severity: "warning" }], risk: "Lagging RS. Not a true leader yet.", optPlay: "No play until RS > 70" },
  // BUILDING / ON DECK
  { tk: "GKOS", nm: "Glaukos Corp", px: 103.22, dp: 0.28, wp: 0.35, mp: -11.85,
    wein: { stage: "2A", ma30w: 95.80, maSlope: "rising 5wk", vol: "0.7x avg" },
    min: { tpl: [1,1,1,1,1,0,1,1], rs: 44, vcp: { ct: 2, depths: "20→12%", pivot: 108.00, vol: "pending" }, eps: 0, rev: 18, margins: "improving" },
    kell: { phase: "Wedge", emaD: "bull", emaW: "bull", emaM: "neutral", light: "green", base: 1 },
    conv: { primary: false, secondary: false, score: 11, max: 22, zone: "BUILDING" },
    setup: "Wedge forming but RS 44 is weak. Needs 52wk high breakout + RS surge to qualify.",
    exit: [{ signal: "RS < 70", severity: "warning" }, { signal: "Monthly negative — trend not confirmed", severity: "caution" }], risk: "Weak RS. Pre-profit.", optPlay: "No play" },
  { tk: "SMG", nm: "Scotts Miracle-Gro", px: 64.47, dp: 3.57, wp: 2.69, mp: -6.77,
    wein: { stage: "1B", ma30w: 63.10, maSlope: "flattening", vol: "0.8x avg" },
    min: { tpl: [1,0,0,0,0,0,0,0], rs: 38, vcp: { ct: 0, depths: "—", pivot: null, vol: "—" }, eps: -12, rev: 3, margins: "contracting" },
    kell: { phase: "Wedge Pop attempt", emaD: "neutral", emaW: "bull", emaM: "neutral", light: "yellow", base: 0 },
    conv: { primary: false, secondary: false, score: 4, max: 22, zone: "WATCH" },
    setup: "Late Stage 1 — potential S1→S2 transition. 30wk MA flattening. Far from convergence.",
    exit: [{ signal: "Only 1/8 template criteria met", severity: "fail" }, { signal: "Negative EPS growth", severity: "fail" }], risk: "Not investable under MKW. Watch only.", optPlay: "No play" },
];

const THREATS = [
  { tk: "CVNA", sc: 9.1, type: "Bull Trap", sum: "Dark pool short volume 73.6%, insiders liquidated $1B+, subprime auto loan deterioration Q2-Q3 2026. Stage 3→4 transition.", sf: 10.6, wsb: 20, mc: -12.9, divSignals: ["Price below flattening 30wk MA (Weinstein S3)", "Trend Template failing — 200d MA declining", "Wedge Drop — rally into declining EMAs rejected (Kell)"] },
  { tk: "HIMS", sc: 7.8, type: "Momentum Reversal", sum: "WSB mentions surging while price collapses 33%. High short float. All 3 frameworks signal exit.", sf: 40.8, wsb: 139, mc: -33.0, divSignals: ["Stage 4 confirmed — below declining 30wk MA", "0/8 Trend Template criteria met", "Red Light — below declining 10/20 EMAs"] },
  { tk: "SMCI", sc: 8.4, type: "Accounting Risk", sum: "Repeated restatement concerns. Extreme volatility. Institutional selling accelerating.", sf: 15.2, wsb: 95, mc: -18.5, divSignals: ["Weinstein Stage 4", "Failed VCP — broke below pivot", "Exhaustion Extension top → Wedge Drop confirmed"] },
];

const BREADTH = { spx: { v: 5667, c: -0.42, stage: 2, ema20: "above" }, ndx: { v: 19845, c: 0.18, stage: 2, ema20: "above" }, rut: { v: 2034, c: -1.12, stage: 1, ema20: "below" }, vix: 22.45, ad: { a: 1847, d: 1653 }, nh: { h: 87, l: 43 }, a50: 54.2, a200: 61.8, tplCount: 847, sec: [{ n: "Energy", p: 4.2 }, { n: "Tech", p: 0.8 }, { n: "Healthcare", p: -0.3 }, { n: "Financials", p: 1.1 }, { n: "Industrials", p: 2.4 }, { n: "Cons Disc", p: -1.8 }, { n: "Cons Stpl", p: 0.2 }, { n: "Materials", p: 3.1 }, { n: "Real Estate", p: -0.9 }, { n: "Utilities", p: 0.1 }, { n: "Comms", p: -0.5 }] };

const JOURNAL = [
  { id: 1, d: "03-17", tk: "TSEM", a: "BUY", ty: "Swing Call", st: "$140C 04/17", en: 8.50, cu: 12.20, pnl: 43.5, conv: "PRIMARY", n: "Full convergence. VCP pop on 2.3x vol." },
  { id: 2, d: "03-14", tk: "CF", a: "BUY", ty: "Swing Call", st: "$125C 04/17", en: 4.80, cu: 6.10, pnl: 27.1, conv: "PARTIAL", n: "EMA crossback but RS < 70. Smaller size." },
  { id: 3, d: "03-10", tk: "NVDA", a: "SELL", ty: "Stop Out", st: "$950C 03/21", en: 12.00, cu: 0, pnl: -100, conv: "EXIT", n: "S3 transition. 30wk MA flattening. Sold per MKW exit rules." },
];

// ═══ STYLES ═══
const X = { bg: "#06090f", c1: "#0c1018", c2: "#131a24", b1: "#182030", b2: "#243045", tx: "#b8c4d8", td: "#4a5878", tb: "#ecf0f8", g: "#00e676", r: "#ff3d57", a: "#ffab00", bl: "#448aff", p: "#b388ff", cy: "#18ffff", gd: "#ffd700" };
const ft = "'DM Mono','Fira Code',monospace", fu = "'Outfit',system-ui,sans-serif";

// ═══ UTILITIES ═══
const Pc = ({ v, s = 10 }: { v: number | null, s?: number }) => v == null ? <span style={{ color: X.td, fontSize: s }}>—</span> : <span style={{ color: v >= 0 ? X.g : X.r, fontSize: s, fontFamily: ft }}>{v >= 0 ? "▲+" : "▼"}{v.toFixed(2)}%</span>;
const Dot = ({ c }: { c: string }) => <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />;
const Cd = ({ l, v, sub, ac }: { l: string, v: any, sub?: any, ac?: string }) => <div style={{ background: X.c1, border: `1px solid ${X.b1}`, padding: "10px 12px", flex: "1 1 0", minWidth: 110 }}><div style={{ fontSize: 7, color: X.td, fontFamily: fu, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3 }}>{l}</div><div style={{ fontSize: 17, fontFamily: ft, fontWeight: 600, color: ac || X.tb }}>{v}</div>{sub && <div style={{ fontSize: 8, color: X.td, marginTop: 2 }}>{sub}</div>}</div>;

const ZONE_COLORS: Record<string, string> = { "CONVERGENCE": X.gd, "SECONDARY": X.cy, "BUILDING": X.bl, "WATCH": X.td };
const ZONE_LABELS: Record<string, string> = { "CONVERGENCE": "⚡ FULL CONVERGENCE", "SECONDARY": "◈ SECONDARY CONVERGENCE", "BUILDING": "◇ BUILDING", "WATCH": "◌ WATCH ONLY" };
const ZONE_DESCS: Record<string, string> = { "CONVERGENCE": "All 3 frameworks agree — Weinstein S2A + Minervini VCP/Template + Kell EMA Crossback/Pop", "SECONDARY": "Base n' Break / continuation — 2nd+ base VCP within confirmed uptrend", "BUILDING": "Partial criteria met — approaching convergence but not yet actionable", "WATCH": "Early stage — significant criteria gaps remain" };

const ZoneBadge = ({ zone }: { zone: string }) => <span style={{ fontSize: 8, fontFamily: ft, padding: "2px 7px", borderRadius: 2, color: ZONE_COLORS[zone], background: ZONE_COLORS[zone] + "18", border: `1px solid ${ZONE_COLORS[zone]}30`, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{zone}</span>;
const ConvBar = ({ score, max }: { score: number, max: number }) => <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 50, height: 4, background: X.b1, borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${(score / max) * 100}%`, height: "100%", background: score >= 20 ? X.gd : score >= 15 ? X.cy : score >= 10 ? X.bl : X.td, borderRadius: 2 }} /></div><span style={{ fontSize: 9, fontFamily: ft, color: score >= 20 ? X.gd : X.td }}>{score}/{max}</span></div>;

// ═══ MARKET ENVIRONMENT — TRIPLE CHECK ═══
function MarketEnv() {
  const b = BREADTH;
  const weinOk = b.spx.stage === 2;
  const kellOk = b.spx.ema20 === "above";
  const minOk = b.tplCount > 500;
  const allGreen = weinOk && kellOk && minOk;

  return <div style={{ background: allGreen ? X.g + "08" : X.r + "08", border: `1px solid ${allGreen ? X.g : X.a}25`, padding: "12px 14px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontFamily: fu, fontSize: 12, fontWeight: 700, color: X.tb }}>Market Environment — Triple Framework Check</span>
      <span style={{ fontFamily: ft, fontSize: 11, fontWeight: 700, color: allGreen ? X.g : X.a, padding: "2px 10px", background: allGreen ? X.g + "18" : X.a + "18", border: `1px solid ${allGreen ? X.g : X.a}30`, borderRadius: 3 }}>
        {allGreen ? "✓ ALL CLEAR — Full aggression" : "△ MIXED — Be selective"}
      </span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {([
        ["WEINSTEIN", `S&P in Stage ${b.spx.stage}`, weinOk, weinOk ? "Indices in Stage 2 — bullish backdrop" : "Indices NOT in Stage 2 — reduce exposure"],
        ["KELL", `S&P ${b.spx.ema20} 20 EMA`, kellOk, kellOk ? "Green Light — above 20 EMA" : "Red Light — below 20 EMA, stay cash"],
        ["MINERVINI", `${b.tplCount} stocks pass Template`, minOk, minOk ? `${b.tplCount} qualifiers = healthy market` : "Few qualifiers = narrow/weak market"],
      ] as [string, string, boolean, string][]).map(([name, val, ok, desc]) => (
        <div key={name} style={{ background: X.c1, border: `1px solid ${ok ? X.g : X.r}20`, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontFamily: ft, color: ok ? X.g : X.r, letterSpacing: 1.5 }}>{name}</span>
            <span style={{ fontSize: 10, color: ok ? X.g : X.r }}>{ok ? "✓" : "✗"}</span>
          </div>
          <div style={{ fontSize: 12, fontFamily: ft, fontWeight: 600, color: X.tb, marginBottom: 3 }}>{val}</div>
          <div style={{ fontSize: 8, fontFamily: fu, color: X.td, lineHeight: 1.5 }}>{desc}</div>
        </div>
      ))}
    </div>
  </div>;
}

// ═══ CONVERGENCE CHECKLIST PANEL ═══
function Checklist({ s }: { s: typeof STOCKS[0] }) {
  const checks = [
    { cat: "MARKET", items: [["Indices in Weinstein S2", BREADTH.spx.stage === 2], ["Kell Green Light (above 20 EMA)", BREADTH.spx.ema20 === "above"], ["Minervini: many stocks pass Template", BREADTH.tplCount > 500]] as [string, boolean][] },
    { cat: "TREND", items: [["Weinstein: Stock in Stage 2A", s.wein.stage === "2A"], ["Template: 8/8 criteria met", s.min.tpl.every(x => x === 1)], ["RS Rating > 70", s.min.rs >= 70], ["Kell: Above rising 10/20 EMAs", s.kell.emaD === "bull" && s.kell.emaW === "bull"], ["Price > 50d > 150d > 200d (stacked)", !!(s.min.tpl[0] && s.min.tpl[1] && s.min.tpl[3])]] as [string, boolean][] },
    { cat: "FUNDAMENTALS", items: [["EPS growth > 20% (accelerating)", s.min.eps > 20], ["Revenue growth > 15%", s.min.rev > 15], ["Margins expanding", s.min.margins === "expanding"]] as [string, boolean][] },
    { cat: "ENTRY", items: [["VCP formed (2+ contractions, tightening)", s.min.vcp.ct >= 2], ["Volume expansion at pivot (1.4x+)", parseFloat(s.min.vcp.vol) >= 1.4], ["Kell: EMA Crossback or Pop in play", s.kell.phase.includes("Crossback") || s.kell.phase.includes("Pop")], ["Entry within 5% of pivot", s.min.vcp.pivot ? (s.px / s.min.vcp.pivot - 1) * 100 <= 5 : false]] as [string, boolean][] },
    { cat: "RISK", items: [["Stop below VCP low / EMA support", true], ["Risk < 7-8% from entry", true], ["R:R ratio ≥ 3:1", true]] as [string, boolean][] },
  ];
  const total = checks.reduce((a, c) => a + c.items.length, 0);
  const passed = checks.reduce((a, c) => a + c.items.filter(i => i[1]).length, 0);

  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
      <span style={{ fontFamily: fu, fontSize: 11, fontWeight: 600, color: X.tb }}>MKW Convergence Checklist</span>
      <span style={{ fontFamily: ft, fontSize: 13, fontWeight: 700, color: passed >= 18 ? X.gd : passed >= 14 ? X.cy : X.a }}>{passed}/{total}</span>
    </div>
    {checks.map(c => <div key={c.cat}>
      <div style={{ fontSize: 7, fontFamily: ft, color: X.td, letterSpacing: 1.5, marginBottom: 2, marginTop: 4 }}>{c.cat}</div>
      {c.items.map(([label, ok], i) => <div key={i} style={{ display: "flex", gap: 5, fontSize: 9, fontFamily: ft, padding: "1px 0" }}>
        <span style={{ color: ok ? X.g : X.r, width: 10 }}>{ok ? "✓" : "✗"}</span>
        <span style={{ color: ok ? X.tx : X.td }}>{label}</span>
      </div>)}
    </div>)}
  </div>;
}

// ═══ TAB: DASHBOARD ═══
function Dash() {
  const zones: Record<string, typeof STOCKS> = { "CONVERGENCE": STOCKS.filter(s => s.conv.zone === "CONVERGENCE"), "SECONDARY": STOCKS.filter(s => s.conv.zone === "SECONDARY"), "BUILDING": STOCKS.filter(s => s.conv.zone === "BUILDING"), "WATCH": STOCKS.filter(s => s.conv.zone === "WATCH") };
  const b = BREADTH;
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <MarketEnv />
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <Cd l="S&P 500" v={b.spx.v.toLocaleString()} sub={<Pc v={b.spx.c} s={8} />} />
      <Cd l="VIX" v={b.vix} ac={b.vix > 20 ? X.a : X.g} sub={b.vix > 25 ? "Elevated — reduce size" : b.vix > 20 ? "Slightly elevated" : "Low — favorable"} />
      <Cd l="Convergence Names" v={zones.CONVERGENCE.length} ac={X.gd} sub="Full 3-framework agreement" />
      <Cd l="Template Qualifiers" v={b.tplCount} sub="Stocks passing 8/8 criteria" ac={b.tplCount > 500 ? X.g : X.r} />
    </div>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 420px", background: X.c1, border: `1px solid ${X.gd}20`, padding: 12 }}>
        <div style={{ fontSize: 10, fontFamily: fu, fontWeight: 600, color: X.gd, marginBottom: 8 }}>⚡ Convergence Zone — Highest Conviction</div>
        {zones.CONVERGENCE.length === 0 ? <div style={{ fontSize: 10, fontFamily: ft, color: X.td, padding: 12, textAlign: "center" }}>No full convergence setups today</div> :
        zones.CONVERGENCE.map(s => <div key={s.tk} style={{ padding: "8px 10px", background: X.gd + "08", borderLeft: `2px solid ${X.gd}`, marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><span style={{ fontFamily: ft, fontSize: 13, fontWeight: 700, color: X.tb }}>{s.tk}</span><span style={{ fontSize: 10, fontFamily: ft, color: X.td, marginLeft: 6 }}>${s.px} · RS {s.min.rs}</span></div>
            <ConvBar score={s.conv.score} max={s.conv.max} />
          </div>
          <div style={{ fontSize: 9, fontFamily: ft, color: X.gd, marginTop: 3 }}>{s.kell.phase} · VCP {s.min.vcp.ct} contractions ({s.min.vcp.depths})</div>
          <div style={{ fontSize: 8, fontFamily: fu, color: X.tx, marginTop: 2 }}>{s.setup}</div>
        </div>)}
      </div>
      <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ background: X.c1, border: `1px solid ${X.cy}20`, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: fu, fontWeight: 600, color: X.cy, marginBottom: 6 }}>◈ Secondary Convergence — Continuation Setups</div>
          {zones.SECONDARY.map(s => <div key={s.tk} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
            <div><span style={{ fontFamily: ft, fontSize: 11, fontWeight: 600, color: X.tb }}>{s.tk}</span><span style={{ fontSize: 9, fontFamily: ft, color: X.td, marginLeft: 4 }}>Base #{s.kell.base}</span></div>
            <ConvBar score={s.conv.score} max={s.conv.max} />
          </div>)}
        </div>
        <div style={{ background: X.r + "08", border: `1px solid ${X.r}20`, padding: 12 }}>
          <div style={{ fontSize: 9, fontFamily: fu, fontWeight: 600, color: X.r, marginBottom: 6 }}>🚨 Divergence Alerts — Exit Zone</div>
          {THREATS.slice(0, 2).map(t => <div key={t.tk} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span style={{ fontFamily: ft, fontSize: 11, fontWeight: 600, color: X.r }}>{t.tk} · {t.type}</span>
            <span style={{ fontSize: 9, fontFamily: ft, color: X.r }}>{t.sc}/10</span>
          </div>)}
        </div>
      </div>
    </div>
    <div style={{ background: X.c1, border: `1px solid ${X.b1}`, padding: 12 }}>
      <div style={{ fontSize: 9, fontFamily: fu, fontWeight: 600, color: X.tb, marginBottom: 6 }}>Sector Rotation — Weinstein "Forest to Trees"</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {b.sec.map(s => { const c = s.p > 0.5 ? X.g : s.p > -0.5 ? X.td : X.r; const bg = s.p > 2 ? "#00e67620" : s.p > 0.5 ? "#00e6760c" : s.p > -0.5 ? X.td + "06" : "#ff3d570c"; return <div key={s.n} style={{ background: bg, padding: "6px 10px", flex: "1 1 75px", minWidth: 75, textAlign: "center" }}><div style={{ fontSize: 7, fontFamily: fu, color: X.td }}>{s.n}</div><div style={{ fontSize: 11, fontFamily: ft, fontWeight: 600, color: c }}>{s.p > 0 ? "+" : ""}{s.p}%</div></div>; })}
      </div>
    </div>
  </div>;
}

// ═══ TAB: CONVERGENCE WATCHLIST ═══
function WL({ stocks }: { stocks: typeof STOCKS }) {
  const [sel, setSel] = useState<typeof STOCKS[0] | null>(null);
  const zones = ["CONVERGENCE", "SECONDARY", "BUILDING", "WATCH"];
  return <div style={{ display: "flex", gap: 12 }}>
    <div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: 14 }}>
      {zones.map(zone => {
        const items = stocks.filter(s => s.conv.zone === zone);
        if (items.length === 0) return null;
        const zc = ZONE_COLORS[zone];
        return <div key={zone} style={{ background: X.c1, border: `1px solid ${zc}20`, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${X.b1}`, background: zc + "06" }}>
            <div style={{ fontFamily: fu, fontSize: 10, fontWeight: 700, color: zc }}>{ZONE_LABELS[zone]} <span style={{ fontSize: 8, fontWeight: 400, color: X.td, marginLeft: 6 }}>{items.length}</span></div>
            <div style={{ fontSize: 7, fontFamily: fu, color: X.td, marginTop: 2 }}>{ZONE_DESCS[zone]}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "52px 65px 62px 62px 70px 32px 42px 50px 60px 1fr", padding: "4px 14px", gap: 2, borderBottom: `1px solid ${X.b1}` }}>
            {["TICKER", "PRICE", "DAY %", "WEEK %", "MONTH %", "RS", "EMA", "CONV", "PHASE", "SETUP / CONVERGENCE NOTES"].map(h => <span key={h} style={{ fontSize: 6, fontFamily: ft, color: X.td, letterSpacing: 1 }}>{h}</span>)}
          </div>
          {items.map((s, i) => <div key={s.tk} onClick={() => setSel(s)} style={{ display: "grid", gridTemplateColumns: "52px 65px 62px 62px 70px 32px 42px 50px 60px 1fr", padding: "7px 14px", gap: 2, alignItems: "center", background: sel?.tk === s.tk ? zc + "10" : i % 2 ? X.td + "04" : "transparent", cursor: "pointer", borderLeft: sel?.tk === s.tk ? `2px solid ${zc}` : "2px solid transparent" }}>
            <span style={{ fontFamily: ft, fontSize: 11, fontWeight: 700, color: X.tb }}>{s.tk}</span>
            <span style={{ fontFamily: ft, fontSize: 9, color: X.tx }}>${s.px}</span>
            <Pc v={s.dp} s={9} /><Pc v={s.wp} s={9} /><Pc v={s.mp} s={9} />
            <span style={{ fontFamily: ft, fontSize: 9, fontWeight: 700, color: s.min.rs >= 80 ? X.g : s.min.rs >= 70 ? X.a : X.r }}>{s.min.rs}</span>
            <div style={{ display: "flex", gap: 1.5 }}><Dot c={s.kell.emaD === "bull" ? X.g : s.kell.emaD === "bear" ? X.r : X.a} /><Dot c={s.kell.emaW === "bull" ? X.g : X.a} /><Dot c={s.kell.emaM === "bull" ? X.g : X.a} /></div>
            <ConvBar score={s.conv.score} max={s.conv.max} />
            <span style={{ fontSize: 8, fontFamily: ft, color: X.tx }}>{s.kell.phase.split("→")[0]}</span>
            <span style={{ fontSize: 8, fontFamily: ft, color: X.td, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.setup}</span>
          </div>)}
        </div>;
      })}
    </div>
    {sel && <div style={{ width: 260, background: X.c1, border: `1px solid ${ZONE_COLORS[sel.conv.zone]}20`, padding: 14, flexShrink: 0, overflowY: "auto", maxHeight: "70vh" }}>
      <div style={{ borderBottom: `1px solid ${X.b1}`, paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: fu, fontSize: 16, fontWeight: 700, color: X.tb }}>{sel.tk}</span><ZoneBadge zone={sel.conv.zone} /></div>
        <div style={{ fontSize: 9, fontFamily: ft, color: X.td }}>{sel.nm} · ${sel.px}</div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 7, fontFamily: ft, color: X.td, letterSpacing: 1.5, marginBottom: 3 }}>WEINSTEIN</div>
        <div style={{ fontSize: 9, fontFamily: ft, color: X.tx }}>Stage {sel.wein.stage} · 30wk MA ${sel.wein.ma30w} ({sel.wein.maSlope})</div>
        <div style={{ fontSize: 8, fontFamily: ft, color: X.td }}>Breakout volume: {sel.wein.vol}</div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 7, fontFamily: ft, color: X.td, letterSpacing: 1.5, marginBottom: 3 }}>MINERVINI</div>
        <div style={{ fontSize: 9, fontFamily: ft, color: X.tx }}>Template: {sel.min.tpl.filter(x => x).length}/8 · RS: {sel.min.rs}</div>
        <div style={{ fontSize: 8, fontFamily: ft, color: X.td }}>VCP: {sel.min.vcp.ct > 0 ? `${sel.min.vcp.ct} contractions (${sel.min.vcp.depths})` : "None"}</div>
        <div style={{ fontSize: 8, fontFamily: ft, color: X.td }}>EPS: {sel.min.eps > 0 ? "+" : ""}{sel.min.eps}% · Rev: +{sel.min.rev}%</div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 7, fontFamily: ft, color: X.td, letterSpacing: 1.5, marginBottom: 3 }}>KELL</div>
        <div style={{ fontSize: 9, fontFamily: ft, color: X.tx }}>Phase: {sel.kell.phase} · Base #{sel.kell.base || "—"}</div>
        <div style={{ fontSize: 8, fontFamily: ft, color: X.td }}>Light: <span style={{ color: sel.kell.light === "green" ? X.g : X.a }}>{sel.kell.light}</span> · D/W/M: {sel.kell.emaD}/{sel.kell.emaW}/{sel.kell.emaM}</div>
      </div>
      {sel.optPlay && <div style={{ background: X.bl + "10", border: `1px solid ${X.bl}20`, padding: "6px 8px", marginBottom: 8 }}>
        <div style={{ fontSize: 7, fontFamily: ft, color: X.bl, letterSpacing: 1.5 }}>OPTIONS</div>
        <div style={{ fontSize: 9, fontFamily: ft, color: X.cy }}>{sel.optPlay}</div>
      </div>}
      {sel.exit.length > 0 && <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 7, fontFamily: ft, color: X.r, letterSpacing: 1.5, marginBottom: 3 }}>⚠ FLAGS</div>
        {sel.exit.map((e, i) => <div key={i} style={{ fontSize: 8, fontFamily: ft, color: e.severity === "fail" ? X.r : X.a, padding: "1px 0" }}>• {e.signal}</div>)}
      </div>}
      <Checklist s={sel} />
    </div>}
  </div>;
}

// ═══ TAB: AI ANALYSIS ═══
function AI() {
  const convStocks = STOCKS.filter(s => s.conv.zone === "CONVERGENCE" || s.conv.zone === "SECONDARY");
  const [sel, setSel] = useState(convStocks[0] || STOCKS[0]);
  return <div style={{ display: "flex", gap: 12, minHeight: 440 }}>
    <div style={{ width: 140, background: X.c1, border: `1px solid ${X.b1}`, padding: "8px 0", flexShrink: 0 }}>
      <div style={{ padding: "0 10px 6px", fontSize: 7, fontFamily: ft, color: X.td, letterSpacing: 1.5 }}>BY ZONE</div>
      {STOCKS.map(s => <div key={s.tk} onClick={() => setSel(s)} style={{ padding: "5px 10px", cursor: "pointer", fontFamily: ft, fontSize: 10, color: sel?.tk === s.tk ? X.tb : X.td, background: sel?.tk === s.tk ? X.c2 : "transparent", borderLeft: sel?.tk === s.tk ? `2px solid ${ZONE_COLORS[s.conv.zone]}` : "2px solid transparent", display: "flex", justifyContent: "space-between" }}>
        <span>{s.tk}</span><span style={{ fontSize: 7, color: ZONE_COLORS[s.conv.zone] }}>{s.conv.score}</span>
      </div>)}
    </div>
    <div style={{ flex: 1, background: X.c1, border: `1px solid ${X.b1}`, padding: 16, overflowY: "auto" }}>
      <div style={{ borderBottom: `1px solid ${X.b1}`, paddingBottom: 10, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
        <div><span style={{ fontFamily: fu, fontSize: 17, fontWeight: 700, color: X.tb }}>{sel.tk}</span><span style={{ fontFamily: fu, fontSize: 11, color: X.td, marginLeft: 8 }}>{sel.nm}</span><span style={{ marginLeft: 8 }}><ZoneBadge zone={sel.conv.zone} /></span></div>
        <div style={{ fontSize: 20, fontFamily: ft, fontWeight: 700, color: ZONE_COLORS[sel.conv.zone] }}>{sel.conv.score}<span style={{ fontSize: 10, color: X.td }}>/{sel.conv.max}</span></div>
      </div>
      {([
        ["WEINSTEIN — Stage Analysis", X.g, `Stage ${sel.wein.stage} · 30wk MA ${sel.wein.ma30w} (${sel.wein.maSlope}) · Volume: ${sel.wein.vol}`],
        ["MINERVINI — SEPA / Trend Template", X.p, `Template: ${sel.min.tpl.filter(x => x).length}/8 · RS: ${sel.min.rs} · VCP: ${sel.min.vcp.ct > 0 ? `${sel.min.vcp.ct} contractions (${sel.min.vcp.depths}) Pivot ${sel.min.vcp.pivot}` : "None"} · EPS: ${sel.min.eps > 0 ? "+" : ""}${sel.min.eps}% Rev: +${sel.min.rev}% · Margins: ${sel.min.margins}`],
        ["KELL — Cycle of Price Action", X.cy, `Phase: ${sel.kell.phase} · Light: ${sel.kell.light} · EMA D/W/M: ${sel.kell.emaD}/${sel.kell.emaW}/${sel.kell.emaM} · Base #${sel.kell.base || "—"}`],
      ] as [string, string, string][]).map(([title, c, detail]) => <div key={title} style={{ borderLeft: `2px solid ${c}40`, paddingLeft: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 8, fontFamily: ft, color: c, letterSpacing: 1.5, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 10, fontFamily: ft, color: X.tx, lineHeight: 1.7 }}>{detail}</div>
      </div>)}
      <div style={{ background: sel.conv.zone === "CONVERGENCE" ? X.gd + "10" : X.bl + "10", border: `1px solid ${sel.conv.zone === "CONVERGENCE" ? X.gd : X.bl}20`, padding: "10px 12px", borderLeft: `3px solid ${sel.conv.zone === "CONVERGENCE" ? X.gd : X.bl}`, marginTop: 8 }}>
        <div style={{ fontSize: 8, fontFamily: ft, color: sel.conv.zone === "CONVERGENCE" ? X.gd : X.bl, letterSpacing: 1.5, marginBottom: 4 }}>CONVERGENCE THESIS</div>
        <div style={{ fontSize: 10, fontFamily: fu, color: X.tx, lineHeight: 1.8 }}>{sel.setup}</div>
      </div>
      {sel.optPlay && sel.optPlay !== "No play" && <div style={{ background: X.bl + "10", border: `1px solid ${X.bl}20`, padding: "8px 12px", marginTop: 6 }}>
        <div style={{ fontSize: 8, fontFamily: ft, color: X.bl, letterSpacing: 1.5, marginBottom: 3 }}>OPTIONS PLAY</div>
        <div style={{ fontSize: 10, fontFamily: ft, color: X.cy }}>{sel.optPlay}</div>
      </div>}
      <div style={{ background: X.r + "08", border: `1px solid ${X.r}20`, padding: "8px 12px", borderLeft: `3px solid ${X.r}`, marginTop: 6 }}>
        <div style={{ fontSize: 8, fontFamily: ft, color: X.r, letterSpacing: 1.5, marginBottom: 3 }}>RISK / FLAGS</div>
        <div style={{ fontSize: 10, fontFamily: fu, color: X.tx, lineHeight: 1.8 }}>{sel.risk}</div>
        {sel.exit.map((e, i) => <div key={i} style={{ fontSize: 9, fontFamily: ft, color: e.severity === "fail" ? X.r : X.a, marginTop: 2 }}>⚠ {e.signal}</div>)}
      </div>
      <div style={{ marginTop: 10 }}><Checklist s={sel} /></div>
    </div>
  </div>;
}

// ═══ TAB: RISK/DIVERGENCE ═══
function RI() {
  const [sel, setSel] = useState(THREATS[0]);
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ background: X.r + "06", border: `1px solid ${X.r}20`, padding: "10px 14px" }}>
      <div style={{ fontFamily: fu, fontSize: 11, fontWeight: 600, color: X.r, marginBottom: 4 }}>Divergence Zone — Where All 3 Frameworks Say EXIT</div>
      <div style={{ fontSize: 8, fontFamily: fu, color: X.td }}>Weinstein S3/S4 + Minervini Template failing + Kell Red Light/Wedge Drop = confirmed distribution or downtrend</div>
    </div>
    <div style={{ background: X.c1, border: `1px solid ${X.b1}`, padding: 12 }}>
      {THREATS.map(t => <div key={t.tk} onClick={() => setSel(t)} style={{ display: "grid", gridTemplateColumns: "55px 60px 55px 55px 55px 1fr", padding: "8px 6px", gap: 4, cursor: "pointer", alignItems: "center", background: sel?.tk === t.tk ? X.r + "10" : "transparent", borderLeft: sel?.tk === t.tk ? `2px solid ${X.r}` : "2px solid transparent" }}>
        <span style={{ fontFamily: ft, fontSize: 11, fontWeight: 700, color: X.tb }}>{t.tk}</span>
        <span style={{ fontSize: 9, fontFamily: ft, color: X.r }}>{t.sc}/10</span>
        <span style={{ fontSize: 9, fontFamily: ft, color: X.a }}>{t.wsb} WSB</span>
        <span style={{ fontSize: 9, fontFamily: ft, color: X.r }}>{t.sf}% short</span>
        <Pc v={t.mc} s={9} />
        <span style={{ fontSize: 8, fontFamily: ft, color: X.td }}>{t.type}</span>
      </div>)}
    </div>
    {sel && <div style={{ background: X.c1, border: `1px solid ${X.r}20`, padding: 16, borderLeft: `3px solid ${X.r}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: fu, fontSize: 14, fontWeight: 700, color: X.r }}>🚨 {sel.tk} — {sel.type}</span>
        <span style={{ fontFamily: ft, fontSize: 12, fontWeight: 700, color: X.r, padding: "2px 8px", background: "#3d0a15", borderRadius: 3 }}>{sel.sc}/10</span>
      </div>
      <div style={{ fontFamily: fu, fontSize: 11, color: X.tx, lineHeight: 1.9, marginBottom: 10 }}>{sel.sum}</div>
      <div style={{ fontSize: 8, fontFamily: ft, color: X.r, letterSpacing: 1.5, marginBottom: 4 }}>TRIPLE FRAMEWORK EXIT SIGNALS</div>
      {sel.divSignals.map((s, i) => <div key={i} style={{ fontSize: 9, fontFamily: ft, color: X.tx, padding: "2px 0", borderLeft: `2px solid ${X.r}40`, paddingLeft: 8, marginBottom: 2 }}>✗ {s}</div>)}
    </div>}
  </div>;
}

// ═══ TAB: JOURNAL ═══
function JN() {
  const w = JOURNAL.filter(j => j.pnl > 0).length;
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <Cd l="Trades" v={JOURNAL.length} /><Cd l="Win Rate" v={`${((w / JOURNAL.length) * 100).toFixed(0)}%`} ac={w / JOURNAL.length >= .5 ? X.g : X.r} /><Cd l="Convergence Trades" v={JOURNAL.filter(j => j.conv === "PRIMARY").length} ac={X.gd} sub="Full MKW convergence entries" />
    </div>
    <div style={{ background: X.c1, border: `1px solid ${X.b1}`, overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${X.b1}`, fontSize: 9, fontFamily: fu, fontWeight: 600, color: X.tb }}>Trade Log — Tagged by Convergence Level</div>
      {JOURNAL.map(j => <div key={j.id} style={{ display: "grid", gridTemplateColumns: "50px 44px 40px 80px 48px 48px 48px 65px 1fr", padding: "7px 14px", gap: 3, alignItems: "center", borderBottom: `1px solid ${X.b1}06` }}>
        <span style={{ fontSize: 8, fontFamily: ft, color: X.td }}>{j.d}</span>
        <span style={{ fontSize: 10, fontFamily: ft, fontWeight: 700, color: X.tb }}>{j.tk}</span>
        <span style={{ fontSize: 7, fontFamily: ft, fontWeight: 600, color: j.a === "BUY" ? X.g : X.r }}>{j.a}</span>
        <span style={{ fontSize: 8, fontFamily: ft, color: X.tx }}>{j.ty} {j.st}</span>
        <span style={{ fontSize: 8, fontFamily: ft, color: X.tx }}>${j.en}</span>
        <span style={{ fontSize: 8, fontFamily: ft, color: X.tx }}>{j.cu > 0 ? `${j.cu}` : "—"}</span>
        <span style={{ fontSize: 9, fontFamily: ft, fontWeight: 600, color: j.pnl >= 0 ? X.g : X.r }}>{j.pnl >= 0 ? "+" : ""}{j.pnl}%</span>
        <span style={{ fontSize: 7, fontFamily: ft, padding: "1px 5px", borderRadius: 2, color: j.conv === "PRIMARY" ? X.gd : j.conv === "EXIT" ? X.r : X.a, background: (j.conv === "PRIMARY" ? X.gd : j.conv === "EXIT" ? X.r : X.a) + "15" }}>{j.conv}</span>
        <span style={{ fontSize: 7, fontFamily: ft, color: X.td, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.n}</span>
      </div>)}
    </div>
  </div>;
}

// ═══ TAB: MARKET BREADTH ═══
function MB() {
  const b = BREADTH;
  let es = 0; if (b.spx.stage === 2) es++; if (b.spx.ema20 === "above") es++; if (b.tplCount > 500) es++; if (b.a50 > 55) es++; if (b.a200 > 55) es++; if (b.vix < 20) es++; if (b.sec.filter(s => s.p > 1).length >= 4) es++;
  const ec = es >= 6 ? X.g : es >= 4 ? X.a : X.r;
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <MarketEnv />
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 280px", background: X.c1, border: `1px solid ${X.b1}`, padding: 12 }}>
        <div style={{ fontSize: 9, fontFamily: fu, fontWeight: 600, color: X.tb, marginBottom: 8 }}>Breadth Internals</div>
        {([["Advance/Decline", `${b.ad.a}/${b.ad.d} (${(b.ad.a / b.ad.d).toFixed(2)})`, b.ad.a > b.ad.d], ["New Highs/Lows", `${b.nh.h}/${b.nh.l}`, b.nh.h > b.nh.l], ["% > 50 DMA", `${b.a50}%`, b.a50 > 50], ["% > 200 DMA", `${b.a200}%`, b.a200 > 50]] as [string, string, boolean][]).map(([k, v, ok]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${X.b1}06` }}><span style={{ fontSize: 9, fontFamily: fu, color: X.tx }}>{k}</span><span style={{ fontSize: 11, fontFamily: ft, fontWeight: 600, color: ok ? X.g : X.r }}>{v}</span></div>)}
      </div>
      <div style={{ flex: "1 1 280px", background: X.c1, border: `1px solid ${X.b1}`, padding: 12 }}>
        <div style={{ fontSize: 9, fontFamily: fu, fontWeight: 600, color: X.tb, marginBottom: 8 }}>MKW Position Sizing Guide</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 26, fontFamily: ft, fontWeight: 700, color: ec }}>{es}<span style={{ fontSize: 12, color: X.td }}>/7</span></div>
          <div style={{ fontSize: 11, fontFamily: fu, fontWeight: 700, color: ec }}>{es >= 6 ? "FULL SIZE" : es >= 4 ? "STANDARD" : es >= 2 ? "HALF SIZE" : "CASH"}</div>
        </div>
        <div style={{ background: X.bg, height: 4, borderRadius: 2, marginBottom: 8 }}><div style={{ width: `${(es / 7) * 100}%`, height: "100%", background: ec, borderRadius: 2 }} /></div>
        {([["S&P Stage 2", b.spx.stage === 2], ["Kell Green Light", b.spx.ema20 === "above"], [">500 TPL qualifiers", b.tplCount > 500], [">55% > 50d", b.a50 > 55], [">55% > 200d", b.a200 > 55], ["VIX < 20", b.vix < 20], ["≥4 hot sectors", b.sec.filter(s => s.p > 1).length >= 4]] as [string, boolean][]).map(([l, p]) => <div key={l} style={{ display: "flex", gap: 4, fontSize: 8, fontFamily: ft, marginBottom: 1 }}><span style={{ color: p ? X.g : X.r }}>{p ? "✓" : "✗"}</span><span style={{ color: X.td }}>{l}</span></div>)}
      </div>
    </div>
    <div style={{ background: X.c1, border: `1px solid ${X.b1}`, padding: 12 }}>
      <div style={{ fontSize: 9, fontFamily: fu, fontWeight: 600, color: X.tb, marginBottom: 6 }}>Sector Heatmap</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 4 }}>
        {[...b.sec].sort((a, c) => c.p - a.p).map(s => { const c = s.p > .5 ? X.g : s.p > -.5 ? X.td : X.r; const bg = s.p > 0 ? `rgba(0,230,118,${Math.min(1, Math.abs(s.p) / 4) * .25})` : `rgba(255,61,87,${Math.min(1, Math.abs(s.p) / 4) * .25})`; return <div key={s.n} style={{ background: bg, padding: "9px 10px", textAlign: "center" }}><div style={{ fontSize: 7, fontFamily: fu, color: X.td, marginBottom: 2 }}>{s.n}</div><div style={{ fontSize: 14, fontFamily: ft, fontWeight: 700, color: c }}>{s.p > 0 ? "+" : ""}{s.p}%</div></div>; })}
      </div>
    </div>
  </div>;
}

const TABS = [{ id: "dash", l: "DASHBOARD" }, { id: "wl", l: "WATCHLIST" }, { id: "ai", l: "AI ANALYSIS" }, { id: "mb", l: "MARKET BREADTH" }, { id: "ri", l: "DIVERGENCE / EXIT" }, { id: "jn", l: "JOURNAL" }];

export default function App() {
  const [tab, setTab] = useState("dash");
  const [time, setTime] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 60000); return () => clearInterval(i); }, []);
  const convCount = STOCKS.filter(s => s.conv.zone === "CONVERGENCE").length;
  return <div style={{ fontFamily: ft, background: X.bg, color: X.tx, minHeight: "100vh" }}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${X.bg}}::-webkit-scrollbar-thumb{background:${X.b2};border-radius:2px}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 14px", borderBottom: `1px solid ${X.b1}`, background: X.c1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: fu, fontSize: 13, fontWeight: 800, color: X.tb }}><span style={{ color: X.gd }}>MKW</span> Command Center</span>
        <span style={{ fontSize: 7, fontFamily: ft, padding: "1px 6px", borderRadius: 2, background: convCount > 0 ? X.gd + "15" : X.a + "15", color: convCount > 0 ? X.gd : X.a, border: `1px solid ${convCount > 0 ? X.gd : X.a}30`, animation: "pulse 2s infinite" }}>⚡ {convCount} CONVERGENCE</span>
      </div>
      <span style={{ fontSize: 8, fontFamily: ft, color: X.td }}>{time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
    </div>
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${X.b1}`, overflowX: "auto" }}>
      {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", fontSize: 8, fontFamily: ft, letterSpacing: 1, background: tab === t.id ? X.bg : "transparent", color: tab === t.id ? X.tb : X.td, border: "none", borderBottom: tab === t.id ? `2px solid ${X.gd}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", textTransform: "uppercase" }}>{t.l}</button>)}
    </div>
    <div style={{ padding: "12px 14px", overflowY: "auto", maxHeight: "calc(100vh - 72px)", paddingBottom: 30 }}>
      {tab === "dash" && <Dash />}
      {tab === "wl" && <WL stocks={STOCKS} />}
      {tab === "ai" && <AI />}
      {tab === "mb" && <MB />}
      {tab === "ri" && <RI />}
      {tab === "jn" && <JN />}
    </div>
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "3px 14px", background: X.c1, borderTop: `1px solid ${X.b1}`, display: "flex", justifyContent: "space-between", fontSize: 7, fontFamily: ft, color: X.td }}>
      <span>MKW v2.0 · Convergence Engine · Minervini × Kell × Weinstein</span>
      <span><span style={{ color: X.gd }}>⚡</span> {STOCKS.length} names · {convCount} convergence · {THREATS.length} divergence alerts</span>
    </div>
  </div>;
}
