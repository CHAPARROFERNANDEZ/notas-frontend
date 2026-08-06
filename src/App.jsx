import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip,
} from "recharts";
import {
  Plus, ChevronLeft, RefreshCw, AlertTriangle, Loader2, FileText, Scale, LayoutGrid, Check, X, Download, Presentation, Trash2,
} from "lucide-react";
import { listarPropuestas, crearPropuesta, obtenerAnalisis, obtenerInforme, comprobarSalud, descargarPresentacion, borrarPropuesta } from "./api.js";

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
        <XAxis dataKey="x" tick={{ fill: C.textMuted, fontSize: 11, fontFamily: FONT_MONO }}
          tickFormatter={(v) => `obs. ${v}`} axisLine={{ stroke: C.border }} tickLine={false} />
        <YAxis tick={{ fill: C.textMuted, fontSize: 11, fontFamily: FONT_MONO }}
          domain={["dataMin - 0.05", "dataMax + 0.05"]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          axisLine={{ stroke: C.border }} tickLine={false} />
        <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 12 }}
          labelFormatter={(v) => `Observación ${v}`} formatter={(v) => [`${(v * 100).toFixed(1)}%`, "worst-of"]} />
        <ReferenceLine y={barreraPct} stroke={C.coral} strokeDasharray="5 3"
          label={{ value: `Barrera ${(barreraPct * 100).toFixed(0)}%`, fill: C.coral, fontSize: 11, fontFamily: FONT_BODY, position: "insideTopRight" }} />
        <ReferenceLine y={1} stroke={C.textMuted} strokeDasharray="2 2" />
        {trayectorias.map((t, i) => {
          const tocaBarrera = Math.min(...t) <= barreraPct;
          return (
            <Line key={i} dataKey={`t${i}`} stroke={tocaBarrera ? C.coral : C.teal}
              strokeOpacity={0.35} strokeWidth={1.2} dot={false} isAnimationActive={false} />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------- Informe: parser markdown ligero (sin dependencias nuevas) ----------
function parsearMarkdownInforme(md) {
  const lineas = (md || "").split("\n");
  const bloques = [];
  let listaActual = null;
  lineas.forEach((linea) => {
    const t = linea.trim();
    if (t.startsWith("## ")) {
      if (listaActual) { bloques.push(listaActual); listaActual = null; }
      bloques.push({ tipo: "h2", texto: t.slice(3) });
    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      if (!listaActual) listaActual = { tipo: "ul", items: [] };
      listaActual.items.push(t.slice(2));
    } else if (t === "") {
      if (listaActual) { bloques.push(listaActual); listaActual = null; }
    } else {
      if (listaActual) { bloques.push(listaActual); listaActual = null; }
      bloques.push({ tipo: "p", texto: t });
    }
  });
  if (listaActual) bloques.push(listaActual);
  return bloques;
}

function TextoConNegrita({ texto }) {
  const partes = String(texto).split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

function InformeRenderizado({ markdown, colorTexto = C.textSec, colorTitulo = C.text }) {
  const bloques = useMemo(() => parsearMarkdownInforme(markdown), [markdown]);
  return (
    <div>
      {bloques.map((b, i) => {
        if (b.tipo === "h2") {
          return (
            <div key={i} style={{
              fontFamily: FONT_DISPLAY, fontSize: 17, color: colorTitulo, marginTop: i === 0 ? 0 : 20,
              marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6,
            }}>
              <TextoConNegrita texto={b.texto} />
            </div>
          );
        }
        if (b.tipo === "ul") {
          return (
            <ul key={i} style={{ margin: "0 0 10px 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {b.items.map((it, j) => (
                <li key={j} style={{ color: colorTexto, fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.55 }}>
                  <TextoConNegrita texto={it} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ color: colorTexto, fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.6, margin: "0 0 10px 0" }}>
            <TextoConNegrita texto={b.texto} />
          </p>
        );
      })}
    </div>
  );
}

// ---------- New Proposal Form ----------
function NuevaPropuestaForm({ onCreada, onCancelar }) {
  const [form, setForm] = useState({
    banco: "", subyacentes: "", barrera_pct: 60, barrera_capital_pct: "",
    cupon_anual_pct: 9, plazo_anios: 3, frecuencia_observacion: "Trimestral",
    autocall: true, memoria_cupon: true,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => {
    const v = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    const tickers = form.subyacentes.split(",").map((t) => t.trim()).filter(Boolean);
    if (tickers.length === 0) { setError("Añade al menos un ticker."); return; }
    setEnviando(true);
    try {
      const body = {
        banco: form.banco || "Sin especificar",
        subyacentes: tickers,
        barrera_pct: Number(form.barrera_pct),
        barrera_capital_pct: form.barrera_capital_pct ? Number(form.barrera_capital_pct) : null,
        cupon_anual_pct: Number(form.cupon_anual_pct),
        plazo_anios: Number(form.plazo_anios),
        frecuencia_observacion: form.frecuencia_observacion,
        autocall: form.autocall,
        memoria_cupon: form.memoria_cupon,
      };
      const creada = await crearPropuesta(body);
      onCreada(creada);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} style={{ ...card, display: "flex", flexDirection: "column", gap: 14, maxWidth: 520 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.text }}>Nueva propuesta</div>

      <div>
        <div style={{ ...label, marginBottom: 4 }}>Banco emisor</div>
        <input style={inputStyle} value={form.banco} onChange={set("banco")} placeholder="ej. BNP Paribas" />
      </div>

      <div>
        <div style={{ ...label, marginBottom: 4 }}>Subyacentes (tickers, separados por coma)</div>
        <input style={inputStyle} value={form.subyacentes} onChange={set("subyacentes")} placeholder="ASML, NVDA, TSM" />
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...label, marginBottom: 4 }}>Barrera cupón (%)</div>
          <input style={inputStyle} type="number" step="0.1" value={form.barrera_pct} onChange={set("barrera_pct")} required />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...label, marginBottom: 4 }}>Barrera capital (%, opcional)</div>
          <input style={inputStyle} type="number" step="0.1" value={form.barrera_capital_pct} onChange={set("barrera_capital_pct")} placeholder="= barrera cupón" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...label, marginBottom: 4 }}>Cupón anual (%)</div>
          <input style={inputStyle} type="number" step="0.1" value={form.cupon_anual_pct} onChange={set("cupon_anual_pct")} required />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...label, marginBottom: 4 }}>Plazo (años)</div>
          <input style={inputStyle} type="number" step="0.5" value={form.plazo_anios} onChange={set("plazo_anios")} required />
        </div>
      </div>

      <div>
        <div style={{ ...label, marginBottom: 4 }}>Frecuencia de observación</div>
        <select style={inputStyle} value={form.frecuencia_observacion} onChange={set("frecuencia_observacion")}>
          <option>Mensual</option>
          <option>Trimestral</option>
          <option>Semestral</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        <label style={{ ...label, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={form.autocall} onChange={set("autocall")} /> Autocall
        </label>
        <label style={{ ...label, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={form.memoria_cupon} onChange={set("memoria_cupon")} /> Memoria de cupón
        </label>
      </div>

      {error && (
        <div style={{ color: C.coral, fontSize: 12, fontFamily: FONT_BODY, display: "flex", gap: 6, alignItems: "center" }}>
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button type="submit" disabled={enviando} style={{
          flex: 1, background: C.gold, color: "#1A1200", border: "none", borderRadius: 8,
          padding: "10px 0", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {enviando ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
          Crear y analizar
        </button>
        <button type="button" onClick={onCancelar} style={{
          background: "transparent", color: C.textSec, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "10px 16px", fontFamily: FONT_BODY, fontSize: 14, cursor: "pointer",
        }}>Cancelar</button>
      </div>
    </form>
  );
}

// ---------- Detail view ----------
function DetalleView({ propuesta, onVolver }) {
  const [analisis, setAnalisis] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [informe, setInforme] = useState(null);
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const [generandoPptx, setGenerandoPptx] = useState(false);

  const cargar = useCallback(async (forzar = false) => {
    setCargando(true);
    setError(null);
    try {
      const a = await obtenerAnalisis(propuesta.id, forzar);
      setAnalisis(a);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCargando(false);
    }
  }, [propuesta.id]);

  useEffect(() => { cargar(false); }, [cargar]);

  const pedirInforme = async () => {
    setGenerandoInforme(true);
    try {
      const r = await obtenerInforme(propuesta.id);
      setInforme(r.informe_markdown);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setGenerandoInforme(false);
    }
  };

  const pedirPresentacion = async () => {
    setGenerandoPptx(true);
    setError(null);
    try {
      const nombre = `CFWealth_${propuesta.subyacentes.join("_")}.pptx`;
      await descargarPresentacion(propuesta.id, nombre);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setGenerandoPptx(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onVolver} style={{
          background: "none", border: "none", color: C.textSec, display: "flex", alignItems: "center",
          gap: 6, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13,
        }}>
          <ChevronLeft size={16} /> Volver
        </button>
        <button onClick={() => cargar(true)} disabled={cargando} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSec,
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: FONT_BODY,
          fontSize: 12, padding: "6px 10px",
        }}>
          <RefreshCw size={13} /> Recalcular
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.text }}>
          {propuesta.subyacentes.join(" / ")}
        </div>
        <div style={{ ...label }}>{propuesta.banco} · {propuesta.plazo_anios} años · {propuesta.frecuencia_observacion}</div>
        {analisis && <VeredictoBadge v={analisis.veredicto} />}
      </div>

      {error && (
        <div style={{ ...card, borderColor: `${C.coral}55`, color: C.coral, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {cargando && !analisis && (
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 10, color: C.textSec, fontFamily: FONT_BODY }}>
          <Loader2 size={16} className="spin" /> Calculando Monte Carlo, correlación y datos de mercado…
        </div>
      )}

      {analisis && (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <MetricCard label="Prob. tocar barrera" value={`${(analisis.monte_carlo.prob_toca_barrera * 100).toFixed(1)}%`}
              color={analisis.monte_carlo.prob_toca_barrera > 0.4 ? C.coral : analisis.monte_carlo.prob_toca_barrera > 0.2 ? C.amber : C.teal} />
            <MetricCard label="Prob. autocall" value={`${(analisis.monte_carlo.prob_autocall * 100).toFixed(1)}%`} color={C.text} />
            <MetricCard label="Cupón anual ofrecido" value={`${propuesta.cupon_anual_pct.toFixed(1)}%`} color={C.gold} />
            <MetricCard label="Cupón esperado (ajustado)" value={`${analisis.monte_carlo.cupon_esperado_pct.toFixed(1)}%`} />
          </div>

          <div style={card}>
            <div style={{ ...label, marginBottom: 10 }}>Trayectorias simuladas (worst-of) · {analisis.monte_carlo.n_simulaciones.toLocaleString("es-ES")} simulaciones</div>
            <FanChart trayectorias={analisis.monte_carlo.trayectorias_muestra} barreraPct={propuesta.barrera_pct / 100} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <div style={card}>
              <div style={{ ...label, marginBottom: 10 }}>Subyacentes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {analisis.subyacentes.map((s) => (
                  <div key={s.ticker} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: `1px solid ${C.border}`, paddingBottom: 8,
                  }}>
                    <div>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.text }}>{s.ticker}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_BODY }}>
                        {s.consenso_analistas || "Sin consenso"} {s.n_analistas ? `· ${s.n_analistas} analistas` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.text }}>${s.precio_actual.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: C.textSec, fontFamily: FONT_MONO }}>
                        barrera ${s.nivel_barrera.toFixed(2)} · {s.distancia_desviaciones.toFixed(2)}σ
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={{ ...label, marginBottom: 10 }}>Correlación entre subyacentes</div>
              {analisis.subyacentes.length > 1 ? (
                <CorrelationHeatmap tickers={analisis.subyacentes.map((s) => s.ticker)} matriz={analisis.correlacion} />
              ) : (
                <div style={{ ...label }}>Solo hay un subyacente, no aplica correlación.</div>
              )}
            </div>
          </div>

          <div style={card}>
            <div style={{ ...label, marginBottom: 10 }}>Razones del veredicto</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {analisis.razones.map((r, i) => (
                <li key={i} style={{ color: C.textSec, fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.5 }}>{r}</li>
              ))}
            </ul>
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: informe ? 12 : 0 }}>
              <div style={{ ...label }}>Informe para socios (Jordi / JEP)</div>
              <div style={{ display: "flex", gap: 8 }}>
                {informe && (
                  <button onClick={() => window.print()} style={{
                    background: "transparent", border: `1px solid ${C.border}`, color: C.textSec, borderRadius: 8,
                    padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Download size={13} /> Descargar PDF
                  </button>
                )}
                <button onClick={pedirPresentacion} disabled={generandoPptx} style={{
                  background: "transparent", border: `1px solid ${C.border}`, color: C.textSec, borderRadius: 8,
                  padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {generandoPptx ? <Loader2 size={13} className="spin" /> : <Presentation size={13} />}
                  Descargar PowerPoint
                </button>
                <button onClick={pedirInforme} disabled={generandoInforme} style={{
                  background: "transparent", border: `1px solid ${C.gold}66`, color: C.gold, borderRadius: 8,
                  padding: "7px 12px", fontFamily: FONT_BODY, fontSize: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {generandoInforme ? <Loader2 size={13} className="spin" /> : <FileText size={13} />}
                  {informe ? "Regenerar informe" : "Generar informe"}
                </button>
              </div>
            </div>

            {informe && (
              <div id="informe-imprimible" style={{ maxHeight: 600, overflowY: "auto", paddingRight: 6 }}>
                {/* Encabezado -- solo relevante visualmente al imprimir, pero no estorba en pantalla */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.text, marginBottom: 4 }}>
                    CF Wealth · Informe pre-inversión
                  </div>
                  <div style={{ ...label, marginBottom: 10 }}>
                    {propuesta.subyacentes.join(" / ")} · {propuesta.banco} · {propuesta.plazo_anios} años ·{" "}
                    {propuesta.frecuencia_observacion} · generado {new Date().toLocaleDateString("es-ES")}
                  </div>
                  <VeredictoBadge v={analisis.veredicto} />
                </div>

                {/* Métricas clave, repetidas aquí para que el PDF sea autocontenido */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                  <MetricCard label="Prob. tocar barrera" value={`${(analisis.monte_carlo.prob_toca_barrera * 100).toFixed(1)}%`}
                    color={analisis.monte_carlo.prob_toca_barrera > 0.4 ? C.coral : analisis.monte_carlo.prob_toca_barrera > 0.2 ? C.amber : C.teal} />
                  <MetricCard label="Prob. autocall" value={`${(analisis.monte_carlo.prob_autocall * 100).toFixed(1)}%`} color={C.text} />
                  <MetricCard label="Cupón nominal" value={`${propuesta.cupon_anual_pct.toFixed(1)}%`} color={C.gold} />
                  <MetricCard label="Cupón realmente esperado" value={`${analisis.monte_carlo.cupon_esperado_anualizado_pct.toFixed(1)}%`} />
                </div>

                {/* Gráfico de trayectorias, incluido para que el informe sea visual, no solo texto */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...label, marginBottom: 8 }}>Trayectorias simuladas (worst-of)</div>
                  <FanChart trayectorias={analisis.monte_carlo.trayectorias_muestra} barreraPct={propuesta.barrera_pct / 100} />
                </div>

                {analisis.subyacentes.length > 1 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ ...label, marginBottom: 8 }}>Correlación entre subyacentes</div>
                    <CorrelationHeatmap tickers={analisis.subyacentes.map((s) => s.ticker)} matriz={analisis.correlacion} />
                  </div>
                )}

                {/* Texto redactado por la IA, ya formateado en vez de texto plano */}
                <InformeRenderizado markdown={informe} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Comparator ----------
function ComparadorView({ propuestas, onVolver }) {
  const [seleccion, setSeleccion] = useState([]);
  const [analisisPorId, setAnalisisPorId] = useState({});
  const [cargando, setCargando] = useState(false);

  const toggle = (id) => {
    setSeleccion((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s);
  };

  useEffect(() => {
    let activo = true;
    (async () => {
      const faltantes = seleccion.filter((id) => !analisisPorId[id]);
      if (faltantes.length === 0) return;
      setCargando(true);
      const resultados = await Promise.all(faltantes.map((id) => obtenerAnalisis(id).catch(() => null)));
      if (!activo) return;
      setAnalisisPorId((prev) => {
        const next = { ...prev };
        faltantes.forEach((id, i) => { next[id] = resultados[i]; });
        return next;
      });
      setCargando(false);
    })();
    return () => { activo = false; };
  }, [seleccion]); // eslint-disable-line react-hooks/exhaustive-deps

  const seleccionadas = seleccion.map((id) => propuestas.find((p) => p.id === id)).filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={onVolver} style={{
        background: "none", border: "none", color: C.textSec, display: "flex", alignItems: "center",
        gap: 6, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, alignSelf: "flex-start",
      }}>
        <ChevronLeft size={16} /> Volver
      </button>

      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.text }}>Comparador</div>
      <div style={{ ...label }}>Elige hasta 3 propuestas para comparar lado a lado.</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {propuestas.map((p) => {
          const activa = seleccion.includes(p.id);
          return (
            <button key={p.id} onClick={() => toggle(p.id)} style={{
              background: activa ? `${C.gold}22` : C.card, border: `1px solid ${activa ? C.gold : C.border}`,
              color: activa ? C.gold : C.textSec, borderRadius: 8, padding: "8px 12px",
              fontFamily: FONT_BODY, fontSize: 12, cursor: "pointer",
            }}>
              {p.subyacentes.join("/")}
            </button>
          );
        })}
      </div>

      {cargando && (
        <div style={{ color: C.textSec, display: "flex", gap: 8, alignItems: "center", fontFamily: FONT_BODY, fontSize: 13 }}>
          <Loader2 size={15} className="spin" /> Analizando propuestas seleccionadas…
        </div>
      )}

      {seleccionadas.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${seleccionadas.length}, 1fr)`, gap: 14 }}>
          {seleccionadas.map((p) => {
            const a = analisisPorId[p.id];
            return (
              <div key={p.id} style={card}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: C.text, marginBottom: 4 }}>
                  {p.subyacentes.join(" / ")}
                </div>
                <div style={{ ...label, marginBottom: 12 }}>{p.banco}</div>
                {a ? (
                  <>
                    <div style={{ marginBottom: 10 }}><VeredictoBadge v={a.veredicto} /></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT_BODY, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: C.textSec }}>Prob. barrera</span>
                        <span style={{ fontFamily: FONT_MONO, color: a.monte_carlo.prob_toca_barrera > 0.4 ? C.coral : C.text }}>
                          {(a.monte_carlo.prob_toca_barrera * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: C.textSec }}>Prob. autocall</span>
                        <span style={{ fontFamily: FONT_MONO, color: C.text }}>{(a.monte_carlo.prob_autocall * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: C.textSec }}>Cupón anual</span>
                        <span style={{ fontFamily: FONT_MONO, color: C.gold }}>{p.cupon_anual_pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: C.textSec }}>Plazo</span>
                        <span style={{ fontFamily: FONT_MONO, color: C.text }}>{p.plazo_anios} años</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ ...label }}>Sin datos aún.</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ propuestas, cargando, onSeleccionar, onNueva, onComparar, onEliminar, error }) {
  const [borrandoId, setBorrandoId] = useState(null);

  const manejarBorrar = async (e, p) => {
    e.stopPropagation();
    const confirmado = window.confirm(
      `¿Borrar la propuesta ${p.subyacentes.join(" / ")}? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;
    setBorrandoId(p.id);
    try {
      await borrarPropuesta(p.id);
      onEliminar();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setBorrandoId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.text }}>Propuestas</div>
          <div style={{ ...label }}>Análisis pre-inversión de notas estructuradas</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onComparar} disabled={propuestas.length < 2} style={{
            background: "transparent", border: `1px solid ${C.border}`, color: C.textSec, borderRadius: 8,
            padding: "9px 14px", fontFamily: FONT_BODY, fontSize: 13, cursor: propuestas.length < 2 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 7, opacity: propuestas.length < 2 ? 0.5 : 1,
          }}>
            <Scale size={14} /> Comparador
          </button>
          <button onClick={onNueva} style={{
            background: C.gold, border: "none", color: "#1A1200", borderRadius: 8, fontWeight: 600,
            padding: "9px 16px", fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <Plus size={15} /> Nueva propuesta
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...card, borderColor: `${C.coral}55`, color: C.coral, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {cargando && (
        <div style={{ color: C.textSec, display: "flex", gap: 8, alignItems: "center", fontFamily: FONT_BODY, fontSize: 13 }}>
          <Loader2 size={15} className="spin" /> Cargando propuestas…
        </div>
      )}

      {!cargando && propuestas.length === 0 && !error && (
        <div style={{ ...card, textAlign: "center", padding: 40, color: C.textSec, fontFamily: FONT_BODY }}>
          <LayoutGrid size={28} color={C.textMuted} style={{ marginBottom: 10 }} />
          <div>Todavía no hay propuestas. Crea la primera para empezar a analizar.</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {propuestas.map((p) => (
          <div key={p.id} onClick={() => onSeleccionar(p)} style={{
            ...card, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8,
            position: "relative",
          }}>
            <button
              onClick={(e) => manejarBorrar(e, p)}
              disabled={borrandoId === p.id}
              title="Borrar propuesta"
              style={{
                position: "absolute", top: 10, right: 10, background: "transparent", border: "none",
                color: C.textMuted, cursor: "pointer", padding: 4, borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {borrandoId === p.id ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
            </button>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: C.text, paddingRight: 20 }}>{p.subyacentes.join(" / ")}</div>
            <div style={{ ...label }}>{p.banco} · {p.plazo_anios} años</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontFamily: FONT_MONO, fontSize: 12, color: C.textSec }}>
              <span>Barrera {p.barrera_pct}%</span>
              <span style={{ color: C.gold }}>Cupón {p.cupon_anual_pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [vista, setVista] = useState("dashboard"); // dashboard | nueva | detalle | comparador
  const [propuestas, setPropuestas] = useState([]);
  const [propuestaActiva, setPropuestaActiva] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [backendOk, setBackendOk] = useState(null);

  const cargarPropuestas = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const p = await listarPropuestas();
      setPropuestas(p);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    comprobarSalud().then(() => setBackendOk(true)).catch(() => setBackendOk(false));
    cargarPropuestas();
  }, [cargarPropuestas]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT_BODY }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        input:focus, select:focus { border-color: ${C.gold} !important; }
        button { transition: opacity .15s ease, border-color .15s ease; }
        button:hover:not(:disabled) { opacity: 0.92; }

        @media print {
          body * { visibility: hidden; }
          #informe-imprimible, #informe-imprimible * { visibility: visible; }
          #informe-imprimible {
            position: absolute; left: 0; top: 0; width: 100%;
            max-height: none !important; overflow: visible !important;
            background: #fff; padding: 24px;
          }
          #informe-imprimible, #informe-imprimible * {
            color: #111 !important; background: transparent !important;
          }
        }
      `}</style>

      <div style={{ borderBottom: `0.5px solid ${C.border}`, padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: C.gold, letterSpacing: 0.3 }}>CF Wealth</span>
          <span style={{ ...label }}>Motor de análisis pre-inversión</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: FONT_MONO, color: backendOk ? C.teal : backendOk === false ? C.coral : C.textMuted }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: backendOk ? C.teal : backendOk === false ? C.coral : C.textMuted }} />
          {backendOk === null ? "conectando…" : backendOk ? "backend activo" : "backend sin respuesta"}
        </div>
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
        {vista === "dashboard" && (
          <Dashboard
            propuestas={propuestas} cargando={cargando} error={error}
            onSeleccionar={(p) => { setPropuestaActiva(p); setVista("detalle"); }}
            onNueva={() => setVista("nueva")}
            onComparar={() => setVista("comparador")}
            onEliminar={() => cargarPropuestas()}
          />
        )}
        {vista === "nueva" && (
          <NuevaPropuestaForm
            onCreada={(p) => { cargarPropuestas(); setPropuestaActiva(p); setVista("detalle"); }}
            onCancelar={() => setVista("dashboard")}
          />
        )}
        {vista === "detalle" && propuestaActiva && (
          <DetalleView propuesta={propuestaActiva} onVolver={() => setVista("dashboard")} />
        )}
        {vista === "comparador" && (
          <ComparadorView propuestas={propuestas} onVolver={() => setVista("dashboard")} />
        )}
      </div>
    </div>
  );
}
