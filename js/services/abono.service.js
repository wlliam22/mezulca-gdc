import { db } from '../config/firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    serverTimestamp,
    getDoc
} from 'firebase/firestore';

export async function registrarAbono(data) {
    try {
        // Validar que el monto no sea mayor al saldo pendiente
        const cotizacionRef = doc(db, 'cotizaciones', data.cotizacionId);
        const cotizacionSnap = await getDoc(cotizacionRef);
        
        if (!cotizacionSnap.exists()) {
            throw new Error('Cotización no encontrada');
        }
        
        const cotizacion = cotizacionSnap.data();
        const saldoActual = (cotizacion.montoDeudaUSD || 0) - (cotizacion.montoPagadoUSD || 0);
        
        if (data.monto > saldoActual) {
            throw new Error(`El monto excede el saldo pendiente ($${saldoActual.toFixed(2)})`);
        }
        
        // Calcular nuevo total pagado
        const nuevoTotalPagado = (cotizacion.montoPagadoUSD || 0) + data.monto;
        
        // Crear registro de abono
        const abonoRef = await addDoc(collection(db, 'abonos'), {
            cotizacionId: data.cotizacionId,
            clienteId: data.clienteId,
            montoAbonadoUSD: data.monto,
            metodoPago: data.metodo,
            fechaAbono: serverTimestamp()
        });
        
        // Actualizar la cotización
        await updateDoc(cotizacionRef, {
            montoPagadoUSD: nuevoTotalPagado
        });
        
        return { 
            success: true, 
            abonoId: abonoRef.id,
            nuevoSaldo: saldoActual - data.monto
        };
    } catch (error) {
        console.error('Error al registrar abono:', error);
        throw error;
    }
}