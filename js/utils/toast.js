/**
 * Muestra una notificación Toast flotante en el centro superior.
 * No bloquea la navegación.
 */
export function showToast(mensaje, tipo = 'success', duracion = 3000) {
    let container = document.getElementById('toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-2 pointer-events-none transition-all duration-300';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    
    const config = {
        success: 'bg-emerald-600 text-white shadow-emerald-900/20',
        error: 'bg-rose-600 text-white shadow-rose-900/20',
        warning: 'bg-amber-500 text-white shadow-amber-900/20',
        info: 'bg-blue-600 text-white shadow-blue-900/20'
    };

    const estiloColor = config[tipo] || config.info;

    toast.className = `pointer-events-auto flex items-center px-4 py-3 rounded-xl shadow-lg font-medium text-sm transition-all duration-300 transform -translate-y-5 opacity-0 ${estiloColor}`;
    toast.innerHTML = `
        <span class="mr-2 text-base font-bold">
            ${tipo === 'success' ? '✓' : tipo === 'error' ? '✕' : 'ℹ'}
        </span>
        <span>${mensaje}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('-translate-y-5', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-5', 'opacity-0');
        
        toast.addEventListener('transitionend', () => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        });
    }, duracion);
}