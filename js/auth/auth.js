import { auth } from '../config/firebase-config.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export function checkAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                resolve(user);
            } else {
                window.location.href = '/login.html';
                resolve(null);
            }
        });
    });
}

export async function logout() {
    try {
        await signOut(auth);
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión');
    }
}

export function getCurrentUser() {
    return auth.currentUser;
}