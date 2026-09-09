import { crearCliente } from '../services/cliente.service.js';
import { registrarAbono } from '../services/abono.service.js';
import { obtenerCotizacionesPorCliente, crearCotizacion } from '../services/cotizacion.service.js';
import { formatUSD } from '../utils/currencyUtils.js';
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
        if (e.key === 'Escape') {
            modales.forEach(id => cerrarModal(id));
        }
    });
    
    document.querySelectorAll('.btn-cerrar-modal, .btn-cancelar').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = this.closest('.modal');
            if (modal) cerrarModal(modal.id);
        });
    });
    
    document.getElementById('btnNuevoCliente')?.addEventListener('click', () => abrirModal('modalCliente'));
    document.getElementById('btnNuevoClienteDesdeClientes')?.addEventListener('click', () => abrirModal('modalCliente'));
}

export function configurarFormCliente(recargarCallback) {
    const form = document.getElementById('formCliente');
    if (!form || form.dataset.configured) return;
    form.dataset.configured = "true";

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('clienteNombre').value.trim();
        const telefono = document.getElementById('clienteTelefono').value.trim();
        const direccion = document.getElementById('clienteDireccion').value.trim();
        
        if (!nombre) {
            showToast('El nombre de la empresa es obligatorio', 'warning');
            return;
        }
        
        try {
            const resultado = await crearCliente({ nombre, telefono, direccion });
            
            if (resultado.success) {
                showToast('Cliente creado exitosamente', 'success');
                form.reset();
                cerrarModal('modalCliente');
                
                if (typeof recargarCallback === 'function') {
                    recargarCallback();
                }
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            console.error('Error al crear cliente:', error);
        }
    });
}

export function configurarFormCotizacion(recargarCallback) {
    const form = document.getElementById('formCotizacion');
    if (!form || form.dataset.configured) return;
    form.dataset.configured = "true";
    
    const fechaEmision = document.getElementById('cotFechaEmision');
    const diasCredito = document.getElementById('cotDiasCredito');
    const preview = document.getElementById('cotFechaVencimientoPreview');
    
    function actualizarVencimiento() {
        if (!fechaEmision || !fechaEmision.value) {
            if (preview) preview.textContent = '-';
            return;
        }
        const date = new Date(fechaEmision.value + 'T00:00:00');
        const dias = parseInt(diasCredito.value) || 5;
        date.setDate(date.getDate() + dias);
        
        if (preview) {
            preview.textContent = date.toLocaleDateString('es-ES', { 
                day: '2-digit', month: 'short', year: 'numeric' 
            });
        }
    }

    if (fechaEmision && diasCredito) {
        fechaEmision.addEventListener('change', actualizarVencimiento);
        diasCredito.addEventListener('change', actualizarVencimiento);
    }
    
    document.getElementById('btnNuevaCotizacion')?.addEventListener('click', () => {
        abrirModal('modalCotizacion');
        if (fechaEmision) {
            const hoy = new Date();
            fechaEmision.value = hoy.toISOString().split('T')[0];
            actualizarVencimiento();
        }
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const numeroFactura = document.getElementById('cotNumeroFactura').value.trim();
        const clienteSelect = document.getElementById('cotCliente');
        const clienteId = clienteSelect.value;
        const clienteNombre = clienteSelect.selectedOptions[0]?.text || '';
        const fechaEmisionStr = fechaEmision.value;
        const diasCreditoVal = parseInt(diasCredito.value) || 5;
        const montoBs = parseFloat(document.getElementById('cotMontoBs').value) || 0;
        const montoUSD = parseFloat(document.getElementById('cotMontoUSD').value);
        
        if (!numeroFactura || !clienteId || !fechaEmisionStr || !montoUSD || montoUSD <= 0) {
            showToast('Por favor completa los campos obligatorios', 'warning');
            return;
        }
        
        try {
            const fechaEmisionObj = new Date(fechaEmisionStr + 'T00:00:00');
            
            const resultado = await crearCotizacion({
                numeroFactura,
                clienteId,
                clienteNombre,
                fechaEmision: fechaEmisionObj,
                diasCredito: diasCreditoVal,
                montoDeudaBs: montoBs,
                montoDeudaUSD: montoUSD
            });
            
            if (resultado.success) {
                showToast('Cotización creada exitosamente', 'success');
                form.reset();
                cerrarModal('modalCotizacion');
                if (typeof recargarCallback === 'function') {
                    recargarCallback();
                }
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            console.error('Error al crear cotización:', error);
        }
    });
}

export function configurarFormAbono(recargarCallback) {
    const form = document.getElementById('formAbono');
    if (!form || form.dataset.configured) return;
    form.dataset.configured = "true";

    const selectCliente = document.getElementById('abonoCliente');
    const selectCotizacion = document.getElementById('abonoCotizacion');
    const infoSaldo = document.getElementById('infoSaldo');
    const saldoDisplay = document.getElementById('saldoPendienteDisplay');

    async function cargarCotizacionesDeCliente(clienteId) {
        if (!clienteId) {
            selectCotizacion.innerHTML = '<option value="">Primero selecciona un cliente</option>';
            infoSaldo.classList.add('hidden');
            return [];
        }
        try {
            const cotizaciones = await obtenerCotizacionesPorCliente(clienteId);
            selectCotizacion.innerHTML = '<option value="">Seleccionar cotización</option>';
            cotizaciones.forEach(cot => {
                const option = document.createElement('option');
                option.value = cot.id;
                option.textContent = `${cot.numeroFactura} - Saldo: ${formatUSD(cot.saldoPendiente)}`;
                option.dataset.saldo = cot.saldoPendiente;
                selectCotizacion.appendChild(option);
            });
            if (cotizaciones.length === 0) {
                selectCotizacion.innerHTML = '<option value="">No hay cotizaciones pendientes</option>';
            }
            infoSaldo.classList.add('hidden');
            return cotizaciones;
        } catch (error) {
            console.error('Error al cargar cotizaciones:', error);
            return [];
        }
    }
    
    window.addEventListener('abrirModalAbono', async (event) => {
        const { cotizacionId, clienteId, saldo } = event.detail;
        abrirModal('modalAbono');
        
        if (selectCliente) {
            selectCliente.value = clienteId;
            await cargarCotizacionesDeCliente(clienteId);
            
            if (selectCotizacion) {
                selectCotizacion.value = cotizacionId;
                if (saldoDisplay && infoSaldo) {
                    saldoDisplay.textContent = formatUSD(saldo);
                    infoSaldo.classList.remove('hidden');
                }
            }
        }
    });
    
    selectCliente?.addEventListener('change', function() {
        cargarCotizacionesDeCliente(this.value);
    });
    
    selectCotizacion?.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const saldo = selectedOption?.dataset?.saldo;
        
        if (saldo !== undefined && saldo !== null) {
            saldoDisplay.textContent = formatUSD(parseFloat(saldo));
            infoSaldo.classList.remove('hidden');
        } else {
            infoSaldo.classList.add('hidden');
        }
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const clienteId = selectCliente.value;
        const cotizacionId = selectCotizacion.value;
        const monto = parseFloat(document.getElementById('abonoMonto').value);
        const metodo = document.getElementById('abonoMetodo').value;
        
        if (!clienteId || !cotizacionId || !monto || !metodo || monto <= 0) {
            showToast('Completa todos los campos obligatorios', 'warning');
            return;
        }
        
        try {
            const resultado = await registrarAbono({ clienteId, cotizacionId, monto, metodo });
            showToast(`Abono registrado. Saldo restante: ${formatUSD(resultado.nuevoSaldo)}`, 'success');
            form.reset();
            cerrarModal('modalAbono');
            if (typeof recargarCallback === 'function') {
                recargarCallback();
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            console.error('Error al registrar abono:', error);
        }
    });
}