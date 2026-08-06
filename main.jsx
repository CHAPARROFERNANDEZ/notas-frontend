// Apunta al backend real en Railway. Se puede sobreescribir con la variable
// de entorno VITE_API_BASE en Vercel si algún día cambia la URL.
export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://notas-production-a2e8.up.railway.app";

async function manejarRespuesta(r, contexto) {
  if (!r.ok) {
    const texto = await r.text().catch(() => "");
    throw new Error(`${contexto} (HTTP ${r.status}) ${texto.slice(0, 300)}`);
  }
  return r.json();
}

export async function listarPropuestas() {
  const r = await fetch(`${API_BASE}/propuestas`);
  return manejarRespuesta(r, "Error listando propuestas");
}

export async function crearPropuesta(body) {
  const r = await fetch(`${API_BASE}/propuestas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return manejarRespuesta(r, "Error creando propuesta");
}

export async function obtenerAnalisis(id, forzarRecalculo = false) {
  const qs = forzarRecalculo ? "?forzar_recalculo=true" : "";
  const r = await fetch(`${API_BASE}/propuestas/${id}/analisis${qs}`);
  return manejarRespuesta(r, "Error obteniendo análisis");
}

export async function obtenerInforme(id) {
  const r = await fetch(`${API_BASE}/propuestas/${id}/informe`);
  return manejarRespuesta(r, "Error generando informe");
}

export async function comprobarSalud() {
  const r = await fetch(`${API_BASE}/health`);
  return manejarRespuesta(r, "Backend no responde");
}
