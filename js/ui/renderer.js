import { formatFechaCorta, calcularDiasVencidos } from '../utils/dateUtils.js';
import { formatUSD, formatBs } from '../utils/currencyUtils.js';

// Renderizar tabla de cotizaciones
export function renderizarCotizaciones(cotizaciones, containerId) {
    const tbody = document.getElementById(containerId);
    if (!tbody) return;
    
    if (cotizaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-2xl block mb-2"></i>
                    No hay cotizaciones para este mes
                </td>
            </tr>
        `;
        actualizarTotales([]);
        return;
    }
    
    let html = '';
    let totalBs = 0;
    let totalUSD = 0;
    let totalSaldo = 0;
    
    cotizaciones.forEach(cot => {
        totalBs += cot.montoDeudaBs || 0;
        totalUSD += cot.montoDeudaUSD || 0;
        totalSaldo += cot.saldoPendiente || 0;
        
        const badgeColor = cot.estatus === 'Pagado' ? 'bg-green-100 text-green-800' :
                          cot.estatus === 'Vencido' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800';
        
        const icono = cot.estatus === 'Pagado' ? 'fa-check-circle' :
                     cot.estatus === 'Vencido' ? 'fa-exclamation-circle' :
                     'fa-clock';
        
        html += `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-4 py-3 text-sm font-mono">${cot.numeroFactura || '-'}</td>
                <td class="px-4 py-3 text-sm">${formatFechaCorta(cot.fechaEmision)}</td>
                <td class="px-4 py-3 text-sm text-center">${cot.diasCredito || 5}</td>
                <td class="px-4 py-3 text-sm">${formatFechaCorta(cot.fechaVencimiento)}</td>
                <td class="px-4 py-3 text-sm font-medium">${cot.clienteNombre || '-'}</td>
                <td class="px-4 py-3 text-sm text-right">${formatBs(cot.montoDeudaBs)}</td>
                <td class="px-4 py-3 text-sm text-right font-medium">${formatUSD(cot.montoDeudaUSD)}</td>
                <td class="px-4 py-3 text-sm text-right font-bold ${cot.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}">
                    ${formatUSD(cot.saldoPendiente)}
                </td>
                <td class="px-4 py-3 text-sm text-center ${cot.diasVencidos > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}">
                    ${cot.diasVencidos > 0 ? cot.diasVencidos : '-'}
                </td>
                <td class="px-4 py-3 text-sm text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${badgeColor}">
                        <i class="fas ${icono} mr-1"></i>
                        ${cot.estatus}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-center">
                    <div class="flex justify-center gap-2">
                        ${cot.estatus !== 'Pagado' ? `
                            <button class="btn-abono px-2 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 transition" 
                                    data-cotizacion-id="${cot.id}"
                                    data-cliente-id="${cot.clienteId}"
                                    data-cliente-nombre="${cot.clienteNombre}"
                                    data-saldo="${cot.saldoPendiente}">
                                <i class="fas fa-hand-holding-usd"></i> Abono
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    actualizarTotales({ totalBs, totalUSD, totalSaldo });
    
    // Asignar eventos a los botones de abono
    document.querySelectorAll('.btn-abono').forEach(btn => {
        btn.addEventListener('click', function() {
            const cotizacionId = this.dataset.cotizacionId;
            const clienteId = this.dataset.clienteId;
            const clienteNombre = this.dataset.clienteNombre;
            const saldo = parseFloat(this.dataset.saldo);
            
            // Disparar evento personalizado para abrir modal de abono
            window.dispatchEvent(new CustomEvent('abrirModalAbono', {
                detail: { cotizacionId, clienteId, clienteNombre, saldo }
            }));
        });
    });
}

// Actualizar totales en el footer
function actualizarTotales(totales) {
    document.getElementById('totalBs').textContent = formatBs(totales.totalBs || 0);
    document.getElementById('totalUSD').textContent = formatUSD(totales.totalUSD || 0);
    document.getElementById('totalSaldo').textContent = formatUSD(totales.totalSaldo || 0);
}

// Renderizar clientes en tarjetas (VERSIÓN CORREGIDA)
export function renderizarClientes(clientes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    console.log(`🎨 Renderizando ${clientes.length} clientes en ${containerId}`);
    
    if (!clientes || clientes.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <i class="fas fa-users text-4xl block mb-3 text-gray-300"></i>
                <p class="text-lg font-medium">No hay clientes registrados</p>
                <p class="text-sm mt-1">Haz clic en <span class="font-bold text-green-600">"Nuevo Cliente"</span> para comenzar</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = clientes.map(cliente => `
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow hover:border-blue-300">
            <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-gray-800 truncate" title="${cliente.nombreEmpresa}">${cliente.nombreEmpresa}</h4>
                    ${cliente.telefono ? `
                        <p class="text-sm text-gray-600 mt-1">
                            <i class="fas fa-phone mr-1 text-gray-400"></i>${cliente.telefono}
                        </p>
                    ` : ''}
                    ${cliente.direccion ? `
                        <p class="text-sm text-gray-600 mt-0.5">
                            <i class="fas fa-map-marker-alt mr-1 text-gray-400"></i>${cliente.direccion}
                        </p>
                    ` : ''}
                </div>
                <span class="text-xs text-gray-400 flex-shrink-0 ml-2">
                    <i class="fas fa-calendar-alt mr-1"></i>
                    ${cliente.createdAt ? new Date(cliente.createdAt.toDate()).toLocaleDateString('es-ES') : 'Reciente'}
                </span>
            </div>
        </div>
    `).join('');
}