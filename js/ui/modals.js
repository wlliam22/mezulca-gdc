import { crearCliente } from '../services/cliente.service.js';
import { registrarAbono } from '../services/abono.service.js';
import { obtenerCotizacionesPorCliente, crearCotizacion } from '../services/cotizacion.service.js';
import { formatUSD } from '../utils/currencyUtils.js';

// ============================================
// FUNCIONES DE CONTROL DE MODALES
// ============================================

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

// ============================================
// CONFIGURACIÓN DE MODALES
// ============================================

export function configurarModales() {
    const modales = ['modalCliente', 'modalCotizacion', 'modalAbono'];
    
    modales.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarModal(id);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                cerrarModal(id);
            }
        });
    });
    
    document.querySelectorAll('.btn-cerrar-modal, .btn-cancelar, .modal button[type="button"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const modal = this.closest('.modal');
            if (modal) {
                cerrarModal(modal.id);
            }
        });
    });
    
    document.getElementById('btnNuevoCliente')?.addEventListener('click', () => {
        abrirModal('modalCliente');
    });
    
    document.getElementById('btnNuevoClienteDesdeClientes')?.addEventListener('click', () => {
        abrirModal('modalCliente');
    });
}

// ============================================
// FORMULARIO CLIENTE (CORREGIDO)
// ============================================

export function configurarFormCliente(recargarCallback) {
    const form = document.getElementById('formCliente');
    if (!form) {
        console.warn('⚠️ Formulario de cliente no encontrado');
        return;
    }
    
    // Limpiar listeners anteriores
    const nuevoForm = form.cloneNode(true);
    form.parentNode.replaceChild(nuevoForm, form);
    const formFinal = document.getElementById('formCliente');
    
    formFinal.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const nombre = document.getElementById('clienteNombre').value.trim();
        const telefono = document.getElementById('clienteTelefono').value.trim();
        const direccion = document.getElementById('clienteDireccion').value.trim();
        
        if (!nombre) {
            alert('⚠️ El nombre de la empresa es obligatorio');
            return;
        }
        
        try {
            console.log('📝 Creando cliente:', { nombre, telefono, direccion });
            const resultado = await crearCliente({ nombre, telefono, direccion });
            
            if (resultado.success) {
                alert('✅ Cliente creado exitosamente');
                formFinal.reset();
                cerrarModal('modalCliente');
                
                // ✅ FORZAR RECARGA CON setTimeout
                console.log('🔄 Recargando datos después de crear cliente...');
                if (typeof recargarCallback === 'function') {
                    setTimeout(() => {
                        recargarCallback();
                    }, 300);
                }
            }
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
            console.error('Error al crear cliente:', error);
        }
    });
}

// ============================================
// FORMULARIO COTIZACIÓN
// ============================================

export function configurarFormCotizacion(recargarCallback) {
    const form = document.getElementById('formCotizacion');
    if (!form) {
        console.warn('⚠️ Formulario de cotización no encontrado');
        return;
    }
    
    const fechaEmision = document.getElementById('cotFechaEmision');
    const diasCredito = document.getElementById('cotDiasCredito');
    const preview = document.getElementById('cotFechaVencimientoPreview');
    
    if (fechaEmision && diasCredito && preview) {
        function actualizarVencimiento() {
            if (!fechaEmision.value) {
                preview.textContent = '-';
                return;
            }
            const date = new Date(fechaEmision.value);
            const dias = parseInt(diasCredito.value) || 5;
            date.setDate(date.getDate() + dias);
            preview.textContent = date.toLocaleDateString('es-ES', { 
                day: '2-digit', month: 'short', year: 'numeric' 
            });
        }
        fechaEmision.addEventListener('change', actualizarVencimiento);
        diasCredito.addEventListener('change', actualizarVencimiento);
    }
    
    document.getElementById('btnNuevaCotizacion')?.addEventListener('click', () => {
        abrirModal('modalCotizacion');
        if (fechaEmision) {
            // ✅ FORZAR FECHA ACTUAL (2026)
            const hoy = new Date();
            hoy.setFullYear(2026); // Forzar año 2026
            fechaEmision.value = hoy.toISOString().split('T')[0];
            
            // Actualizar preview
            const date = new Date(hoy);
            date.setDate(date.getDate() + 5);
            preview.textContent = date.toLocaleDateString('es-ES', { 
                day: '2-digit', month: 'short', year: 'numeric' 
            });
        }
    });
    
    // Limpiar listeners anteriores
    const nuevoForm = form.cloneNode(true);
    form.parentNode.replaceChild(nuevoForm, form);
    const formFinal = document.getElementById('formCotizacion');
    
    formFinal.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const numeroFactura = document.getElementById('cotNumeroFactura').value.trim();
        const clienteId = document.getElementById('cotCliente').value;
        const clienteNombre = document.getElementById('cotCliente').selectedOptions[0]?.text || '';
        const fechaEmisionStr = document.getElementById('cotFechaEmision').value;
        const diasCreditoVal = parseInt(document.getElementById('cotDiasCredito').value) || 5;
        const montoBs = parseFloat(document.getElementById('cotMontoBs').value) || 0;
        const montoUSD = parseFloat(document.getElementById('cotMontoUSD').value);
        
        // ✅ Validaciones mejoradas
        if (!numeroFactura) {
            alert('⚠️ El número de factura es obligatorio');
            return;
        }
        if (!clienteId) {
            alert('⚠️ Debes seleccionar un cliente');
            return;
        }
        if (!fechaEmisionStr) {
            alert('⚠️ La fecha de emisión es obligatoria');
            return;
        }
        if (!montoUSD || montoUSD <= 0) {
            alert('⚠️ El monto en dólares debe ser mayor a 0');
            return;
        }
        
        try {
            // ✅ CREAR FECHA CORRECTAMENTE (CON AÑO 2026)
            const fechaEmision = new Date(fechaEmisionStr + 'T00:00:00');
            // ✅ FORZAR AÑO 2026 (por si acaso)
            fechaEmision.setFullYear(2026);
            
            console.log('📝 Creando cotización:', {
                numeroFactura,
                clienteId,
                clienteNombre,
                fechaEmision,
                fechaEmisionStr: fechaEmision.toISOString(),
                diasCredito: diasCreditoVal,
                montoBs,
                montoUSD
            });
            
            const resultado = await crearCotizacion({
                numeroFactura,
                clienteId,
                clienteNombre,
                fechaEmision, // ✅ Date object con año 2026
                diasCredito: diasCreditoVal,
                montoDeudaBs: montoBs,
                montoDeudaUSD: montoUSD
            });
            
            if (resultado.success) {
                alert('✅ Cotización creada exitosamente');
                formFinal.reset();
                cerrarModal('modalCotizacion');
                if (typeof recargarCallback === 'function') {
                    setTimeout(() => recargarCallback(), 500);
                }
            }
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
            console.error('Error al crear cotización:', error);
        }
    });
}

// ============================================
// FORMULARIO ABONO
// ============================================

export function configurarFormAbono(recargarCallback) {
    const form = document.getElementById('formAbono');
    if (!form) {
        console.warn('⚠️ Formulario de abono no encontrado');
        return;
    }
    
    window.addEventListener('abrirModalAbono', (event) => {
        const { cotizacionId, clienteId, clienteNombre, saldo } = event.detail;
        abrirModal('modalAbono');
        
        const selectCliente = document.getElementById('abonoCliente');
        const selectCotizacion = document.getElementById('abonoCotizacion');
        const infoSaldo = document.getElementById('infoSaldo');
        const saldoDisplay = document.getElementById('saldoPendienteDisplay');
        
        if (selectCliente) {
            Array.from(selectCliente.options).forEach(opt => {
                if (opt.value === clienteId) {
                    opt.selected = true;
                }
            });
            selectCliente.dispatchEvent(new Event('change'));
            
            setTimeout(() => {
                if (selectCotizacion) {
                    Array.from(selectCotizacion.options).forEach(opt => {
                        if (opt.value === cotizacionId) {
                            opt.selected = true;
                        }
                    });
                    if (saldoDisplay && infoSaldo) {
                        saldoDisplay.textContent = formatUSD(saldo);
                        infoSaldo.classList.remove('hidden');
                    }
                }
            }, 300);
        }
    });
    
    document.getElementById('abonoCliente')?.addEventListener('change', async function() {
        const clienteId = this.value;
        const selectCotizacion = document.getElementById('abonoCotizacion');
        const infoSaldo = document.getElementById('infoSaldo');
        
        if (!clienteId) {
            selectCotizacion.innerHTML = '<option value="">Primero selecciona un cliente</option>';
            infoSaldo.classList.add('hidden');
            return;
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
        } catch (error) {
            console.error('Error al cargar cotizaciones:', error);
        }
    });
    
    document.getElementById('abonoCotizacion')?.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const saldo = selectedOption?.dataset?.saldo;
        const infoSaldo = document.getElementById('infoSaldo');
        const saldoDisplay = document.getElementById('saldoPendienteDisplay');
        
        if (saldo !== undefined && saldo !== null) {
            saldoDisplay.textContent = formatUSD(parseFloat(saldo));
            infoSaldo.classList.remove('hidden');
        } else {
            infoSaldo.classList.add('hidden');
        }
    });
    
    const nuevoForm = form.cloneNode(true);
    form.parentNode.replaceChild(nuevoForm, form);
    const formFinal = document.getElementById('formAbono');
    
    formFinal.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const clienteId = document.getElementById('abonoCliente').value;
        const cotizacionId = document.getElementById('abonoCotizacion').value;
        const monto = parseFloat(document.getElementById('abonoMonto').value);
        const metodo = document.getElementById('abonoMetodo').value;
        
        if (!clienteId || !cotizacionId || !monto || !metodo) {
            alert('⚠️ Por favor, completa todos los campos');
            return;
        }
        if (monto <= 0) {
            alert('⚠️ El monto debe ser mayor a 0');
            return;
        }
        
        try {
            const resultado = await registrarAbono({ clienteId, cotizacionId, monto, metodo });
            alert(`✅ Abono registrado exitosamente\nSaldo restante: ${formatUSD(resultado.nuevoSaldo)}`);
            formFinal.reset();
            cerrarModal('modalAbono');
            if (typeof recargarCallback === 'function') {
                setTimeout(() => recargarCallback(), 300);
            }
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
            console.error('Error al registrar abono:', error);
        }
    });
}