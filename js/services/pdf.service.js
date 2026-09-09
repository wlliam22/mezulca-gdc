/**
 * Servicio para generación de reportes en PDF usando jsPDF y AutoTable
 */
export function generarReportePDF(cotizaciones = [], filtros = {}) {
    if (!window.jspdf) {
        console.error("La librería jsPDF no está cargada.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // --- Encabezado ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("MEZULCAGDC - REPORTE DE CONTROL DE CRÉDITOS", 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-VE')}`, 14, 22);
    
    if (filtros.mes) doc.text(`Mes de Corte: ${filtros.mes}`, 14, 27);
    if (filtros.clienteNombre && filtros.clienteNombre !== 'Todos') {
        doc.text(`Cliente: ${filtros.clienteNombre}`, 100, 27);
    }

    // --- Filas de la Tabla ---
    const tableRows = cotizaciones.map(c => {
        const saldo = (c.montoDeudaUSD || 0) - (c.montoPagadoUSD || 0);
        return [
            c.numeroFactura || 'N/A',
            c.clienteNombre || 'Sin Nombre',
            c.fechaEmision ? new Date(c.fechaEmision).toLocaleDateString('es-VE') : '-',
            c.fechaVencimiento ? new Date(c.fechaVencimiento).toLocaleDateString('es-VE') : '-',
            `$${(c.montoDeudaUSD || 0).toFixed(2)}`,
            `$${(c.montoPagadoUSD || 0).toFixed(2)}`,
            `$${saldo.toFixed(2)}`,
            c.estatus || 'Vigente'
        ];
    });

    // --- Renderizado de Tabla ---
    doc.autoTable({
        startY: 32,
        head: [['N° Factura', 'Cliente', 'Emisión', 'Vencimiento', 'Monto ($)', 'Pagado ($)', 'Saldo ($)', 'Estatus']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [31, 41, 55], textColor: 255 }, // Gris oscuro Tailwind
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' }
        }
    });

    // --- Totales Acumulados ---
    const totalDeuda = cotizaciones.reduce((acc, curr) => acc + (curr.montoDeudaUSD || 0), 0);
    const totalPagado = cotizaciones.reduce((acc, curr) => acc + (curr.montoPagadoUSD || 0), 0);
    const totalSaldo = totalDeuda - totalPagado;

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Total Deuda: $${totalDeuda.toFixed(2)}`, 14, finalY);
    doc.text(`Total Pagado: $${totalPagado.toFixed(2)}`, 90, finalY);
    doc.text(`Saldo Pendiente: $${totalSaldo.toFixed(2)}`, 170, finalY);

    // Guardar archivo
    const nombreArchivo = `Reporte_Creditos_${filtros.mes || 'General'}.pdf`;
    doc.save(nombreArchivo);
}