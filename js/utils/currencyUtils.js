const formato = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

export function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// $ 1.311,54
export function formatUSD(monto) {
    const n = Number(monto);
    if (!isFinite(n)) return '$ 0,00';
    return `$ ${formato.format(n)}`;
}

// Bs 113.702,14
export function formatBs(monto) {
    const n = Number(monto);
    if (!isFinite(n)) return 'Bs 0,00';
    return `Bs ${formato.format(n)}`;
}