import { getMesActual } from '../utils/dateUtils.js';

export function configurarFiltros(recargarCallback) {
    const mesSelector = document.getElementById('mesSelector');
    if (mesSelector) {
        mesSelector.value = getMesActual();
        mesSelector.addEventListener('change', () => {
            if (recargarCallback) recargarCallback();
        });
    }
    
    const buscarCliente = document.getElementById('buscarCliente');
    if (buscarCliente) {
        let timeoutId;
        buscarCliente.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if (recargarCallback) recargarCallback();
            }, 300);
        });
        
        // ✅ Añadir botón de limpiar búsqueda (opcional)
        buscarCliente.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                buscarCliente.value = '';
                if (recargarCallback) recargarCallback();
            }
        });
    }
}