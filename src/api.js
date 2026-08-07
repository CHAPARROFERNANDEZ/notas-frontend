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

export async function descargarPresentacion(id, nombreSugerido = "informe.pptx") {
  const r = await fetch(`${API_BASE}/propuestas/${id}/presentacion`);
  if (!r.ok) {
    const texto = await r.text().catch(() => "");
    throw new Error(`Error generando la presentación (HTTP ${r.status}) ${texto.slice(0, 300)}`);
  }
  const blob = await r.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreSugerido;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function comprobarSalud() {
  const r = await fetch(`${API_BASE}/health`);
  return manejarRespuesta(r, "Backend no responde");
}

export async function borrarPropuesta(id) {
  const r = await fetch(`${API_BASE}/propuestas/${id}`, { method: "DELETE" });
  return manejarRespuesta(r, "Error borrando la propuesta");
}

export async function obtenerCotizacion(ticker, forzar = false) {
  const qs = forzar ? "?forzar=true" : "";
  const r = await fetch(`${API_BASE}/mercado/${encodeURIComponent(ticker)}${qs}`);
  if (r.status === 429) {
    const cuerpo = await r.json().catch(() => ({}));
    const segundos = cuerpo?.detail?.segundos_restantes ?? 45;
    const err = new Error(`Espera ${segundos}s antes de refrescar de nuevo.`);
    err.cooldownSegundos = segundos;
    throw err;
  }
  return manejarRespuesta(r, `Error obteniendo cotización de ${ticker}`);
}

export async function listarFavoritos() {
  const r = await fetch(`${API_BASE}/favoritos`);
  return manejarRespuesta(r, "Error listando favoritos");
}

export async function anadirFavorito(ticker) {
  const r = await fetch(`${API_BASE}/favoritos/${encodeURIComponent(ticker)}`, { method: "POST" });
  return manejarRespuesta(r, "Error añadiendo favorito");
}

export async function quitarFavorito(ticker) {
  const r = await fetch(`${API_BASE}/favoritos/${encodeURIComponent(ticker)}`, { method: "DELETE" });
  return manejarRespuesta(r, "Error quitando favorito");
}

export async function buscarNoticias(query) {
  const r = await fetch(`${API_BASE}/noticias?q=${encodeURIComponent(query)}`);
  return manejarRespuesta(r, "Error buscando noticias");
}
