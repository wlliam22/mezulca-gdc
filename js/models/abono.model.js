<!-- Modal de Abono - Versión Simplificada -->
<div id="modalAbono" class="modal hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
            <i class="fas fa-hand-holding-usd text-green-600"></i>
            Registrar Abono
        </h3>
        
        <form id="formAbono">
            <!-- Selector de Cliente -->
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select id="abonoCliente" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required>
                    <option value="">Seleccionar cliente</option>
                </select>
            </div>
            
            <!-- Selector de Cotización (se llena según cliente) -->
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Cotización *</label>
                <select id="abonoCotizacion" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required>
                    <option value="">Primero selecciona un cliente</option>
                </select>
                <div id="infoSaldo" class="mt-1 text-sm text-gray-600 hidden">
                    Saldo pendiente: <span id="saldoPendienteDisplay" class="font-bold text-blue-600">$0.00</span>
                </div>
            </div>
            
            <!-- Monto -->
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Monto a abonar ($) *</label>
                <input type="number" id="abonoMonto" placeholder="0.00" 
                       class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                       step="0.01" min="0.01" required />
            </div>
            
            <!-- Método de Pago -->
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
                <select id="abonoMetodo" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required>
                    <option value="">Seleccionar método</option>
                    <option value="Transferencia Nacional">Transferencia Nacional</option>
                    <option value="Efectivo $">Efectivo ($)</option>
                    <option value="Efectivo Bs">Efectivo (Bs)</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                </select>
            </div>
            
            <!-- Botones -->
            <div class="flex justify-end gap-3">
                <button type="button" class="btn-cerrar-modal px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition">
                    Cancelar
                </button>
                <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                    <i class="fas fa-save"></i> Guardar Abono
                </button>
            </div>
        </form>
    </div>
</div>