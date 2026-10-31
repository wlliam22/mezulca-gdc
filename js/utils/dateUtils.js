const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const pad = (n) => String(n).padStart(2, '0');

/**
 * Convierte cualquier valor de fecha a Date en HORA LOCAL.
 * Acepta: Timestamp de Firestore, Date, 'YYYY-MM-DD' (se interpreta local, no UTC) o ISO string.
 */
export function aFecha(valor) {
    if (!valor) return null;
    if (typeof valor.toDate === 'function') return valor.toDate(); // Timestamp Firestore
    if (valor instanceof Date) return new Date(valor.getTime());
    
    // Si es un string
    if (typeof valor === 'string') {
        // Si es formato ISO completo (ej: 2025-04-07T00:00:00.000Z), extraemos solo YYYY-MM-DD
        if (valor.includes('T')) {
            const soloFecha = valor.split('T')[0];
            const [y, m, d] = soloFecha.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        // Si ya es YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
            const [y, m, d] = valor.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
    }
    
    const d = new Date(valor);
    return isNaN(d.getTime()) ? null : d;
}

// Date -> 'YYYY-MM-DD' en hora local
export function aISODia(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getHoy() {
    return aISODia(new Date());
}

// Mes actual 'YYYY-MM'
export function getMesActual() {
    return getHoy().slice(0, 7);
}

// 'YYYY-MM-DD' + N días -> 'YYYY-MM-DD'
export function sumarDias(fechaStr, dias) {
    const d = aFecha(fechaStr);
    d.setDate(d.getDate() + dias);
    return aISODia(d);
}

// 8-abr
export function formatFechaCorta(valor) {
    const d = aFecha(valor);
    if (!d) return '-';
    return `${d.getDate()}-${MESES_CORTOS[d.getMonth()]}`;
}

// YYYY-MM-DD
export function formatFechaCompleta(valor) {
    const d = aFecha(valor);
    return d ? aISODia(d) : '-';
}

// Días transcurridos desde el vencimiento (0 si no ha vencido)
export function calcularDiasVencidos(fechaVencimiento) {
    const venc = aFecha(fechaVencimiento);
    if (!venc) return 0;
    venc.setHours(0, 0, 0, 0);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.round((hoy - venc) / 86400000);
    return dias > 0 ? dias : 0;
}

// '2026-04' -> 'Abril 2026'
export function getNombreMes(mes) {
    const [year, month] = (mes || '').split('-');
    if (!year || !month) return mes || '';
    return `${MESES[parseInt(month, 10) - 1]} ${year}`;
}