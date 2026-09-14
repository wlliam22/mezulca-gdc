/**
 * Muestra un modal de confirmación con estilo Tailwind alineado al diseño de la app.
 * Retorna una Promesa que resuelve en true si acepta o false si cancela.
 */
export function mostrarConfirmacion({
    titulo = '¿Estás seguro?',
    mensaje = 'Esta acción no se puede deshacer.',
    textoBotonAceptar = 'Aceptar',
    textoBotonCancelar = 'Cancelar',
    tipo = 'danger' // 'danger' | 'warning' | 'info'
} = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirmacion');
        const titleElem = document.getElementById('confirmTitle');
        const msgElem = document.getElementById('confirmMessage');
        const btnAceptar = document.getElementById('btnConfirmAceptar');
        const btnCancelar = document.getElementById('btnConfirmCancelar');
        const iconContainer = document.getElementById('confirmIconContainer');
        const iconElem = document.getElementById('confirmIcon');

        if (!modal) {
            resolve(confirm(mensaje));
            return;
        }

        // Configurar contenidos
        titleElem.textContent = titulo;
        msgElem.textContent = mensaje;
        btnAceptar.textContent = textoBotonAceptar;
        btnCancelar.textContent = textoBotonCancelar;

        // Estilos según el tipo
        if (tipo === 'danger') {
            iconContainer.className = 'w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4';
            iconElem.className = 'fas fa-exclamation-triangle text-xl';
            btnAceptar.className = 'w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium shadow-sm cursor-pointer';
        } else {
            iconContainer.className = 'w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4';
            iconElem.className = 'fas fa-info-circle text-xl';
            btnAceptar.className = 'w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm cursor-pointer';
        }

        // Mostrar modal
        modal.classList.remove('hidden');

        // Handlers de cierre
        const cerrar = (resultado) => {
            modal.classList.add('hidden');
            btnAceptar.removeEventListener('click', onAceptar);
            btnCancelar.removeEventListener('click', onCancelar);
            resolve(resultado);
        };

        const onAceptar = () => cerrar(true);
        const onCancelar = () => cerrar(false);

        btnAceptar.addEventListener('click', onAceptar);
        btnCancelar.addEventListener('click', onCancelar);
    });
}