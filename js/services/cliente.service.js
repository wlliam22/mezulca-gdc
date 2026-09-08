import { db } from '../config/firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    serverTimestamp,
    where
} from 'firebase/firestore';

// Obtener todos los clientes
export async function obtenerClientes() {
    try {
        const q = query(collection(db, 'clientes'), orderBy('nombreEmpresa'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return [];
    }
}

// Buscar clientes por nombre
export async function buscarClientes(texto) {
    try {
        const q = query(
            collection(db, 'clientes'),
            orderBy('nombreEmpresa')
        );
        const snapshot = await getDocs(q);
        const clientes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Filtrar en memoria (Firestore no tiene búsqueda por texto nativa)
        return clientes.filter(c => 
            c.nombreEmpresa.toLowerCase().includes(texto.toLowerCase())
        );
    } catch (error) {
        console.error('Error al buscar clientes:', error);
        return [];
    }
}

// Crear nuevo cliente
export async function crearCliente(data) {
    try {
        const docRef = await addDoc(collection(db, 'clientes'), {
            nombreEmpresa: data.nombre,
            telefono: data.telefono || '',
            direccion: data.direccion || '',
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error al crear cliente:', error);
        throw new Error('No se pudo crear el cliente');
    }
}