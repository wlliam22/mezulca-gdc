import { db } from '../config/firebase-config.js';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    runTransaction,
    serverTimestamp
} from 'firebase/firestore';
import { round2 } from '../utils/currencyUtils.js';
import { getHoy } from '../utils/dateUtils.js';

/**
 * Registra un abono. El monto SIEMPRE se aplica en USD.
 * Si el pago fue en Bs, se guarda además montoBs y la tasa usada (ya convertido a USD).
 */
export async function registrarAbono({ cotizacionId, clienteId, monto, montoBs = 0, tasaBCV = 0, metodo, fecha }) {
    const montoUSD = round2(monto);
    if (!(montoUSD > 0)) throw new Error('El monto debe ser mayor a cero');

    return await runTransaction(db, async (transaction) => {
        const cotRef = doc(db, 'cotizaciones', cotizacionId);
        const cotSnap = await transaction.get(cotRef);

        if (!cotSnap.exists() || cotSnap.data().activo === false) {
            throw new Error('Cotización no encontrada');
        }

        const cot = cotSnap.data();
        const deuda = round2(cot.montoDeudaUSD);
        const pagado = round2(cot.montoPagadoUSD);
        const saldo = round2(deuda - pagado);

        if (montoUSD > saldo + 0.01) {
            throw new Error(`El monto ($${montoUSD.toFixed(2)}) excede el saldo pendiente ($${saldo.toFixed(2)})`);
        }

        // Si liquida (con tolerancia de 1 centavo) se cierra exacto
        const liquida = Math.abs(saldo - montoUSD) <= 0.01;
        const montoAplicado = liquida ? saldo : montoUSD;
        const nuevoPagado = liquida ? deuda : round2(pagado + montoUSD);

        const abonoRef = doc(collection(db, 'abonos'));
        transaction.set(abonoRef, {
            cotizacionId,
            clienteId,
            montoUSD: montoAplicado,
            montoBs: round2(montoBs) || 0,
            tasaBCV: Number(tasaBCV) || 0,
            metodoPago: metodo,
            fechaAbono: fecha || getHoy(),   // 'YYYY-MM-DD'
            activo: true,
            createdAt: serverTimestamp()
        });

        transaction.update(cotRef, {
            montoPagadoUSD: nuevoPagado,
            updatedAt: serverTimestamp()
        });

        return {
            success: true,
            abonoId: abonoRef.id,
            nuevoSaldo: Math.max(0, round2(deuda - nuevoPagado))
        };
    });
}

// Anula un abono (eliminación lógica) y revierte el saldo de la cotización
export async function anularAbono(abonoId) {
    return await runTransaction(db, async (transaction) => {
        const abonoRef = doc(db, 'abonos', abonoId);
        const abonoSnap = await transaction.get(abonoRef);

        if (!abonoSnap.exists() || abonoSnap.data().activo === false) {
            throw new Error('El abono no existe o ya fue anulado');
        }

        const abono = abonoSnap.data();
        const monto = round2(abono.montoUSD ?? abono.montoAbonadoUSD ?? 0);

        const cotRef = doc(db, 'cotizaciones', abono.cotizacionId);
        const cotSnap = await transaction.get(cotRef);

        if (cotSnap.exists()) {
            const pagado = round2(cotSnap.data().montoPagadoUSD);
            transaction.update(cotRef, {
                montoPagadoUSD: Math.max(0, round2(pagado - monto)),
                updatedAt: serverTimestamp()
            });
        }

        transaction.update(abonoRef, { activo: false, anuladoAt: serverTimestamp() });
        return { success: true };
    });
}

export async function obtenerAbonosPorCliente(clienteId) {
    try {
        const snapshot = await getDocs(query(
            collection(db, 'abonos'),
            where('clienteId', '==', clienteId)
        ));

        const abonos = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(a => a.activo !== false);

        const clave = (a) => String(a.fechaAbono?.toDate ? a.fechaAbono.toDate().toISOString() : (a.fechaAbono || ''));
        abonos.sort((a, b) => clave(a).localeCompare(clave(b)));
        return abonos;
    } catch (error) {
        console.error("Error al obtener abonos por cliente:", error);
        return [];
    }
}