import { db } from '../config/firebase-config.js';
import { 
    collection, 
    doc, 
    runTransaction,
    serverTimestamp
} from 'firebase/firestore';

export async function registrarAbono(data) {
    try {
        return await runTransaction(db, async (transaction) => {
            const cotizacionRef = doc(db, 'cotizaciones', data.cotizacionId);
            const cotizacionSnap = await transaction.get(cotizacionRef);
            
            if (!cotizacionSnap.exists()) {
                throw new Error('Cotización no encontrada');
            }
            
            const cotizacion = cotizacionSnap.data();
            const deudaUSD = Number(cotizacion.montoDeudaUSD) || 0;
            const pagadoUSD = Number(cotizacion.montoPagadoUSD) || 0;
            const saldoActual = deudaUSD - pagadoUSD;
            
            if (data.monto > saldoActual + 0.01) {
                throw new Error(`El monto ($${data.monto.toFixed(2)}) excede el saldo pendiente ($${saldoActual.toFixed(2)})`);
            }
            
            const nuevoTotalPagado = pagadoUSD + data.monto;
            const nuevoSaldo = Math.max(0, saldoActual - data.monto);
            
            const abonoRef = doc(collection(db, 'abonos'));
            transaction.set(abonoRef, {
                cotizacionId: data.cotizacionId,
                clienteId: data.clienteId,
                montoAbonadoUSD: data.monto,
                metodoPago: data.metodo,
                fechaAbono: serverTimestamp()
            });
            
            transaction.update(cotizacionRef, {
                montoPagadoUSD: nuevoTotalPagado,
                updatedAt: serverTimestamp()
            });
            
            return { 
                success: true, 
                abonoId: abonoRef.id,
                nuevoSaldo: nuevoSaldo
            };
        });
    } catch (error) {
        console.error('Error al registrar abono:', error);
        throw error;
    }
}