import "server-only";
import ExcelJS from "exceljs";
import { COMPANY } from "./constants";

export type ExcelColumn = { header: string; key: string; width?: number };

export type ExcelOptions = {
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: ExcelColumn[];
  rows: Record<string, string | number | null | undefined>[];
  summary?: { label: string; value: string | number }[];
  company?: { name: string; address: string };
};

export async function buildExcel(options: ExcelOptions): Promise<Buffer> {
  const company = options.company ?? { name: COMPANY.name, address: COMPANY.address };
  const wb = new ExcelJS.Workbook();
  wb.creator = company.name;
  wb.created = new Date();
  const ws = wb.addWorksheet(options.sheetName, {
    views: [{ state: "frozen", ySplit: 6 }],
  });

  const colCount = options.columns.length;
  ws.mergeCells(1, 1, 1, Math.max(colCount, 2));
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `${company.name} — ${options.title}`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF0B1F42" } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, Math.max(colCount, 2));
  const subCell = ws.getCell(2, 1);
  subCell.value = options.subtitle || `Generated ${new Date().toLocaleString("en-IN")}`;
  subCell.font = { size: 9, color: { argb: "FF6B7280" } };

  ws.getRow(4).height = 20;
  options.columns.forEach((col, index) => {
    const cell = ws.getCell(4, index + 1);
    cell.value = col.header;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F42" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF1F4388" } } };
    ws.getColumn(index + 1).width = col.width ?? 18;
  });

  options.rows.forEach((row, rIndex) => {
    const rowIndex = 5 + rIndex;
    options.columns.forEach((col, cIndex) => {
      const cell = ws.getCell(rowIndex, cIndex + 1);
      cell.value = row[col.key] ?? "";
      cell.font = { size: 9.5 };
      cell.alignment = { vertical: "middle", wrapText: false };
      if (rIndex % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FA" } };
      }
      cell.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } };
    });
  });

  const lastRow = 5 + options.rows.length;
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: colCount } };

  if (options.summary?.length) {
    let r = lastRow + 2;
    options.summary.forEach((s) => {
      const labelCell = ws.getCell(r, Math.max(1, colCount - 1));
      labelCell.value = s.label;
      labelCell.font = { bold: true, size: 10 };
      labelCell.alignment = { horizontal: "right" };
      const valueCell = ws.getCell(r, Math.max(2, colCount));
      valueCell.value = s.value;
      valueCell.font = { bold: true, size: 10, color: { argb: "FF197D4B" } };
      r += 1;
    });
  }

  const footerRow = lastRow + (options.summary?.length ?? 0) + 4;
  ws.mergeCells(footerRow, 1, footerRow, Math.max(colCount, 2));
  ws.getCell(footerRow, 1).value = `${company.name} | ${company.address} | Confidential`;
  ws.getCell(footerRow, 1).font = { size: 8, color: { argb: "FF9CA3AF" } };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
