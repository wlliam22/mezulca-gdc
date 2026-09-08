import { checkAuth, logout } from './auth/auth.js';
import { obtenerClientes } from './services/cliente.service.js';
import { escucharCotizaciones } from './services/cotizacion.service.js';
import { renderizarCotizaciones, renderizarClientes } from './ui/renderer.js';
import { 
    configurarModales, 
    configurarFormCliente, 
    configurarFormAbono, 
    configurarFormCotizacion 
} from './ui/modals.js';
import { getMesActual } from './utils/dateUtils.js';
import { cargarClientesEnSelect } from './ui/selects.js';
import { setupTabs } from './ui/tabs.js';

// ============================================
// VARIABLES GLOBALES
// ============================================
let unsubscribeCotizaciones = null;
let clientesCache = [];
let recargando = false;

// ============================================
// INICIALIZACIÓN
// ============================================

(async function init() {
    // 1. Verificar autenticación
    const user = await checkAuth();
    if (!user) return;
    
    console.log('✅ Usuario autenticado:', user.email);
    console.log('📊 Sistema de Control de Créditos iniciado');
    
    // 2. Configurar logout
    document.getElementById('btnLogout')?.addEventListener('click', logout);
    
    // 3. Mostrar mes actual
    const now = new Date();
    const mesActual = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    document.getElementById('currentMonth').textContent = mesActual.charAt(0).toUpperCase() + mesActual.slice(1);
    
    // 4. Configurar Tabs
    setupTabs();
    
    // 5. Configurar modales
    configurarModales();
    
    // 6. Referencias a elementos
    const mesSelector = document.getElementById('mesSelector');
    const buscarInput = document.getElementById('buscarCliente');
    
    // 7. Función de recarga de datos (CORREGIDA)
    async function recargarDatos() {
        if (recargando) {
            console.log('⏳ Ya hay una recarga en curso, omitiendo...');
            return;
        }
        
        recargando = true;
        console.log('🔄 Recargando datos...', new Date().toISOString());
        
        const mes = mesSelector?.value || getMesActual();
        const busqueda = buscarInput?.value?.trim() || '';
        
        try {
            // 1. Obtener clientes
            const clientes = await obtenerClientes();
            clientesCache = clientes;
            console.log(`📋 ${clientes.length} clientes cargados`);
            
            // 2. Filtrar clientes por búsqueda
            let clientesFiltrados = clientes;
            if (busqueda) {
                clientesFiltrados = clientes.filter(c => 
                    c.nombreEmpresa.toLowerCase().includes(busqueda.toLowerCase())
                );
            }
            
            // 3. Actualizar selects de clientes
            cargarClientesEnSelect('cotCliente', clientes);
            cargarClientesEnSelect('abonoCliente', clientes);
            cargarClientesEnSelect('filtroClienteReporte', clientes);
            
            // 4. ✅ RENDERIZAR CLIENTES EN LA VISTA
            console.log('🎨 Renderizando clientes en vista...');
            renderizarClientes(clientesFiltrados, 'listaClientes');
            
            // 5. ✅ RENDERIZAR CLIENTES EN EL SELECT DE ABONO (cascada)
            // Ya se hizo en el paso 3
            
            // 6. Escuchar cotizaciones en tiempo real (CORREGIDO - con manejo de errores)
            if (unsubscribeCotizaciones) {
                try {
                    unsubscribeCotizaciones();
                } catch (e) {
                    console.warn('⚠️ Error al cancelar suscripción:', e);
                }
                unsubscribeCotizaciones = null;
            }
            
            // Pequeño delay para evitar sobrecarga
            await new Promise(resolve => setTimeout(resolve, 100));
            
            unsubscribeCotizaciones = escucharCotizaciones(mes, (cotizaciones) => {
                console.log(`📊 ${cotizaciones.length} cotizaciones cargadas para ${mes}`);
                console.log('🔍 Primera cotización:', cotizaciones[0]); // ✅ DEBUG
    
                let cotizacionesFiltradas = cotizaciones;
                if (busqueda) {
                    const clientesIds = clientes.map(c => c.id);
                    cotizacionesFiltradas = cotizaciones.filter(c => 
                    clientesIds.includes(c.clienteId)
                    );
                }
                renderizarCotizaciones(cotizacionesFiltradas, 'tbodyCotizaciones');
            });
            
            console.log('✅ Recarga completada');
        } catch (error) {
            console.error('❌ Error al recargar datos:', error);
        } finally {
            recargando = false;
        }
    }
    
    // 8. Configurar eventos de filtros
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
    
    // 9. Configurar formularios
    configurarFormCliente(recargarDatos);
    configurarFormCotizacion(recargarDatos);
    configurarFormAbono(recargarDatos);
    
    // 10. Cargar datos iniciales
    await recargarDatos();
    
    // 11. Configurar reportes
    configurarReportes();
    
    console.log('✅ Sistema listo');
    console.log('🔍 clientesCache:', clientesCache);
})();

// ============================================
// CONFIGURACIÓN DE REPORTES
// ============================================

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
            alert('📄 Funcionalidad de PDF en desarrollo');
        });
    }
    
    async function cargarReportes() {
        const mes = filtroMes?.value || getMesActual();
        const clienteId = filtroCliente?.value || '';
        
        try {
            const { obtenerCotizacionesPorMes } = await import('./services/cotizacion.service.js');
            const cotizaciones = await obtenerCotizacionesPorMes(mes);
            
            let filtradas = cotizaciones;
            if (clienteId) {
                filtradas = cotizaciones.filter(c => c.clienteId === clienteId);
            }
            
            const tbody = document.getElementById('tbodyReportes');
            if (!tbody) return;
            
            if (filtradas.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                            <i class="fas fa-inbox text-2xl block mb-2"></i>
                            No hay datos para el período seleccionado
                        </td>
                    </tr>
                `;
                return;
            }
            
            const { formatFechaCorta } = await import('./utils/dateUtils.js');
            const { formatUSD } = await import('./utils/currencyUtils.js');
            const { calcularEstatus } = await import('./services/cotizacion.service.js');
            
            tbody.innerHTML = filtradas.map(cot => {
                const estatus = calcularEstatus(cot);
                const badgeColor = estatus === 'Pagado' ? 'bg-green-100 text-green-800' :
                                  estatus === 'Vencido' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800';
                const saldo = (cot.montoDeudaUSD || 0) - (cot.montoPagadoUSD || 0);
                
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm font-mono">${cot.numeroFactura || '-'}</td>
                        <td class="px-4 py-3 text-sm">${cot.clienteNombre || '-'}</td>
                        <td class="px-4 py-3 text-sm">${formatFechaCorta(cot.fechaEmision)}</td>
                        <td class="px-4 py-3 text-sm">${formatFechaCorta(cot.fechaVencimiento)}</td>
                        <td class="px-4 py-3 text-sm text-right font-medium">${formatUSD(cot.montoDeudaUSD)}</td>
                        <td class="px-4 py-3 text-sm text-right font-bold ${saldo > 0 ? 'text-red-600' : 'text-green-600'}">${formatUSD(saldo)}</td>
                        <td class="px-4 py-3 text-sm text-center">
                            <span class="px-2 py-1 rounded-full text-xs font-medium ${badgeColor}">${estatus}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error al cargar reportes:', error);
        }
    }
}