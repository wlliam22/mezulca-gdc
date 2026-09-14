import { formatFechaCorta } from '../utils/dateUtils.js';
import { formatUSD, formatBs } from '../utils/currencyUtils.js';

export function renderizarCotizaciones(cotizaciones, containerId) {
    const tbody = document.getElementById(containerId);
    if (!tbody) return;
    
    if (!cotizaciones || cotizaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-2xl block mb-2 text-gray-400"></i>
                    No hay cotizaciones para este mes
                </td>
            </tr>
        `;
        actualizarTotales({ totalBs: 0, totalUSD: 0, totalSaldo: 0 });
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
                <td class="px-4 py-3 text-sm text-right whitespace-nowrap">${formatBs(cot.montoDeudaBs)}</td>
                <td class="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">${formatUSD(cot.montoDeudaUSD)}</td>
                <td class="px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${cot.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}">
                    ${formatUSD(cot.saldoPendiente)}
                </td>
                <td class="px-4 py-3 text-sm text-center ${cot.diasVencidos > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}">
                    ${cot.diasVencidos > 0 ? cot.diasVencidos : '-'}
                </td>
                <td class="px-4 py-3 text-sm text-center">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center ${badgeColor}">
                        <i class="fas ${icono} mr-1.5"></i>
                        ${cot.estatus}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-center">
                    <div class="flex justify-center gap-2">
                        ${cot.estatus !== 'Pagado' ? `
                            <button type="button" class="btn-abono px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded transition border border-green-200 shadow-sm cursor-pointer" 
                                    data-cotizacion-id="${cot.id}"
                                    data-cliente-id="${cot.clienteId}"
                                    data-cliente-nombre="${cot.clienteNombre}"
                                    data-saldo="${cot.saldoPendiente}">
                                <i class="fas fa-hand-holding-usd mr-1"></i> Abono
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    actualizarTotales({ totalBs, totalUSD, totalSaldo });
    
    tbody.querySelectorAll('.btn-abono').forEach(btn => {
        btn.addEventListener('click', function() {
            const cotizacionId = this.dataset.cotizacionId;
            const clienteId = this.dataset.clienteId;
            const clienteNombre = this.dataset.clienteNombre;
            const saldo = parseFloat(this.dataset.saldo);
            
            window.dispatchEvent(new CustomEvent('abrirModalAbono', {
                detail: { cotizacionId, clienteId, clienteNombre, saldo }
            }));
        });
    });
}

function actualizarTotales(totales) {
    const elemBs = document.getElementById('totalBs');
    const elemUSD = document.getElementById('totalUSD');
    const elemSaldo = document.getElementById('totalSaldo');

    if (elemBs) elemBs.textContent = formatBs(totales.totalBs || 0);
    if (elemUSD) elemUSD.textContent = formatUSD(totales.totalUSD || 0);
    if (elemSaldo) elemSaldo.textContent = formatUSD(totales.totalSaldo || 0);
}

export function renderizarClientes(clientes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
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
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-blue-300 relative group">
            <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0 pr-6">
                    <h4 class="font-bold text-gray-800 truncate" title="${cliente.nombreEmpresa}">${cliente.nombreEmpresa}</h4>
                    ${cliente.telefono ? `
                        <p class="text-sm text-gray-600 mt-1 flex items-center">
                            <i class="fas fa-phone mr-2 text-gray-400 text-xs"></i>${cliente.telefono}
                        </p>
                    ` : ''}
                    ${cliente.direccion ? `
                        <p class="text-sm text-gray-600 mt-0.5 flex items-center">
                            <i class="fas fa-map-marker-alt mr-2 text-gray-400 text-xs"></i>${cliente.direccion}
                        </p>
                    ` : ''}
                </div>
                <button type="button" 
                        class="btn-eliminar-cliente text-gray-400 hover:text-red-600 p-1.5 rounded transition"
                        data-cliente-id="${cliente.id}"
                        data-cliente-nombre="${cliente.nombreEmpresa}"
                        title="Desactivar cliente">
                    <i class="fas fa-trash-alt text-sm"></i>
                </button>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                <span class="font-mono text-[10px]">ID: ${cliente.id.slice(0, 8)}...</span>
                <span>
                    <i class="fas fa-calendar-alt mr-1"></i>
                    ${cliente.createdAt ? new Date(cliente.createdAt.toDate ? cliente.createdAt.toDate() : cliente.createdAt).toLocaleDateString('es-ES') : 'Reciente'}
                </span>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-eliminar-cliente').forEach(btn => {
        btn.addEventListener('click', function() {
            const clienteId = this.dataset.clienteId;
            const clienteNombre = this.dataset.clienteNombre;
            
            window.dispatchEvent(new CustomEvent('eliminarCliente', {
                detail: { clienteId, clienteNombre }
            }));
        });
    });
}

// Render del formato "RESUMEN CLIENTE 2026" (REPORTE POR CLIENTE)
export function renderizarReporteClienteHTML(nombreCliente, cotizaciones = [], abonos = []) {
    let totalSubTotalUSD = 0;
    let totalAbonoUSD = 0;

    const filasCotizaciones = cotizaciones.map((cot, index) => {
        totalSubTotalUSD += (cot.montoDeudaUSD || 0);
        const despacho = cot.despachoManual || cot.observaciones || cot.despacho || '-';
        
        return `
            <tr>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #000; padding: 5px; font-family: monospace;">${cot.numeroFactura || '-'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${despacho}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center; text-transform: uppercase;">${cot.estatus || 'PENDIENTE'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${formatFechaCorta(cot.fechaEmision)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; white-space: nowrap;">${formatUSD(cot.montoDeudaUSD)}</td>
            </tr>
        `;
    }).join('');

    const filasAbonos = abonos.map(ab => {
        const montoAbonado = ab.montoUSD || ab.montoAbonadoUSD || 0;
        totalAbonoUSD += montoAbonado;
        const etiquetaAbono = ab.metodoPago ? `ABONO (${ab.metodoPago})` : 'ABONO';

        return `
            <tr>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${etiquetaAbono}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; white-space: nowrap;">${ab.montoBs ? formatBs(ab.montoBs) : 'Bs 0,00'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;" colspan="2">${formatFechaCorta(ab.fecha || ab.fechaAbono)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; white-space: nowrap;">${formatUSD(montoAbonado)}</td>
            </tr>
        `;
    }).join('');

    const saldoPendiente = totalSubTotalUSD - totalAbonoUSD;

    return `
        <div style="font-family: Arial, sans-serif; color: #000; width: 100%; max-width: 900px; margin: 0 auto; padding: 10px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #000;">
                <thead>
                    <!-- Encabezado con Nombre de Cliente y Fecha -->
                    <tr>
                        <td colspan="6" style="border: 1px solid #000; padding: 10px; background-color: #ffffff;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                    RESUMEN ${nombreCliente} ${new Date().getFullYear()}
                                </h2>
                                <div style="font-size: 12px; text-align: right;">
                                    Fecha de Elaboración: <strong>${new Date().toLocaleDateString('es-ES')}</strong>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <!-- Fila de Títulos de Columnas -->
                    <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                        <th style="border: 1px solid #000; padding: 6px; width: 50px;">ITEM</th>
                        <th style="border: 1px solid #000; padding: 6px;">No COTIZACION</th>
                        <th style="border: 1px solid #000; padding: 6px;">DESPACHO MANUAL</th>
                        <th style="border: 1px solid #000; padding: 6px;">STATUS</th>
                        <th style="border: 1px solid #000; padding: 6px;">FECHA</th>
                        <th style="border: 1px solid #000; padding: 6px; text-align: right;">MONTO $</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasCotizaciones.length ? filasCotizaciones : '<tr><td colspan="6" style="border: 1px solid #000; padding: 10px; text-align: center;">Sin registros de cotizaciones</td></tr>'}
                </tbody>
            </table>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: -1px;">
                <thead>
                    <tr style="background-color: #f2f2f2; font-weight: bold;">
                        <th style="border: 1px solid #000; padding: 6px; text-align: center;">COTIZACION DOLAR BCV DEL DIA</th>
                        <th style="border: 1px solid #000; padding: 6px; text-align: center;">DEPOSITO (Bs)</th>
                        <th style="border: 1px solid #000; padding: 6px; text-align: center;" colspan="2">Sub Total (Dolares)</th>
                        <th style="border: 1px solid #000; padding: 6px; text-align: right; white-space: nowrap;">${formatUSD(totalSubTotalUSD)}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasAbonos}
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: right;">Total Abono</td>
                        <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: right; white-space: nowrap;">${formatUSD(totalAbonoUSD)}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: right; background-color: #e6e6e6;">Total (Dolares)</td>
                        <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: right; background-color: #e6e6e6; white-space: nowrap;">${formatUSD(saldoPendiente)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

// Render del formato "CONTROL DE CREDITOS MES" (REPORTE MENSUAL)
export function renderizarReporteMensualHTML(nombreMes, cotizaciones = [], tasaBCVActual = 0) {
    let totalBs = 0;
    let totalUSD = 0;
    let totalAbonado = 0;

    const filas = cotizaciones.map(cot => {
        const abonado = cot.montoAbonadoUSD || (cot.montoDeudaUSD - (cot.saldoPendiente ?? cot.montoDeudaUSD)) || 0;
        totalBs += cot.montoDeudaBs || 0;
        totalUSD += cot.montoDeudaUSD || 0;
        totalAbonado += abonado;

        const situacion = cot.saldoPendiente <= 0 ? 'Pagada' : (cot.diasVencidos > 0 ? 'Vencida' : 'Vigente');

        return `
            <tr>
                <td style="border: 1px solid #000; padding: 5px; font-family: monospace;">${cot.numeroFactura || '-'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${formatFechaCorta(cot.fechaEmision)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${cot.diasCredito || 5}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${formatFechaCorta(cot.fechaVencimiento)}</td>
                <td style="border: 1px solid #000; padding: 5px;">${cot.clienteNombre || '-'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; white-space: nowrap;">${cot.montoDeudaBs ? formatBs(cot.montoDeudaBs) : '-'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; white-space: nowrap;">${formatUSD(cot.montoDeudaUSD)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right; white-space: nowrap; font-weight: bold;">${formatUSD(abonado)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${cot.diasVencidos > 0 ? `-${cot.diasVencidos}` : '-'}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${situacion}</td>
            </tr>
        `;
    }).join('');

    return `
        <div style="font-family: Arial, sans-serif; color: #000; width: 100%; padding: 10px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000;">
                <thead>
                    <!-- Encabezado del Mes abarcando las 10 Columnas -->
                    <tr>
                        <td colspan="10" style="border: 1px solid #000; padding: 10px; text-align: center; background-color: #ffffff;">
                            <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                CONTROL DE CREDITOS ${nombreMes.toUpperCase()}
                            </h2>
                        </td>
                    </tr>
                    <!-- Fila con Títulos de las Columnas -->
                    <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                        <th style="border: 1px solid #000; padding: 6px;">No. FACTURA</th>
                        <th style="border: 1px solid #000; padding: 6px;">EMISION</th>
                        <th style="border: 1px solid #000; padding: 6px;">CREDITO</th>
                        <th style="border: 1px solid #000; padding: 6px;">VENCE</th>
                        <th style="border: 1px solid #000; padding: 6px;">CLIENTE</th>
                        <th style="border: 1px solid #000; padding: 6px;">DEUDA Bs</th>
                        <th style="border: 1px solid #000; padding: 6px;">DEUDA $</th>
                        <th style="border: 1px solid #000; padding: 6px;">ABONADO $</th>
                        <th style="border: 1px solid #000; padding: 6px;">DIAS</th>
                        <th style="border: 1px solid #000; padding: 6px;">SITUACION</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas.length ? filas : '<tr><td colspan="10" style="border: 1px solid #000; padding: 10px; text-align: center;">No hay cotizaciones registradas</td></tr>'}
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold; background-color: #e6e6e6;">
                        <td colspan="5" style="border: 1px solid #000; padding: 6px; text-align: right;">TOTALES:</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right; white-space: nowrap;">${formatBs(totalBs)}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right; white-space: nowrap;">${formatUSD(totalUSD)}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right; white-space: nowrap;">${formatUSD(totalAbonado)}</td>
                        <td colspan="2" style="border: 1px solid #000;"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}