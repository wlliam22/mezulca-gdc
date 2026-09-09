import { db } from '../config/firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    onSnapshot, 
    serverTimestamp 
} from 'firebase/firestore';
import { calcularDiasVencidos } from '../utils/dateUtils.js';
import { obtenerTasaBCV } from './bcv.service.js';

const COLLECTION_NAME = "cotizaciones";

export function calcularEstatus(cot) {
    const deuda = Number(cot.montoDeudaUSD) || 0;
    const pagado = Number(cot.montoPagadoUSD) || 0;
    const saldo = deuda - pagado;

    if (saldo <= 0) return "Pagado";

    const fechaVenc = cot.fechaVencimiento?.toDate 
        ? cot.fechaVencimiento.toDate() 
        : new Date(cot.fechaVencimiento);
        
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return hoy > fechaVenc ? "Vencido" : "Vigente";
}

function procesarCotizacionDoc(docSnap) {
    const data = docSnap.data();
    const deuda = Number(data.montoDeudaUSD) || 0;
    const pagado = Number(data.montoPagadoUSD) || 0;
    const saldo = Math.max(0, deuda - pagado);
    
    const estatus = saldo <= 0 ? "Pagado" : calcularEstatus(data);
    const diasVencidos = estatus === "Vencido" ? calcularDiasVencidos(data.fechaVencimiento) : 0;

    return {
        id: docSnap.id,
        ...data,
        observaciones: data.observaciones || '',
        tasaBCV: data.tasaBCV || 0,
        saldoPendiente: saldo,
        estatus: estatus,
        diasVencidos: diasVencidos
    };
}

export async function crearCotizacion(cotizacionData) {
    try {
        const fechaEmisionObj = new Date(cotizacionData.fechaEmision);
        const dias = Number(cotizacionData.diasCredito) || 5;
        
        const fechaVencimientoObj = new Date(fechaEmisionObj);
        fechaVencimientoObj.setDate(fechaVencimientoObj.getDate() + dias);

        const montoDeuda = Number(cotizacionData.montoDeudaUSD) || 0;
        const montoPagado = Number(cotizacionData.montoPagadoUSD) || 0;

        const tasaOficial = await obtenerTasaBCV();
        const montoBsCalculado = Number(cotizacionData.montoDeudaBs) || (montoDeuda * tasaOficial);

        const mesCorte = `${fechaEmisionObj.getFullYear()}-${String(fechaEmisionObj.getMonth() + 1).padStart(2, '0')}`;

        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            numeroFactura: cotizacionData.numeroFactura,
            clienteId: cotizacionData.clienteId,
            clienteNombre: cotizacionData.clienteNombre,
            fechaEmision: fechaEmisionObj.toISOString(),
            diasCredito: dias,
            fechaVencimiento: fechaVencimientoObj.toISOString(),
            montoDeudaUSD: montoDeuda,
            montoDeudaBs: montoBsCalculado,
            tasaBCV: tasaOficial,
            montoPagadoUSD: montoPagado,
            observaciones: cotizacionData.observaciones?.trim() || '',
            mesCorte: mesCorte,
            activo: true,
            createdAt: serverTimestamp()
        });

        return { id: docRef.id, success: true };
    } catch (error) {
        console.error("Error al crear cotización:", error);
        throw error;
    }
}

export function escucharCotizaciones(mes, callback) {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("activo", "==", true),
        where("mesCorte", "==", mes)
    );

    return onSnapshot(q, (snapshot) => {
        const cotizaciones = snapshot.docs.map(procesarCotizacionDoc);
        
        cotizaciones.sort((a, b) => {
            const fechaA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const fechaB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return fechaB - fechaA;
        });

        callback(cotizaciones);
    }, (error) => {
        console.error("Error al escuchar cotizaciones:", error);
    });
}

export async function obtenerCotizacionesPorMes(mes) {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("activo", "==", true),
            where("mesCorte", "==", mes)
        );
        const snapshot = await getDocs(q);
        const cotizaciones = snapshot.docs.map(procesarCotizacionDoc);
        
        cotizaciones.sort((a, b) => {
            const fechaA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const fechaB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return fechaB - fechaA;
        });

        return cotizaciones;
    } catch (error) {
        console.error("Error al obtener cotizaciones por mes:", error);
        return [];
    }
}

export async function obtenerCotizacionesPorCliente(clienteId) {
    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("activo", "==", true),
            where("clienteId", "==", clienteId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(procesarCotizacionDoc);
    } catch (error) {
        console.error("Error al obtener cotizaciones por cliente:", error);
        return [];
    }
}

export async function obtenerAbonosPorCliente(clienteId) {
    try {
        const q = query(
            collection(db, "abonos"),
            where("clienteId", "==", clienteId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error al obtener abonos por cliente:", error);
        return [];
    }
}