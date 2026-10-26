// Vercel Serverless Function: GET /api/tasa
async function fuentePrincipal() {
    const r = await fetch('https://bcv.justcarlux.dev/api/v1/rates');
    if (!r.ok) throw new Error('dolarapi ' + r.status);
    const d = await r.json();
    const tasa = parseFloat(d.rate.usd);
    if (!(tasa > 0)) throw new Error('tasa inválida');
    return { tasa, fechaFuente: d.fechaActualizacion || null, fuente: 'dolarapi (respaldo)' };
}

async function fuenteRespaldo() {
    const r = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv');
    if (!r.ok) throw new Error('pydolarve ' + r.status);
    const d = await r.json();
    const usd = d?.monitors?.usd ?? d?.monedas?.usd;
    const tasa = parseFloat(usd?.price ?? usd?.promedio);
    if (!(tasa > 0)) throw new Error('tasa inválida');
    return { tasa, fechaFuente: usd?.last_update ?? usd?.fecha ?? null, fuente: 'pydolarve' };
}

module.exports = async (req, res) => {
    const resultados = await Promise.allSettled([fuentePrincipal(), fuenteRespaldo()]);
    const validos = resultados.filter(r => r.status === 'fulfilled').map(r => r.value);

    if (validos.length === 0) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(502).json({ error: 'No se pudo obtener la tasa' });
    }

    const ms = (v) => {
        const t = v.fechaFuente ? new Date(v.fechaFuente).getTime() : NaN;
        return isNaN(t) ? 0 : t;
    };
    validos.sort((a, b) => ms(b) - ms(a)); // la más reciente primero

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json(validos[0]);
};