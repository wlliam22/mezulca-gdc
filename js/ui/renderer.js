import { formatFechaCorta, aFecha, getHoy } from '../utils/dateUtils.js';
import { formatUSD, formatBs } from '../utils/currencyUtils.js';
import { escapeHTML as e } from '../utils/html.js';

/* ============================ COTIZACIONES ============================ */
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
    let totalBs = 0, totalUSD = 0, totalSaldo = 0;

    cotizaciones.forEach(cot => {
        totalBs += cot.montoDeudaBs || 0;
        totalUSD += cot.montoDeudaUSD || 0;
        totalSaldo += cot.saldoPendiente || 0;

        const badgeColor = cot.estatus === 'Pagado' ? 'bg-green-100 text-green-800' :
                           cot.estatus === 'Vencido' ? 'bg-red-100 text-red-800' :
                           'bg-blue-100 text-blue-800';
        const icono = cot.estatus === 'Pagado' ? 'fa-check-circle' :
                      cot.estatus === 'Vencido' ? 'fa-exclamation-circle' : 'fa-clock';

        const obs = cot.observaciones
            ? `<i class="fas fa-comment-dots text-gray-400 ml-1" title="${e(cot.observaciones)}"></i>` : '';

        html += `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-4 py-3 text-sm font-mono whitespace-nowrap">${e(cot.numeroFactura) || '-'}${obs}</td>
                <td class="px-4 py-3 text-sm">${formatFechaCorta(cot.fechaEmision)}</td>
                <td class="px-4 py-3 text-sm text-center">${cot.diasCredito || 5}</td>
                <td class="px-4 py-3 text-sm">${formatFechaCorta(cot.fechaVencimiento)}</td>
                <td class="px-4 py-3 text-sm font-medium">${e(cot.clienteNombre) || '-'}</td>
                <td class="px-4 py-3 text-sm text-right whitespace-nowrap">${cot.montoDeudaBs ? formatBs(cot.montoDeudaBs) : '-'}</td>
                <td class="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">${formatUSD(cot.montoDeudaUSD)}</td>
                <td class="px-4 py-3 text-sm text-right font-bold whitespace-nowrap ${cot.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}">
                    ${formatUSD(cot.saldoPendiente)}
                </td>
                <td class="px-4 py-3 text-sm text-center ${cot.diasVencidos > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}">
                    ${cot.diasVencidos > 0 ? cot.diasVencidos : '-'}
                </td>
                <td class="px-4 py-3 text-sm text-center">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center ${badgeColor}">
                        <i class="fas ${icono} mr-1.5"></i>${e(cot.estatus)}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-center">
                    <div class="flex justify-center gap-2">
                        ${cot.estatus !== 'Pagado' ? `
                            <button type="button" class="btn-abono px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded transition border border-green-200 shadow-sm cursor-pointer"
                                    data-cotizacion-id="${e(cot.id)}"
                                    data-cliente-id="${e(cot.clienteId)}"
                                    data-saldo="${cot.saldoPendiente}">
                                <i class="fas fa-hand-holding-usd mr-1"></i> Abono
                            </button>` : ''}
                        <button type="button" class="btn-eliminar-cotizacion px-2 py-1 text-xs text-gray-400 hover:text-red-600 rounded transition cursor-pointer"
                                data-cotizacion-id="${e(cot.id)}"
                                data-factura="${e(cot.numeroFactura)}" title="Eliminar cotización">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    actualizarTotales({ totalBs, totalUSD, totalSaldo });

    tbody.querySelectorAll('.btn-abono').forEach(btn => {
        btn.addEventListener('click', function () {
            window.dispatchEvent(new CustomEvent('abrirModalAbono', {
                detail: {
                    cotizacionId: this.dataset.cotizacionId,
                    clienteId: this.dataset.clienteId,
                    saldo: parseFloat(this.dataset.saldo)
                }
            }));
        });
    });

    tbody.querySelectorAll('.btn-eliminar-cotizacion').forEach(btn => {
        btn.addEventListener('click', function () {
            window.dispatchEvent(new CustomEvent('eliminarCotizacion', {
                detail: {
                    cotizacionId: this.dataset.cotizacionId,
                    numeroFactura: this.dataset.factura
                }
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

// Consolidado del día: lo cargado hoy
export function renderizarResumenDia(cotizaciones = []) {
    const hoy = getHoy();
    const delDia = cotizaciones.filter(c => c.fechaCarga === hoy);
    const total = delDia.reduce((acc, c) => acc + (c.montoDeudaUSD || 0), 0);

    const cant = document.getElementById('resumenHoyCant');
    const usd = document.getElementById('resumenHoyUSD');
    if (cant) cant.textContent = delDia.length;
    if (usd) usd.textContent = formatUSD(total);
}

/* ============================== CLIENTES ============================== */
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

    container.innerHTML = clientes.map(cliente => {
        const fecha = aFecha(cliente.createdAt);
        return `
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-blue-300 relative group">
            <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0 pr-6">
                    <h4 class="font-bold text-gray-800 truncate" title="${e(cliente.nombreEmpresa)}">${e(cliente.nombreEmpresa)}</h4>
                    ${cliente.telefono ? `
                        <p class="text-sm text-gray-600 mt-1 flex items-center">
                            <i class="fas fa-phone mr-2 text-gray-400 text-xs"></i>${e(cliente.telefono)}
                        </p>` : ''}
                    ${cliente.direccion ? `
                        <p class="text-sm text-gray-600 mt-0.5 flex items-center">
                            <i class="fas fa-map-marker-alt mr-2 text-gray-400 text-xs"></i>${e(cliente.direccion)}
                        </p>` : ''}
                </div>
                <button type="button"
                        class="btn-eliminar-cliente text-gray-400 hover:text-red-600 p-1.5 rounded transition cursor-pointer"
                        data-cliente-id="${e(cliente.id)}"
                        data-cliente-nombre="${e(cliente.nombreEmpresa)}"
                        title="Desactivar cliente">
                    <i class="fas fa-trash-alt text-sm"></i>
                </button>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                <span class="font-mono text-[10px]">ID: ${e(cliente.id.slice(0, 8))}...</span>
                <span>
                    <i class="fas fa-calendar-alt mr-1"></i>
                    ${fecha ? fecha.toLocaleDateString('es-ES') : 'Reciente'}
                </span>
            </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.btn-eliminar-cliente').forEach(btn => {
        btn.addEventListener('click', function () {
            window.dispatchEvent(new CustomEvent('eliminarCliente', {
                detail: { clienteId: this.dataset.clienteId, clienteNombre: this.dataset.clienteNombre }
            }));
        });
    });
}

/* ========================= REPORTE POR CLIENTE ========================= */
// Formato "RESUMEN CLIENTE 2026"
export function renderizarReporteClienteHTML(nombreCliente, cotizaciones = [], abonos = []) {
    const td = 'border: 1px solid #000; padding: 5px;';
    let totalSubTotalUSD = 0;
    let totalAbonoUSD = 0;

    const filasCotizaciones = cotizaciones.map((cot, index) => {
        totalSubTotalUSD += (cot.montoDeudaUSD || 0);

        const status = (cot.saldoPendiente || 0) <= 0 ? 'PAGADA'
                     : (cot.montoPagadoUSD || 0) > 0 ? 'ABONO'
                     : 'PENDIENTE';

        return `
            <tr>
                <td style="${td} text-align: center;">${index + 1}</td>
                <td style="${td} font-family: monospace;">${e(cot.numeroFactura) || '-'}</td>
                <td style="${td} text-align: center;">${e(cot.observaciones) || '-'}</td>
                <td style="${td} text-align: center;">${status}</td>
                <td style="${td} text-align: center;">${formatFechaCorta(cot.fechaEmision)}</td>
                <td style="${td} text-align: right; white-space: nowrap;">${formatUSD(cot.montoDeudaUSD)}</td>
            </tr>
        `;
    }).join('');

    const filasAbonos = abonos.map(ab => {
        const montoUSD = Number(ab.montoUSD ?? ab.montoAbonadoUSD ?? 0);
        totalAbonoUSD += montoUSD;

        return `
            <tr>
                <td style="${td} text-align: center;">${ab.tasaBCV ? formatBs(ab.tasaBCV).replace('Bs ', '') : '-'}</td>
                <td style="${td} text-align: right; white-space: nowrap;">${ab.montoBs ? formatBs(ab.montoBs) : '-'}</td>
                <td style="${td} text-align: center;">
                    ABONO${ab.metodoPago ? ` (${e(ab.metodoPago)})` : ''}
                    <button type="button" class="btn-anular-abono no-print" data-abono-id="${e(ab.id)}"
                            title="Anular abono" style="margin-left: 6px; color: #dc2626; cursor: pointer; border: none; background: none;">✕</button>
                </td>
                <td style="${td} text-align: center;">${formatFechaCorta(ab.fechaAbono || ab.fecha)}</td>
                <td style="${td} text-align: right; white-space: nowrap;">${formatUSD(montoUSD)}</td>
            </tr>
        `;
    }).join('');

    const saldoPendiente = totalSubTotalUSD - totalAbonoUSD;
    const hoy = new Date();

    return `
        <div style="font-family: Arial, sans-serif; color: #000; width: 100%; max-width: 900px; margin: 0 auto; padding: 10px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #000;">
                <thead>
                    <tr>
                        <td colspan="6" style="${td} padding: 10px; background-color: #ffffff;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                    RESUMEN ${e(nombreCliente)} ${hoy.getFullYear()}
                                </h2>
                                <div style="font-size: 12px; text-align: right;">
                                    Fecha de Elaboración: <strong>${hoy.toLocaleDateString('es-ES')}</strong>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                        <th style="${td} width: 50px;">ITEM</th>
                        <th style="${td}">No COTIZACION</th>
                        <th style="${td}">DESPACHO MANUAL</th>
                        <th style="${td}">STATUS</th>
                        <th style="${td}">FECHA</th>
                        <th style="${td} text-align: right;">MONTO $</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasCotizaciones || `<tr><td colspan="6" style="${td} padding: 10px; text-align: center;">Sin registros de cotizaciones</td></tr>`}
                </tbody>
            </table>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: -1px;">
                <thead>
                    <tr style="background-color: #f2f2f2; font-weight: bold;">
                        <th style="${td} text-align: center;">COTIZACION DOLAR BCV DEL DIA</th>
                        <th style="${td} text-align: center;">DEPOSITO (Bs)</th>
                        <th style="${td} text-align: center;" colspan="2">Sub Total (Dolares)</th>
                        <th style="${td} text-align: right; white-space: nowrap;">${formatUSD(totalSubTotalUSD)}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasAbonos}
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="${td} font-weight: bold; text-align: right;">Total Abono</td>
                        <td style="${td} font-weight: bold; text-align: right; white-space: nowrap;">${formatUSD(totalAbonoUSD)}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="${td} font-weight: bold; text-align: right; background-color: #e6e6e6;">Total (Dolares)</td>
                        <td style="${td} font-weight: bold; text-align: right; background-color: #e6e6e6; white-space: nowrap;">${formatUSD(saldoPendiente)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

/* ========================== REPORTE MENSUAL =========================== */
// Formato "CONTROL DE CREDITOS MES"
export function renderizarReporteMensualHTML(nombreMes, cotizaciones = []) {
    const td = 'border: 1px solid #000; padding: 5px;';
    let totalBs = 0, totalUSD = 0, totalAbonado = 0;

    const filas = cotizaciones.map(cot => {
        const abonado = Number(cot.montoPagadoUSD) || 0;
        totalBs += cot.montoDeudaBs || 0;
        totalUSD += cot.montoDeudaUSD || 0;
        totalAbonado += abonado;

        const situacion = cot.estatus === 'Pagado' ? 'Pagada' : cot.estatus === 'Vencido' ? 'Vencida' : 'Vigente';

        return `
            <tr>
                <td style="${td} font-family: monospace;">${e(cot.numeroFactura) || '-'}</td>
                <td style="${td} text-align: center;">${formatFechaCorta(cot.fechaEmision)}</td>
                <td style="${td} text-align: center;">${cot.diasCredito || 5}</td>
                <td style="${td} text-align: center;">${formatFechaCorta(cot.fechaVencimiento)}</td>
                <td style="${td}">${e(cot.clienteNombre) || '-'}</td>
                <td style="${td} text-align: right; white-space: nowrap;">${cot.montoDeudaBs ? formatBs(cot.montoDeudaBs) : '-'}</td>
                <td style="${td} text-align: right; white-space: nowrap;">${formatUSD(cot.montoDeudaUSD)}</td>
                <td style="${td} text-align: right; white-space: nowrap; font-weight: bold;">${abonado > 0 ? formatUSD(abonado) : '-'}</td>
                <td style="${td} text-align: center;">${cot.diasVencidos > 0 ? `-${cot.diasVencidos}` : '-'}</td>
                <td style="${td} text-align: center;">${situacion}</td>
            </tr>
        `;
    }).join('');

    return `
        <div style="font-family: Arial, sans-serif; color: #000; width: 100%; padding: 10px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000;">
                <thead>
                    <tr>
                        <td colspan="10" style="${td} padding: 10px; text-align: center; background-color: #ffffff;">
                            <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                                CONTROL DE CREDITOS ${e(nombreMes).toUpperCase()}
                            </h2>
                        </td>
                    </tr>
                    <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                        <th style="${td}">No. FACTURA</th>
                        <th style="${td}">EMISION</th>
                        <th style="${td}">CREDITO</th>
                        <th style="${td}">VENCE</th>
                        <th style="${td}">CLIENTE</th>
                        <th style="${td}">DEUDA Bs</th>
                        <th style="${td}">DEUDA $</th>
                        <th style="${td}">ABONADO $</th>
                        <th style="${td}">DIAS</th>
                        <th style="${td}">SITUACION</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas || `<tr><td colspan="10" style="${td} padding: 10px; text-align: center;">No hay cotizaciones registradas</td></tr>`}
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold; background-color: #e6e6e6;">
                        <td colspan="5" style="${td} text-align: right;">TOTALES:</td>
                        <td style="${td} text-align: right; white-space: nowrap;">${formatBs(totalBs)}</td>
                        <td style="${td} text-align: right; white-space: nowrap;">${formatUSD(totalUSD)}</td>
                        <td style="${td} text-align: right; white-space: nowrap;">${formatUSD(totalAbonado)}</td>
                        <td colspan="2" style="${td}"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}