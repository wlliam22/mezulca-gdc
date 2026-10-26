import { db } from '../config/firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { calcularDiasVencidos, getHoy, getMesActual, sumarDias } from '../utils/dateUtils.js';
import { round2 } from '../utils/currencyUtils.js';
import { obtenerTasaBCV } from './bcv.service.js';

const COLLECTION_NAME = "cotizaciones";
export const DIAS_CREDITO = 5;

export function calcularEstatus(cot) {
    const saldo = round2((Number(cot.montoDeudaUSD) || 0) - (Number(cot.montoPagadoUSD) || 0));
    if (saldo <= 0) return "Pagado";
    return calcularDiasVencidos(cot.fechaVencimiento) > 0 ? "Vencido" : "Vigente";
}

function createdAtMs(c) {
    const t = c.createdAt;
    if (!t) return Date.now(); // escritura local pendiente: va de primera
    if (typeof t.toMillis === 'function') return t.toMillis();
    return new Date(t).getTime() || 0;
}

function procesarCotizacionDoc(docSnap) {
    const data = docSnap.data();
    const deuda = Number(data.montoDeudaUSD) || 0;
    const pagado = Number(data.montoPagadoUSD) || 0;
    const saldo = Math.max(0, round2(deuda - pagado));
    const estatus = calcularEstatus(data);

    return {
        id: docSnap.id,
        ...data,
        observaciones: data.observaciones || '',
        tasaBCV: data.tasaBCV || 0,
        saldoPendiente: saldo,
        estatus,
        diasVencidos: estatus === "Vencido" ? calcularDiasVencidos(data.fechaVencimiento) : 0
    };
}

/**
 * Crea una cotización.
 * - fechaEmision: 'YYYY-MM-DD'
 * - mesCorte = mes en que se CARGA (no el de emisión)
 */
export async function crearCotizacion(data) {
    const numeroFactura = (data.numeroFactura || '').trim();
    const montoUSD = round2(data.montoDeudaUSD);

    if (!numeroFactura || !data.clienteId || !data.fechaEmision || !(montoUSD > 0)) {
        throw new Error('Faltan datos obligatorios de la cotización');
    }

    // Evitar duplicados de número de factura
    const dup = await getDocs(query(
        collection(db, COLLECTION_NAME),
        where("activo", "==", true),
        where("numeroFactura", "==", numeroFactura)
    ));
    if (!dup.empty) {
        throw new Error(`Ya existe una cotización con el número ${numeroFactura}`);
    }

    const tasa = await obtenerTasaBCV();
    const montoBsManual = Number(data.montoDeudaBs) || 0;
    const montoBs = montoBsManual > 0 ? round2(montoBsManual) : round2(montoUSD * tasa);

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        numeroFactura,
        clienteId: data.clienteId,
        clienteNombre: data.clienteNombre,
        fechaEmision: data.fechaEmision,                                   // 'YYYY-MM-DD'
        diasCredito: DIAS_CREDITO,
        fechaVencimiento: sumarDias(data.fechaEmision, DIAS_CREDITO),      // 'YYYY-MM-DD'
        montoDeudaUSD: montoUSD,
        montoDeudaBs: montoBs,
        tasaBCV: tasa,
        montoPagadoUSD: 0,
        observaciones: (data.observaciones || '').trim(),
        fechaCarga: getHoy(),
        mesCorte: getMesActual(),
        activo: true,
        createdAt: serverTimestamp()
    });

    return { id: docRef.id, success: true };
}

// Eliminación lógica (no se editan, solo se crean o eliminan)
export async function eliminarCotizacion(cotizacionId) {
    await updateDoc(doc(db, COLLECTION_NAME, cotizacionId), {
        activo: false,
        eliminadoAt: serverTimestamp()
    });
    return { success: true };
}

export function escucharCotizaciones(mes, callback) {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("activo", "==", true),
        where("mesCorte", "==", mes)
    );

    return onSnapshot(q, (snapshot) => {
        const cotizaciones = snapshot.docs.map(procesarCotizacionDoc);
        cotizaciones.sort((a, b) => createdAtMs(b) - createdAtMs(a));
        callback(cotizaciones);
    }, (error) => {
        console.error("Error al escuchar cotizaciones:", error);
    });
}

export async function obtenerCotizacionesPorMes(mes) {
    try {
        const snapshot = await getDocs(query(
            collection(db, COLLECTION_NAME),
            where("activo", "==", true),
            where("mesCorte", "==", mes)
        ));
        const lista = snapshot.docs.map(procesarCotizacionDoc);
        lista.sort((a, b) => createdAtMs(a) - createdAtMs(b));
        return lista;
    } catch (error) {
        console.error("Error al obtener cotizaciones por mes:", error);
        return [];
    }
}

export async function obtenerCotizacionesPorCliente(clienteId) {
    try {
        const snapshot = await getDocs(query(
            collection(db, COLLECTION_NAME),
            where("activo", "==", true),
            where("clienteId", "==", clienteId)
        ));
        const lista = snapshot.docs.map(procesarCotizacionDoc);
        lista.sort((a, b) => createdAtMs(a) - createdAtMs(b));
        return lista;
    } catch (error) {
        console.error("Error al obtener cotizaciones por cliente:", error);
        return [];
    }
}