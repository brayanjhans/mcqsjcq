import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { LOGO_MQS_B64, LOGO_JCQ_B64 } from "@/lib/utils/pdfAssets";

interface ExportData {
    columns: { key: string; label: string }[];
    data: any[];
    title: string;
    subtitle?: string;
}

export const exportToPDF = ({ columns, data, title, subtitle }: ExportData) => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    try {
        doc.addImage(LOGO_MQS_B64, 'PNG', 14, 6, 20, 12);
        doc.addImage(LOGO_JCQ_B64, 'PNG', pageW - 34, 6, 20, 12);
    } catch (e) {
        console.warn("Could not load logos into PDF", e);
    }

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 28);

    if (subtitle) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(subtitle, 14, 36);
    }

    // Define columns for autoTable
    const tableColumns = columns.map((col) => ({
        header: col.label,
        dataKey: col.key,
    }));

    // Generate table
    autoTable(doc, {
        head: [tableColumns.map((c) => c.header)],
        body: data.map((row) => tableColumns.map((c) => row[c.dataKey])),
        startY: subtitle ? 40 : 30,
        theme: "striped",
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 10, cellPadding: 3 },
    });

    // Footer date
    const date = new Date().toLocaleString();
    doc.setFontSize(10);
    doc.text(`Generado el: ${date}`, 14, doc.internal.pageSize.height - 10);

    doc.save(`${title.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.pdf`);
};

export const exportToExcel = ({ columns, data, title }: ExportData) => {
    // Map data to match column labels
    const excelData = data.map((row) => {
        const newRow: any = {};
        columns.forEach((col) => {
            newRow[col.label] = row[col.key];
        });
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");

    // Generate file
    XLSX.writeFile(
        workbook,
        `${title.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.xlsx`
    );
};

export const exportToCSV = ({ columns, data, title }: ExportData) => {
    // Map data to match column labels
    const csvData = data.map((row) => {
        const newRow: any = {};
        columns.forEach((col) => {
            newRow[col.label] = row[col.key];
        });
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

    // Create blob and download
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
        "download",
        `${title.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
