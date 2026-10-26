import { crearCliente } from '../services/cliente.service.js';
import { registrarAbono } from '../services/abono.service.js';
import { obtenerCotizacionesPorCliente, crearCotizacion, DIAS_CREDITO } from '../services/cotizacion.service.js';
import { obtenerTasaBCV } from '../services/bcv.service.js';
import { formatUSD, round2 } from '../utils/currencyUtils.js';
import { aFecha, getHoy, sumarDias } from '../utils/dateUtils.js';
import { showToast } from '../utils/toast.js';

export function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

export function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

export function configurarModales() {
    const modales = ['modalCliente', 'modalCotizacion', 'modalAbono'];

    modales.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModal(id);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modales.forEach(id => cerrarModal(id));
    });

    document.querySelectorAll('.btn-cerrar-modal, .btn-cancelar').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const modal = this.closest('.modal');
            if (modal) cerrarModal(modal.id);
        });
    });

    document.getElementById('btnNuevoCliente')?.addEventListener('click', () => abrirModal('modalCliente'));
    document.getElementById('btnNuevoClienteDesdeClientes')?.addEventListener('click', () => abrirModal('modalCliente'));
}

/* ------------------------------ CLIENTE ------------------------------ */
export function configurarFormCliente(recargarCallback) {
    const form = document.getElementById('formCliente');
    if (!form || form.dataset.configured) return;
    form.dataset.configured = "true";

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombreEmpresa = document.getElementById('clienteNombre').value.trim();
        const telefono = document.getElementById('clienteTelefono').value.trim();
        const direccion = document.getElementById('clienteDireccion').value.trim();

        if (!nombreEmpresa) {
            showToast('El nombre de la empresa es obligatorio', 'warning');
            return;
        }

        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        try {
            const resultado = await crearCliente({ nombreEmpresa, telefono, direccion });
            if (resultado.success) {
                showToast('Cliente creado exitosamente', 'success');
                form.reset();
                cerrarModal('modalCliente');
                if (typeof recargarCallback === 'function') recargarCallback();
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            console.error('Error al crear cliente:', error);
        } finally {
            btn.disabled = false;
        }
    });
}

/* ----------------------------- COTIZACIÓN ----------------------------- */
export function configurarFormCotizacion(recargarCallback) {
    const form = document.getElementById('formCotizacion');
    if (!form || form.dataset.configured) return;
    form.dataset.configured = "true";

    const fechaEmision = document.getElementById('cotFechaEmision');
    const preview = document.getElementById('cotFechaVencimientoPreview');

    function actualizarVencimiento() {
        if (!fechaEmision.value) {
            preview.textContent = '-';
            return;
        }
        const venc = aFecha(sumarDias(fechaEmision.value, DIAS_CREDITO));
        preview.textContent = venc.toLocaleDateString('es-ES', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }

    fechaEmision.addEventListener('change', actualizarVencimiento);

    document.getElementById('btnNuevaCotizacion')?.addEventListener('click', () => {
        form.reset();
        fechaEmision.value = getHoy();
        actualizarVencimiento();
        abrirModal('modalCotizacion');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const numeroFactura = document.getElementById('cotNumeroFactura').value.trim();
        const clienteSelect = document.getElementById('cotCliente');
        const clienteId = clienteSelect.value;
        const clienteNombre = clienteSelect.selectedOptions[0]?.text || '';
        const montoUSD = parseFloat(document.getElementById('cotMontoUSD').value);
        const montoBs = parseFloat(document.getElementById('cotMontoBs').value) || 0;
        const observaciones = document.getElementById('cotObservaciones').value.trim();

        if (!numeroFactura || !clienteId || !fechaEmision.value || !(montoUSD > 0)) {
            showToast('Por favor completa los campos obligatorios', 'warning');
            return;
        }

        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        try {
            const resultado = await crearCotizacion({
                numeroFactura,
                clienteId,
                clienteNombre,
                fechaEmision: fechaEmision.value,
                montoDeudaBs: montoBs,
                montoDeudaUSD: montoUSD,
                observaciones
            });

            if (resultado.success) {
                showToast('Cotización creada exitosamente', 'success');
                form.reset();
                cerrarModal('modalCotizacion');
                if (typeof recargarCallback === 'function') recargarCallback();
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            console.error('Error al crear cotización:', error);
        } finally {
            btn.disabled = false;
        }
    });
}

/* -------------------------------- ABONO -------------------------------- */
const METODOS_EN_BS = ['Transferencia Nacional', 'Pago Móvil', 'Efectivo Bs'];
const esMetodoBs = (metodo) => METODOS_EN_BS.includes(metodo);

export function configurarFormAbono(recargarCallback) {
    const form = document.getElementById('formAbono');
    if (!form || form.dataset.configured) return;
    form.dataset.configured = "true";

    const selectCliente = document.getElementById('abonoCliente');
    const selectCotizacion = document.getElementById('abonoCotizacion');
    const infoSaldo = document.getElementById('infoSaldo');
    const saldoDisplay = document.getElementById('saldoPendienteDisplay');
    const inputFecha = document.getElementById('abonoFecha');
    const selectMetodo = document.getElementById('abonoMetodo');
    const inputBs = document.getElementById('abonoMontoBs');
    const inputTasa = document.getElementById('abonoTasaBCV');
    const inputUSD = document.getElementById('abonoMonto');
    const btnPagoTotal = document.getElementById('btnPagoTotal');

    let saldoActual = 0;

    // Métodos en Bs: se escribe Bs + tasa y el $ se calcula. Métodos en $: se escribe el $ directo.
    function aplicarModoMetodo() {
        const enBs = esMetodoBs(selectMetodo.value);
        inputBs.disabled = !enBs;
        inputTasa.disabled = !enBs;
        inputUSD.readOnly = enBs;
        if (!enBs) inputBs.value = '';
        else recalcularDesdeBs();
    }

    function recalcularDesdeBs() {
        const bs = parseFloat(inputBs.value);
        const tasa = parseFloat(inputTasa.value);
        inputUSD.value = (bs > 0 && tasa > 0) ? round2(bs / tasa).toFixed(2) : '';
    }

    function actualizarSaldo() {
        const opt = selectCotizacion.options[selectCotizacion.selectedIndex];
        const saldo = opt?.dataset?.saldo;
        if (saldo !== undefined && saldo !== '') {
            saldoActual = parseFloat(saldo);
            saldoDisplay.textContent = formatUSD(saldoActual);
            infoSaldo.classList.remove('hidden');
        } else {
            saldoActual = 0;
            infoSaldo.classList.add('hidden');
        }
    }

    async function cargarCotizacionesDeCliente(clienteId) {
        saldoActual = 0;
        infoSaldo.classList.add('hidden');

        if (!clienteId) {
            selectCotizacion.innerHTML = '<option value="">Primero selecciona un cliente</option>';
            return;
        }
        try {
            const todas = await obtenerCotizacionesPorCliente(clienteId);
            const pendientes = todas.filter(c => c.saldoPendiente > 0);

            if (pendientes.length === 0) {
                selectCotizacion.innerHTML = '<option value="">No hay cotizaciones con saldo pendiente</option>';
                return;
            }

            selectCotizacion.innerHTML = '<option value="">Seleccionar cotización</option>';
            pendientes.forEach(cot => {
                const option = document.createElement('option');
                option.value = cot.id;
                option.textContent = `${cot.numeroFactura} - Saldo: ${formatUSD(cot.saldoPendiente)}`;
                option.dataset.saldo = cot.saldoPendiente;
                selectCotizacion.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar cotizaciones:', error);
            showToast('No se pudieron cargar las cotizaciones del cliente', 'error');
        }
    }

    // Abrir desde el botón "Abono" de la fila
    window.addEventListener('abrirModalAbono', async (event) => {
        const { cotizacionId, clienteId } = event.detail;

        form.reset();
        infoSaldo.classList.add('hidden');
        inputFecha.value = getHoy();
        aplicarModoMetodo();
        abrirModal('modalAbono');

        const tasa = await obtenerTasaBCV();
        inputTasa.value = tasa > 0 ? tasa : '';

        selectCliente.value = clienteId;
        await cargarCotizacionesDeCliente(clienteId);
        selectCotizacion.value = cotizacionId;
        actualizarSaldo();
    });

    selectCliente.addEventListener('change', () => cargarCotizacionesDeCliente(selectCliente.value));
    selectCotizacion.addEventListener('change', actualizarSaldo);
    selectMetodo.addEventListener('change', aplicarModoMetodo);
    inputBs.addEventListener('input', recalcularDesdeBs);
    inputTasa.addEventListener('input', recalcularDesdeBs);

    btnPagoTotal.addEventListener('click', () => {
        if (!(saldoActual > 0)) {
            showToast('Selecciona primero una cotización', 'warning');
            return;
        }
        if (esMetodoBs(selectMetodo.value)) {
            const tasa = parseFloat(inputTasa.value);
            if (!(tasa > 0)) {
                showToast('Ingresa la tasa BCV para calcular el monto en Bs', 'warning');
                return;
            }
            inputBs.value = round2(saldoActual * tasa).toFixed(2);
        }
        inputUSD.value = saldoActual.toFixed(2);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clienteId = selectCliente.value;
        const cotizacionId = selectCotizacion.value;
        const metodo = selectMetodo.value;
        const fecha = inputFecha.value;
        const monto = parseFloat(inputUSD.value);
        const enBs = esMetodoBs(metodo);
        const montoBs = enBs ? (parseFloat(inputBs.value) || 0) : 0;
        const tasa = enBs ? (parseFloat(inputTasa.value) || 0) : 0;

        if (!clienteId || !cotizacionId || !metodo || !fecha) {
            showToast('Completa todos los campos obligatorios', 'warning');
            return;
        }
        if (enBs && !(montoBs > 0 && tasa > 0)) {
            showToast('Ingresa el monto en Bs y la tasa BCV', 'warning');
            return;
        }
        if (!(monto > 0)) {
            showToast('El monto a abonar debe ser mayor a cero', 'warning');
            return;
        }

        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        try {
            const resultado = await registrarAbono({
                clienteId, cotizacionId, monto, montoBs, tasaBCV: tasa, metodo, fecha
            });
            showToast(`Abono registrado. Saldo restante: ${formatUSD(resultado.nuevoSaldo)}`, 'success');
            form.reset();
            cerrarModal('modalAbono');
            if (typeof recargarCallback === 'function') recargarCallback();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            console.error('Error al registrar abono:', error);
        } finally {
            btn.disabled = false;
        }
    });
}