// Vercel Serverless Function: GET /api/tasa
async function desdeJustCarlux() {
    const r = await fetch('https://bcv.justcarlux.dev/api/v1/rates');
    if (!r.ok) throw new Error('justcarlux ' + r.status);
    const d = await r.json();
    const tasa = parseFloat(d?.rates?.usd);
    if (!(tasa > 0)) throw new Error('tasa inválida');
    return {
        tasa,
        fechaFuente: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
        fuente: 'bcv.justcarlux.dev'
    };
}

async function desdeDolarApi() {
    const r = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    if (!r.ok) throw new Error('dolarapi ' + r.status);
    const d = await r.json();
    const tasa = parseFloat(d.promedio);
    if (!(tasa > 0)) throw new Error('tasa inválida');
    return { tasa, fechaFuente: d.fechaActualizacion || null, fuente: 'dolarapi (respaldo)' };
}

module.exports = async (req, res) => {
    const fuentes = [
        { nombre: 'justcarlux', consultar: desdeJustCarlux },
        { nombre: 'dolarapi', consultar: desdeDolarApi }
    ];

    for (const fuente of fuentes) {
        try {
            const data = await fuente.consultar();
            res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
            return res.status(200).json(data);
        } catch (error) {
            console.warn(`${fuente.nombre} falló:`, error.message);
        }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'No se pudo obtener la tasa' });
};