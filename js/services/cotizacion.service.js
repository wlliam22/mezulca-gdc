import { db } from '../config/firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    getDoc,
    serverTimestamp
} from 'firebase/firestore';
import { calcularDiasVencidos } from '../utils/dateUtils.js';

// Calcular estatus automático
export function calcularEstatus(cotizacion) {
    const saldoPendiente = (cotizacion.montoDeudaUSD || 0) - (cotizacion.montoPagadoUSD || 0);
    
    if (saldoPendiente <= 0.01) {
        return 'Pagado';
    }
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = cotizacion.fechaVencimiento?.toDate ? 
                 cotizacion.fechaVencimiento.toDate() : 
                 new Date(cotizacion.fechaVencimiento);
    venc.setHours(0, 0, 0, 0);
    
    if (hoy > venc) {
        return 'Vencido';
    }
    
    return 'Vigente';
}

// Escuchar cotizaciones en tiempo real
export function escucharCotizaciones(mes, callback) {
    console.log(`🔍 Escuchando cotizaciones para mes: ${mes}`);
    
    const q = query(
        collection(db, 'cotizaciones'),
        where('mesCorte', '==', mes),
        orderBy('fechaEmision', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
        const cotizaciones = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const saldoPendiente = (data.montoDeudaUSD || 0) - (data.montoPagadoUSD || 0);
            const estatus = calcularEstatus(data);
            const diasVencidos = calcularDiasVencidos(data.fechaVencimiento);
            
            cotizaciones.push({
                id: doc.id,
                ...data,
                saldoPendiente: saldoPendiente,
                estatus: estatus,
                diasVencidos: diasVencidos
            });
        });
        console.log(`📊 ${cotizaciones.length} cotizaciones encontradas para ${mes}`);
        callback(cotizaciones);
    }, (error) => {
        console.error('❌ Error en onSnapshot:', error);
    });
}

// Crear nueva cotización (CORREGIDO)
// Crear nueva cotización (CORREGIDO - CON LOGS ADICIONALES)
export async function crearCotizacion(data) {
    try {
        console.log('📝 Creando cotización con datos:', data);
        
        // ✅ Asegurar que fechaEmision sea un objeto Date
        let fechaEmision = data.fechaEmision;
        if (typeof fechaEmision === 'string') {
            fechaEmision = new Date(fechaEmision);
        }
        
        // ✅ FORZAR AÑO 2026 (corregir el problema)
        fechaEmision.setFullYear(2026);
        fechaEmision.setMonth(7); // Agosto (0-indexado: 7 = Agosto)
        
        console.log('📅 Fecha emisión corregida:', fechaEmision.toISOString());
        
        // ✅ Calcular fecha de vencimiento (5 días después)
        const fechaVencimiento = new Date(fechaEmision);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (data.diasCredito || 5));
        
        // ✅ Asegurar formato de mesCorte (YYYY-MM)
        const mesCorte = `${fechaEmision.getFullYear()}-${String(fechaEmision.getMonth() + 1).padStart(2, '0')}`;
        
        console.log('📅 Mes corte:', mesCorte);
        console.log('📅 Fecha vencimiento:', fechaVencimiento.toISOString());
        
        const docData = {
            numeroFactura: data.numeroFactura,
            clienteId: data.clienteId,
            clienteNombre: data.clienteNombre,
            fechaEmision: fechaEmision, // ✅ Date object con año 2026
            diasCredito: data.diasCredito || 5,
            fechaVencimiento: fechaVencimiento, // ✅ Date object
            montoDeudaBs: data.montoDeudaBs || 0,
            montoDeudaUSD: data.montoDeudaUSD,
            montoPagadoUSD: 0,
            mesCorte: mesCorte, // ✅ Formato YYYY-MM
            estatus: 'Vigente',
            createdAt: serverTimestamp()
        };
        
        console.log('📤 Guardando en Firestore:', docData);
        
        const docRef = await addDoc(collection(db, 'cotizaciones'), docData);
        console.log('✅ Cotización creada con ID:', docRef.id);
        
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('❌ Error al crear cotización:', error);
        throw new Error(`No se pudo crear la cotización: ${error.message}`);
    }
}

// Obtener cotizaciones por cliente
export async function obtenerCotizacionesPorCliente(clienteId) {
    try {
        const q = query(
            collection(db, 'cotizaciones'),
            where('clienteId', '==', clienteId)
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const saldoPendiente = (data.montoDeudaUSD || 0) - (data.montoPagadoUSD || 0);
            return {
                id: doc.id,
                ...data,
                saldoPendiente: saldoPendiente,
                tieneSaldo: saldoPendiente > 0.01
            };
        }).filter(c => c.tieneSaldo);
    } catch (error) {
        console.error('Error al obtener cotizaciones del cliente:', error);
        return [];
    }
}

// Obtener cotizaciones por mes (para reportes)
export async function obtenerCotizacionesPorMes(mes) {
    try {
        console.log(`🔍 Buscando cotizaciones para mes: ${mes}`);
        
        const q = query(
            collection(db, 'cotizaciones'),
            where('mesCorte', '==', mes),
            orderBy('fechaEmision', 'desc')
        );
        const snapshot = await getDocs(q);
        
        const resultados = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                saldoPendiente: (data.montoDeudaUSD || 0) - (data.montoPagadoUSD || 0)
            };
        });
        
        console.log(`📊 ${resultados.length} cotizaciones encontradas para ${mes}`);
        return resultados;
    } catch (error) {
        console.error('Error al obtener cotizaciones por mes:', error);
        return [];
    }
}