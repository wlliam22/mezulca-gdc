import { checkAuth, logout } from './auth/auth.js';
import { obtenerClientes, desactivarCliente } from './services/cliente.service.js';
import {
    escucharCotizaciones,
    obtenerCotizacionesPorMes,
    obtenerCotizacionesPorCliente,
    eliminarCotizacion
} from './services/cotizacion.service.js';
import { obtenerAbonosPorCliente, anularAbono } from './services/abono.service.js';
import { obtenerTasaBCV } from './services/bcv.service.js';
import {
    renderizarCotizaciones,
    renderizarResumenDia,
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
import { getMesActual, getNombreMes } from './utils/dateUtils.js';
import { formatBs } from './utils/currencyUtils.js';
import { cargarClientesEnSelect } from './ui/selects.js';
import { setupTabs } from './ui/tabs.js';
import { showToast } from './utils/toast.js';
import { mostrarConfirmacion } from './utils/dialog.js';

let unsubscribeCotizaciones = null;
let clientesCache = [];
let cotizacionesMes = [];

(async function init() {
    const user = await checkAuth();
    if (!user) return;

    document.getElementById('btnLogout')?.addEventListener('click', logout);

    const mesLargo = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const currentMonthElem = document.getElementById('currentMonth');
    if (currentMonthElem) {
        currentMonthElem.textContent = mesLargo.charAt(0).toUpperCase() + mesLargo.slice(1);
    }

    setupTabs();
    configurarModales();

    const mesSelector = document.getElementById('mesSelector');
    const buscarInput = document.getElementById('buscarCliente');
    const busqueda = () => buscarInput?.value?.trim().toLowerCase() || '';

    /* ---------- Tasa BCV en el header ---------- */
    async function mostrarTasa() {
        const el = document.getElementById('tasaBCV');
        if (!el) return;
        const tasa = await obtenerTasaBCV();
        el.textContent = tasa > 0 ? `BCV: ${formatBs(tasa)} / $` : 'BCV: no disponible (ingrésala manualmente)';
        el.className = tasa > 0
            ? 'text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold'
            : 'text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-semibold';
    }

    /* ---------- Clientes ---------- */
    function pintarClientes() {
        const b = busqueda();
        const lista = b
            ? clientesCache.filter(c => (c.nombreEmpresa || '').toLowerCase().includes(b))
            : clientesCache;
        renderizarClientes(lista, 'listaClientes');
    }

    async function cargarClientes() {
        try {
            clientesCache = await obtenerClientes();
            cargarClientesEnSelect('cotCliente', clientesCache);
            cargarClientesEnSelect('abonoCliente', clientesCache);
            cargarClientesEnSelect('filtroClienteReporte', clientesCache, 'Todos los clientes');
            pintarClientes();
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            showToast('Error al conectar con la base de datos', 'error');
        }
    }

    /* ---------- Cotizaciones (tiempo real) ---------- */
    function pintarCotizaciones() {
        const b = busqueda();
        const lista = b
            ? cotizacionesMes.filter(cot =>
                (cot.clienteNombre || '').toLowerCase().includes(b) ||
                (cot.numeroFactura || '').toLowerCase().includes(b))
            : cotizacionesMes;

        renderizarCotizaciones(lista, 'tbodyCotizaciones');
        renderizarResumenDia(cotizacionesMes);
    }

    function suscribirCotizaciones() {
        if (unsubscribeCotizaciones) {
            try { unsubscribeCotizaciones(); } catch (err) { console.warn(err); }
        }
        const mes = mesSelector?.value || getMesActual();
        unsubscribeCotizaciones = escucharCotizaciones(mes, (cotizaciones) => {
            cotizacionesMes = cotizaciones;
            pintarCotizaciones();
        });
    }

    if (mesSelector) {
        mesSelector.value = getMesActual();
        mesSelector.addEventListener('change', suscribirCotizaciones);
    }

    if (buscarInput) {
        let timeoutId;
        buscarInput.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => { pintarCotizaciones(); pintarClientes(); }, 250);
        });
        buscarInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                buscarInput.value = '';
                pintarCotizaciones();
                pintarClientes();
            }
        });
    }

    // Las cotizaciones y abonos se actualizan solos por onSnapshot; los clientes se recargan a mano
    configurarFormCliente(cargarClientes);
    configurarFormCotizacion();
    configurarFormAbono();

    await cargarClientes();
    suscribirCotizaciones();
    mostrarTasa();
    configurarReportes();

    /* ---------- Eventos de eliminación ---------- */
    window.addEventListener('eliminarCliente', async (e) => {
        const { clienteId, clienteNombre } = e.detail;
        const ok = await mostrarConfirmacion({
            titulo: '¿Desactivar cliente?',
            mensaje: `¿Desactivar al cliente "${clienteNombre}"? No aparecerá en los listados, pero sus cotizaciones se mantienen.`,
            textoBotonAceptar: 'Desactivar',
            tipo: 'danger'
        });
        if (!ok) return;
        try {
            await desactivarCliente(clienteId);
            showToast('Cliente desactivado con éxito', 'success');
            await cargarClientes();
        } catch (error) {
            showToast('Error al desactivar el cliente', 'error');
        }
    });

    window.addEventListener('eliminarCotizacion', async (e) => {
        const { cotizacionId, numeroFactura } = e.detail;
        const ok = await mostrarConfirmacion({
            titulo: '¿Eliminar cotización?',
            mensaje: `Se eliminará la cotización ${numeroFactura} y dejará de contarse en los consolidados, junto con sus abonos. Las cotizaciones no se pueden editar.`,
            textoBotonAceptar: 'Eliminar',
            tipo: 'danger'
        });
        if (!ok) return;
        try {
            await eliminarCotizacion(cotizacionId);
            showToast('Cotización eliminada', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al eliminar la cotización', 'error');
        }
    });
})();

/* ============================== REPORTES ============================== */
function configurarReportes() {
    const btnPDF = document.getElementById('btnExportarPDF');
    const filtroMes = document.getElementById('filtroMesReporte');
    const filtroCliente = document.getElementById('filtroClienteReporte');
    const contenedor = document.getElementById('tablaReportesContainer');

    async function cargarReportes() {
        const mes = filtroMes?.value || getMesActual();
        const clienteId = filtroCliente?.value || '';
        if (!contenedor) return;

        try {
            if (clienteId) {
                // RESUMEN CLIENTE
                const clienteObj = clientesCache.find(c => c.id === clienteId);
                const nombreCliente = clienteObj ? clienteObj.nombreEmpresa : 'CLIENTE';

                const [cotizaciones, abonosTodos] = await Promise.all([
                    obtenerCotizacionesPorCliente(clienteId),
                    obtenerAbonosPorCliente(clienteId)
                ]);

                // Solo abonos de cotizaciones que siguen activas
                const ids = new Set(cotizaciones.map(c => c.id));
                const abonos = abonosTodos.filter(a => ids.has(a.cotizacionId));

                contenedor.innerHTML = renderizarReporteClienteHTML(nombreCliente, cotizaciones, abonos);
            } else {
                // CONTROL DE CREDITOS DEL MES
                const cotizaciones = await obtenerCotizacionesPorMes(mes);
                contenedor.innerHTML = renderizarReporteMensualHTML(getNombreMes(mes), cotizaciones);
            }
        } catch (error) {
            console.error('Error al generar vista de reporte:', error);
            showToast('Error al procesar el reporte', 'error');
        }
    }

    if (filtroMes) {
        filtroMes.value = getMesActual();
        filtroMes.addEventListener('change', cargarReportes);
    }
    filtroCliente?.addEventListener('change', cargarReportes);

    // Exportar: se abre el diálogo de impresión -> "Guardar como PDF"
    btnPDF?.addEventListener('click', () => {
        if (!contenedor || !contenedor.innerText.trim()) {
            showToast('No hay datos disponibles para exportar', 'warning');
            return;
        }
        window.print();
    });

    // Anular abonos desde el reporte del cliente
    contenedor?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-anular-abono');
        if (!btn) return;

        const ok = await mostrarConfirmacion({
            titulo: '¿Anular abono?',
            mensaje: 'El abono dejará de contarse y el monto volverá al saldo pendiente de la cotización.',
            textoBotonAceptar: 'Anular',
            tipo: 'danger'
        });
        if (!ok) return;

        try {
            await anularAbono(btn.dataset.abonoId);
            showToast('Abono anulado', 'success');
            await cargarReportes();
        } catch (error) {
            console.error(error);
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    cargarReportes();
}