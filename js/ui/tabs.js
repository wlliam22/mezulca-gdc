export function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const views = {
        cotizaciones: document.getElementById('view-cotizaciones'),
        clientes: document.getElementById('view-clientes'),
        reportes: document.getElementById('view-reportes')
    };
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remover clase active de todos los tabs
            tabs.forEach(t => {
                t.classList.remove('active', 'border-blue-600', 'text-blue-600');
                t.classList.add('border-transparent', 'text-gray-500');
            });
            
            // Activar tab clickeado
            this.classList.add('active', 'border-blue-600', 'text-blue-600');
            this.classList.remove('border-transparent', 'text-gray-500');
            
            // Mostrar vista correspondiente
            const view = this.dataset.view;
            Object.keys(views).forEach(key => {
                if (views[key]) {
                    views[key].classList.add('hidden');
                }
            });
            if (views[view]) {
                views[view].classList.remove('hidden');
            }
            
            // Cargar datos de reportes si es necesario
            if (view === 'reportes') {
                document.getElementById('filtroMesReporte')?.dispatchEvent(new Event('change'));
            }
        });
    });
}