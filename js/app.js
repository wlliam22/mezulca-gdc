import { checkAuth, logout } from './auth/auth.js';
import { obtenerClientes, desactivarCliente } from './services/cliente.service.js';
import { 
    escucharCotizaciones, 
    obtenerCotizacionesPorMes, 
    obtenerCotizacionesPorCliente,
    obtenerAbonosPorCliente
} from './services/cotizacion.service.js';
import { obtenerTasaBCV } from './services/bcv.service.js';
import { 
    renderizarCotizaciones, 
    renderizarClientes,
    renderizarReporteClienteHTML,
    renderizarReporteMensualHTML 
} from './ui/renderer.js';
import { 
    configurarModales, 
    configurarFormCliente, 
    configurarFormAbono, 
    configurarFormCotizacion 
} from './ui/modals.js';
import { getMesActual } from './utils/dateUtils.js';
import { cargarClientesEnSelect } from './ui/selects.js';
import { setupTabs } from './ui/tabs.js';
import { showToast } from './utils/toast.js';
import { mostrarConfirmacion } from './utils/dialog.js';

let unsubscribeCotizaciones = null;
let clientesCache = [];
let recargando = false;

(async function init() {
    const user = await checkAuth();
    if (!user) return;
    
    console.log('✅ Usuario autenticado:', user.email);
    
    document.getElementById('btnLogout')?.addEventListener('click', logout);
    
    const now = new Date();
    const mesActual = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const currentMonthElem = document.getElementById('currentMonth');
    if (currentMonthElem) {
        currentMonthElem.textContent = mesActual.charAt(0).toUpperCase() + mesActual.slice(1);
    }
    
    setupTabs();
    configurarModales();
    
    const mesSelector = document.getElementById('mesSelector');
    const buscarInput = document.getElementById('buscarCliente');
    
    async function recargarDatos() {
        if (recargando) return;
        
        recargando = true;
        const mes = mesSelector?.value || getMesActual();
        const busqueda = buscarInput?.value?.trim().toLowerCase() || '';
        
        try {
            const clientes = await obtenerClientes();
            clientesCache = clientes;
            
            const clientesFiltrados = busqueda 
                ? clientes.filter(c => c.nombreEmpresa.toLowerCase().includes(busqueda))
                : clientes;
            
            cargarClientesEnSelect('cotCliente', clientes);
            cargarClientesEnSelect('abonoCliente', clientes);
            cargarClientesEnSelect('filtroClienteReporte', clientes);
            
            renderizarClientes(clientesFiltrados, 'listaClientes');
            
            if (unsubscribeCotizaciones) {
                try { unsubscribeCotizaciones(); } catch (e) { console.warn(e); }
                unsubscribeCotizaciones = null;
            }
            
            unsubscribeCotizaciones = escucharCotizaciones(mes, (cotizaciones) => {
                let cotizacionesFiltradas = cotizaciones;
                
                if (busqueda) {
                    cotizacionesFiltradas = cotizaciones.filter(cot => 
                        (cot.clienteNombre && cot.clienteNombre.toLowerCase().includes(busqueda)) ||
                        (cot.numeroFactura && cot.numeroFactura.toLowerCase().includes(busqueda))
                    );
                }
                
                renderizarCotizaciones(cotizacionesFiltradas, 'tbodyCotizaciones');
            });
            
        } catch (error) {
            console.error('❌ Error al recargar datos:', error);
            showToast('Error al conectar con la base de datos', 'error');
        } finally {
            recargando = false;
        }
    }
    
    if (mesSelector) {
        mesSelector.value = getMesActual();
        mesSelector.addEventListener('change', () => recargarDatos());
    }
    
    if (buscarInput) {
        let timeoutId;
        buscarInput.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(recargarDatos, 300);
        });
        
        buscarInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                buscarInput.value = '';
                recargarDatos();
            }
        });
    }
    
    configurarFormCliente(recargarDatos);
    configurarFormCotizacion(recargarDatos);
    configurarFormAbono(recargarDatos);
    
    await recargarDatos();
    configurarReportes();

    // Evento de desactivación lógica de clientes
    window.addEventListener('eliminarCliente', async (e) => {
        const { clienteId, clienteNombre } = e.detail;
    
        const confirmado = await mostrarConfirmacion({
            titulo: '¿Desactivar cliente?',
            mensaje: `¿Estás seguro de desactivar al cliente "${clienteNombre}"? No aparecerá en los listados pero sus cotizaciones se mantendrán.`,
            textoBotonAceptar: 'Desactivar',
            textoBotonCancelar: 'Cancelar',
            tipo: 'danger'
        });

        if (confirmado) {
            try {
                await desactivarCliente(clienteId);
                showToast('Cliente desactivado con éxito', 'success');
                await recargarDatos();
            } catch (error) {
                showToast('Error al desactivar el cliente', 'error');
            }
        }
    });
})();

function configurarReportes() {
    const btnPDF = document.getElementById('btnExportarPDF');
    const filtroMes = document.getElementById('filtroMesReporte');
    const filtroCliente = document.getElementById('filtroClienteReporte');

    if (filtroMes) {
        filtroMes.value = getMesActual();
        filtroMes.addEventListener('change', cargarReportes);
    }
    
    if (filtroCliente) {
        filtroCliente.addEventListener('change', cargarReportes);
    }
    
    if (btnPDF) {
        btnPDF.addEventListener('click', () => {
            const contenedorVista = document.getElementById('tablaReportesContainer');
            
            if (!contenedorVista || !contenedorVista.innerText.trim() || contenedorVista.innerText.includes('No hay datos')) {
                showToast('No hay datos disponibles para exportar', 'warning');
                return;
            }

            const tabla = document.getElementById('tablaReportes');

            // Caso 1: Si hay una tabla HTML válida (Reporte Mensual General), usar jsPDF + AutoTable
            if (tabla && window.jspdf && window.jspdf.jsPDF) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'letter'
                });

                doc.setFontSize(14);
                doc.text("REPORTE DE CRÉDITOS Y COBRANZAS - MEZULCAGDC", 14, 15);

                doc.autoTable({
                    html: '#tablaReportes',
                    startY: 22,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 2.5 },
                    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
                });

                doc.save(`Reporte_Creditos_${getMesActual()}.pdf`);
            } 
            // Caso 2: Reporte por Cliente (HTML personalizado), disparar impresión CSS limpia sin cabeceras web
            else {
                window.print();
            }
        });
    }
    
    async function cargarReportes() {
        const mes = filtroMes?.value || getMesActual();
        const clienteId = filtroCliente?.value || '';
        const contenedorVista = document.getElementById('tablaReportesContainer');
        
        if (!contenedorVista) return;
        
        try {
            if (clienteId) {
                const clienteObj = clientesCache.find(c => c.id === clienteId);
                const nombreCliente = clienteObj ? clienteObj.nombreEmpresa : 'CLIENTE';
                const cotizaciones = await obtenerCotizacionesPorCliente(clienteId);
                const abonos = await obtenerAbonosPorCliente(clienteId);
                
                // Inyecta la vista formateada del cliente
                contenedorVista.innerHTML = renderizarReporteClienteHTML(nombreCliente, cotizaciones, abonos);
            } else {
                const cotizaciones = await obtenerCotizacionesPorMes(mes);
                let tasaBCV = 0;
                try {
                    tasaBCV = await obtenerTasaBCV();
                } catch (e) {
                    console.warn('No se pudo obtener la tasa BCV:', e);
                }
                
                let nombreMes = mes;
                if (filtroMes && filtroMes.options && filtroMes.selectedIndex >= 0) {
                    nombreMes = filtroMes.options[filtroMes.selectedIndex].text;
                }
                
                contenedorVista.innerHTML = renderizarReporteMensualHTML(nombreMes, cotizaciones, tasaBCV);
            }
        } catch (error) {
            console.error('Error al generar vista de reporte:', error);
            showToast('Error al procesar el reporte', 'error');
        }
    }

    // Cargar reporte inicial
    cargarReportes();
}