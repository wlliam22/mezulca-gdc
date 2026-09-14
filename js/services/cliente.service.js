import { db } from '../config/firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    doc, 
    serverTimestamp 
} from 'firebase/firestore';

const COLLECTION_NAME = "clientes";

export async function crearCliente(clienteData) {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            nombreEmpresa: clienteData.nombreEmpresa.trim(),
            telefono: clienteData.telefono?.trim() || '',
            direccion: clienteData.direccion?.trim() || '',
            activo: true,
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, success: true };
    } catch (error) {
        console.error("Error al crear cliente:", error);
        throw error;
    }
}

export async function obtenerClientes() {
    try {
        // Consulta limpia a la colección sin restricciones de índice
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        
        const clientes = snapshot.docs
            .map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }))
            // Mantiene los activos y los que no tenían la propiedad 'activo' definida
            .filter(cliente => cliente.activo !== false);

        // Ordenamiento seguro
        clientes.sort((a, b) => {
            const nombreA = a.nombreEmpresa || '';
            const nombreB = b.nombreEmpresa || '';
            return nombreA.localeCompare(nombreB);
        });

        console.log("Clientes cargados desde Firestore:", clientes);
        return clientes;
    } catch (error) {
        console.error("Error al obtener clientes:", error);
        return [];
    }
}

// Soft Delete (Borrado Lógico)
export async function desactivarCliente(clienteId) {
    try {
        const clienteRef = doc(db, COLLECTION_NAME, clienteId);
        await updateDoc(clienteRef, {
            activo: false
        });
        return { success: true };
    } catch (error) {
        console.error("Error al desactivar cliente:", error);
        throw error;
    }
}