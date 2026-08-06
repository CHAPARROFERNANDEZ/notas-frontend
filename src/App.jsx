import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip,
} from "recharts";
import {
  Plus, ChevronLeft, RefreshCw, AlertTriangle, Loader2, FileText, Scale, LayoutGrid, Check, X,
} from "lucide-react";
import { listarPropuestas, crearPropuesta, obtenerAnalisis, obtenerInforme, comprobarSalud } from "./api.js";

// ---------- design tokens (heredados del prototipo aprobado) ----------
const C = {
  bg: "#0B0F14", panel: "#12181F", card: "#161D26", cardHover: "#1A222C",
  border: "#232B35", borderStrong: "#333E4B",
  text: "#EDEEF0", textSec: "#9AA4B1", textMuted: "#5B6572",
  gold: "#C9A227", goldDim: "#8A711E",
  teal: "#3FA796", amber: "#D89A3E", coral: "#E2725B",
};
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const VEREDICTO_LABEL = { favorable: "Favorable", riesgo: "Riesgo elevado", descartar: "Descartar" };
const VEREDICTO_COLOR = { favorable: C.teal, riesgo: C.amber, descartar: C.coral };

const card = { background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" };
const label = { fontSize: 12, color: C.textSec, fontFamily: FONT_BODY, letterSpacing: 0.2 };
const inputStyle = {
  width: "100%", background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "9px 10px", color: C.text, fontFamily: FONT_BODY, fontSize: 14, outline: "none",
};

function MetricCard({ label: l, value, color }) {
  return (
    <div style={{ ...card, flex: 1 }}>
      <div style={{ ...label, marginBottom: 6 }}>{l}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: color || C.text, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function VeredictoBadge({ v }) {
  const color = VEREDICTO_COLOR[v] || C.textSec;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999,
      background: `${color}22`, color, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600,
      border: `1px solid ${color}55`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      {VEREDICTO_LABEL[v] || v}
    </span>
  );
}

function CorrelationHeatmap({ tickers, matriz }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `80px repeat(${tickers.length}, 1fr)`, gap: 3 }}>
      <div />
      {tickers.map((t) => (
        <div key={`h-${t}`} style={{ ...label, textAlign: "center", fontFamily: FONT_MONO, fontSize: 11 }}>{t}</div>
      ))}
      {matriz.map((fila, i) => (
        <React.Fragment key={`r-${i}`}>
          <div style={{ ...label, fontFamily: FONT_MONO, fontSize: 11, display: "flex", alignItems: "center" }}>{tickers[i]}</div>
          {fila.map((v, j) => {
            const intensidad = Math.abs(v);
            const bg = i === j ? C.borderStrong : `rgba(63,167,150,${0.12 + intensidad * 0.55})`;
            return (
              <div key={`c-${i}-${j}`} style={{
                background: bg, borderRadius: 4, padding: "8px 0", textAlign: "center",
                fontFamily: FONT_MONO, fontSize: 11, color: C.text,
              }}>{v.toFixed(2)}</div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function FanChart({ trayectorias, barreraPct }) {
  const data = useMemo(() => {
    if (!trayectorias || trayectorias.length === 0) return [];
    const nPuntos = trayectorias[0].length;
    return Array.from({ length: nPuntos }, (_, idx) => {
      const row = { x: idx };
      trayectorias.forEach((t, i) => { row[`t${i}`] = t[idx]; });
      return row;
    });
  }, [trayectorias]);

  if (data.length === 0) {
    return <div style={{ ...label, padding: 24, textAlign: "center" }}>Sin trayectorias para graficar.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="x" tick={{ fill: C.textMuted, fontSize: 11,
