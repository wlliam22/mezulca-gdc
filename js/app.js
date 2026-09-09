import { checkAuth, logout } from './auth/auth.js';
import { obtenerClientes } from './services/cliente.service.js';
import { 
    escucharCotizaciones, 
    obtenerCotizacionesPorMes, 
    obtenerCotizacionesPorCliente,
    obtenerAbonosPorCliente,
    calcularEstatus 
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
import { getMesActual, formatFechaCorta } from './utils/dateUtils.js';
import { formatUSD } from './utils/currencyUtils.js';
import { cargarClientesEnSelect } from './ui/selects.js';
import { setupTabs } from './ui/tabs.js';
import { showToast } from './utils/toast.js';

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
})();

function configurarReportes() {
    const btnPDF = document.getElementById('btnExportarPDF');
    const filtroMes = document.getElementById('filtroMesReporte');
    const filtroCliente = document.getElementById('filtroClienteReporte');
    const contenedorVista = document.getElementById('tbodyReportes')?.parentElement;

    if (filtroMes) {
        filtroMes.value = getMesActual();
        filtroMes.addEventListener('change', cargarReportes);
    }
    
    if (filtroCliente) {
        filtroCliente.addEventListener('change', cargarReportes);
    }
    
    if (btnPDF) {
        btnPDF.addEventListener('click', () => {
            if (!contenedorVista || contenedorVista.innerText.includes('No hay datos')) {
                showToast('No hay datos disponibles para imprimir', 'warning');
                return;
            }
            window.print();
        });
    }
    
    async function cargarReportes() {
        const mes = filtroMes?.value || getMesActual();
        const clienteId = filtroCliente?.value || '';
        
        if (!contenedorVista) return;
        
        try {
            if (clienteId) {
                const clienteObj = clientesCache.find(c => c.id === clienteId);
                const nombreCliente = clienteObj ? clienteObj.nombreEmpresa : 'CLIENTE';
                const cotizaciones = await obtenerCotizacionesPorCliente(clienteId);
                const abonos = await obtenerAbonosPorCliente(clienteId);
                
                contenedorVista.outerHTML = `<div id="reporteContainer">${renderizarReporteClienteHTML(nombreCliente, cotizaciones, abonos)}</div>`;
            } else {
                const cotizaciones = await obtenerCotizacionesPorMes(mes);
                const tasaBCV = await obtenerTasaBCV();
                const nombreMes = filtroMes?.options[filtroMes.selectedIndex]?.text || mes;
                
                contenedorVista.outerHTML = `<div id="reporteContainer">${renderizarReporteMensualHTML(nombreMes, cotizaciones, tasaBCV)}</div>`;
            }
        } catch (error) {
            console.error('Error al generar vista de reporte:', error);
            showToast('Error al procesar el reporte', 'error');
        }
    }
}