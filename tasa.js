// Vercel Serverless Function: GET /api/tasa
const https = require('https');

function getHTML(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            rejectUnauthorized: false, // el BCV suele tener la cadena SSL incompleta
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
        }, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error('bcv ' + res.statusCode));
            }
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (c) => (body += c));
            res.on('end', () => resolve(body));
        });
        req.on('timeout', () => req.destroy(new Error('timeout')));
        req.on('error', reject);
    });
}

// Fuente principal: página oficial del BCV
async function desdeBCV() {
    const html = await getHTML('https://www.bcv.org.ve/');

    const bloque = html.match(/id="dolar"[\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/i);
    if (!bloque) throw new Error('No se encontró la tasa en la página del BCV');
    const tasa = parseFloat(bloque[1].replace(/\./g, '').replace(',', '.'));
    if (!(tasa > 0)) throw new Error('tasa inválida');

    const fecha = html.match(/Fecha\s*Valor[\s\S]*?content="(\d{4}-\d{2}-\d{2})/i);
    const fechaFuente = fecha ? `${fecha[1]}T00:00:00-04:00` : null;

    return { tasa, fechaFuente, fuente: 'bcv.org.ve' };
}

// Respaldo: API agregadora
async function desdeDolarApi() {
    const r = await fetch('https://bcv.justcarlux.dev/api/v1/rates');
    if (!r.ok) throw new Error('dolarapi ' + r.status);
    const d = await r.json();
    const tasa = parseFloat(d.rate.usd);
    if (!(tasa > 0)) throw new Error('tasa inválida');
    return { tasa, fechaFuente: d.fechaActualizacion || null, fuente: 'dolarapi (respaldo)' };
}

module.exports = async (req, res) => {
    for (const fuente of [desdeBCV, desdeDolarApi]) {
        try {
            const data = await fuente();
            res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
            return res.status(200).json(data);
        } catch (error) {
            console.warn(`${fuente.name} falló:`, error.message);
        }
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'No se pudo obtener la tasa' });
};