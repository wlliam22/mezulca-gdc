// Formatear a USD
export function formatUSD(monto) {
    if (monto === undefined || monto === null || isNaN(monto)) return '$ 0,00';
    return `$ ${monto.toFixed(2).replace('.', ',')}`;
}

// Formatear a Bs
export function formatBs(monto) {
    if (monto === undefined || monto === null || isNaN(monto) || monto === 0) return 'Bs 0,00';
    return `Bs ${monto.toFixed(2).replace('.', ',')}`;
}