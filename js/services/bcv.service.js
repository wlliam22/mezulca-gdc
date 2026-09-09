// src/services/bcv.service.js

let tasaCache = null;
let ultimaConsulta = null;

export async function obtenerTasaBCV() {
    // Reutilizar caché si se consultó hace menos de 10 minutos
    if (tasaCache && ultimaConsulta && (Date.now() - ultimaConsulta < 600000)) {
        return tasaCache;
    }

    try {
        const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (!res.ok) throw new Error('Error al conectar con API BCV');
        
        const data = await res.json();
        const tasa = parseFloat(data.promedio || data.monto);
        
        if (tasa && !isNaN(tasa)) {
            tasaCache = tasa;
            ultimaConsulta = Date.now();
            return tasa;
        }
        throw new Error('Formato de tasa inválido');
    } catch (error) {
        console.warn('⚠️ No se pudo obtener la tasa BCV en vivo, intentando fallback...', error);
        
        // Fallback a API secundaria
        try {
            const resBackup = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv');
            const dataBackup = await resBackup.json();
            const tasaBackup = parseFloat(dataBackup?.monedas?.usd?.promedio);
            
            if (tasaBackup && !isNaN(tasaBackup)) {
                tasaCache = tasaBackup;
                ultimaConsulta = Date.now();
                return tasaBackup;
            }
        } catch (e) {
            console.error('❌ Error en API fallback:', e);
        }

        return tasaCache || 0; // Retorna caché previa o 0 para cálculo manual
    }
}