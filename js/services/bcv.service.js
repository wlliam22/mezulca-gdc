import { aISODia } from '../utils/dateUtils.js';

const CLAVE_CACHE = 'bcv_tasa_cache_v3';
// La tasa se renueva a las 7:00 am y a las 4:00 pm (cuando el BCV publica la del día siguiente)
const CORTES = [7, 16];

function cicloActual() {
    const ahora = new Date();
    const h = ahora.getHours();
    const corte = [...CORTES].reverse().find(c => h >= c);
    if (corte === undefined) {
        ahora.setDate(ahora.getDate() - 1);
        return `${aISODia(ahora)}-${CORTES[CORTES.length - 1]}`;
    }
    return `${aISODia(ahora)}-${corte}`;
}

function leerCache() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_CACHE) || 'null');
    } catch {
        return null;
    }
}

function guardarCache(info) {
    try {
        localStorage.setItem(CLAVE_CACHE, JSON.stringify({ ...info, ciclo: cicloActual() }));
    } catch { /* sin storage, no pasa nada */ }
}

/* ------------------------- Fuentes de la tasa ------------------------- */
// 1) Producción (Vercel): nuestra propia función, sin CORS
async function desdeNuestroServidor() {
    const res = await fetch('/api/tasa', { cache: 'no-store' });
    const tipo = res.headers.get('content-type') || '';
    if (!res.ok || !tipo.includes('application/json')) throw new Error('/api/tasa no disponible');
    const data = await res.json();
    if (!(data.tasa > 0)) throw new Error('Tasa inválida');
    return data;
}

// 2) Local (Live Server no tiene /api): consulta directa a dolarapi
async function desdeJustCarlux() {
    const res = await fetch('https://bcv.justcarlux.dev/api/v1/rates', { cache: 'no-store' });
    if (!res.ok) throw new Error('Respuesta no válida');
    const data = await res.json();
    const tasa = parseFloat(data?.rates?.usd);
    if (!(tasa > 0)) throw new Error('Tasa inválida');
    return {
        tasa,
        fechaFuente: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
        fuente: 'bcv.justcarlux.dev'
    };
}

// 3) Respaldo: dolarapi
async function desdeDolarApi() {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { cache: 'no-store' });
    if (!res.ok) throw new Error('Respuesta no válida');
    const data = await res.json();
    const tasa = parseFloat(data.promedio ?? data.venta ?? data.monto);
    if (!(tasa > 0)) throw new Error('Tasa inválida');
    return { tasa, fechaFuente: data.fechaActualizacion || null, fuente: 'dolarapi (respaldo)' };
}

/**
 * Devuelve { tasa, fechaFuente, consultadoAt, fuente, ok }.
 * - Sin `force`: usa el caché mientras sea del ciclo actual (cortes 7am y 4pm).
 * - Con `force`: consulta de nuevo ya (botón de actualizar).
 * - Si la consulta falla, devuelve la última tasa guardada con ok:false.
 */
export async function obtenerInfoTasaBCV({ force = false } = {}) {
    const cache = leerCache();

    if (!force && cache && cache.ciclo === cicloActual() && cache.tasa > 0) {
        return { ...cache, ok: true };
    }

    const nueva = await consultarAPIs();
    if (nueva) {
        const info = { ...nueva, consultadoAt: new Date().toISOString() };
        guardarCache(info);
        return { ...info, ok: true };
    }

    if (cache?.tasa > 0) return { ...cache, ok: false };
    return { tasa: 0, fechaFuente: null, consultadoAt: null, fuente: null, ok: false };
}

// Solo el número (lo usan cotizaciones y abonos)
export async function obtenerTasaBCV() {
    const info = await obtenerInfoTasaBCV();
    return info.tasa || 0;
}