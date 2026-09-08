// Cargar clientes en un select
export function cargarClientesEnSelect(selectId, clientes, placeholder = 'Seleccionar cliente') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const valorActual = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombreEmpresa;
        select.appendChild(option);
    });
    
    // Restaurar valor seleccionado si existe
    if (valorActual) {
        select.value = valorActual;
    }
}