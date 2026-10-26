import { getHoy } from '../utils/dateUtils.js';

const CLAVE_CACHE = 'bcv_tasa_cache';

function leerCache() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_CACHE) || 'null');
    } catch {
        return null;
    }
}

function guardarCache(tasa) {
    try {
        localStorage.setItem(CLAVE_CACHE, JSON.stringify({ fecha: getHoy(), tasa }));
    } catch { /* sin storage, no pasa nada */ }
}

async function consultarAPI() {
    // API principal
    try {
        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (!res.ok) throw new Error('Respuesta no válida');
        const data = await res.json();
        const tasa = parseFloat(data.promedio ?? data.monto);
        if (tasa > 0) return tasa;
    } catch (error) {
        console.warn('⚠️ API principal BCV no disponible:', error);
    }

    // API de respaldo (mejor esfuerzo)
    try {
        const res = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv');
        const data = await res.json();
        const tasa = parseFloat(
            data?.monitors?.usd?.price ?? data?.monedas?.usd?.promedio
        );
        if (tasa > 0) return tasa;
    } catch (error) {
        console.warn('⚠️ API de respaldo BCV no disponible:', error);
    }
    return 0;
}

/**
 * Devuelve la tasa BCV (Bs por $) del día.
 * Se consulta una vez al día; si no hay conexión usa la última guardada; si no hay ninguna devuelve 0
 * (el usuario puede escribirla a mano en el modal de abono).
 */
export async function obtenerTasaBCV() {
    const cache = leerCache();
    if (cache && cache.fecha === getHoy() && cache.tasa > 0) return cache.tasa;

    const tasa = await consultarAPI();
    if (tasa > 0) {
        guardarCache(tasa);
        return tasa;
    }
    return cache?.tasa || 0;
}