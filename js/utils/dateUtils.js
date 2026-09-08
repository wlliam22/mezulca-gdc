// Formatear fecha a DD-MMM (ej: 8-abr)
export function formatFechaCorta(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()}-${meses[date.getMonth()]}`;
}

// Formatear fecha a YYYY-MM-DD
export function formatFechaCompleta(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toISOString().split('T')[0];
}

// Calcular días vencidos
export function calcularDiasVencidos(fechaVencimiento) {
    if (!fechaVencimiento) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = fechaVencimiento.toDate ? fechaVencimiento.toDate() : new Date(fechaVencimiento);
    venc.setHours(0, 0, 0, 0);
    const diffTime = hoy - venc;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

// Obtener mes actual en formato YYYY-MM
export function getMesActual() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Calcular fecha de vencimiento
export function calcularFechaVencimiento(fechaEmision, diasCredito) {
    const date = fechaEmision.toDate ? fechaEmision.toDate() : new Date(fechaEmision);
    date.setDate(date.getDate() + diasCredito);
    return date;
}

// Obtener nombre del mes en español
export function getNombreMes(mes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [year, month] = mes.split('-');
    return `${meses[parseInt(month) - 1]} ${year}`;
}