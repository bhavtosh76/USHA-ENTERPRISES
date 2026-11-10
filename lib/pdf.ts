import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { COMPANY } from "./constants";
import { formatDate, formatINR } from "./utils";

const A4: [number, number] = [595.28, 841.89];
const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
const MARGIN = 36;

const NAVY = rgb(0.043, 0.122, 0.259);
const NAVY_SOFT = rgb(0.09, 0.165, 0.337);
const GREEN = rgb(0.098, 0.49, 0.31);
const GREY = rgb(0.42, 0.45, 0.5);
const LIGHT = rgb(0.96, 0.97, 0.98);
const BORDER = rgb(0.85, 0.87, 0.9);
const DARK = rgb(0.1, 0.12, 0.16);
const WHITE = rgb(1, 1, 1);

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/₹/g, "Rs. ")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const value = clean(text);
  if (!value) return [""];
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        line = chunk;
      } else line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export type PdfColumn = {
  header: string;
  weight: number;
  align?: "left" | "right" | "center";
};

export type TablePdfOptions = {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: (string | number | null | undefined)[][];
  meta?: { label: string; value: string }[];
  summary?: { label: string; value: string | number }[];
  orientation?: "portrait" | "landscape";
  footerNote?: string;
  company?: { name: string; tagline?: string; address: string };
};

export async function buildTablePdf(options: TablePdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const company = options.company ?? COMPANY;
  const size = options.orientation === "landscape" ? A4_LANDSCAPE : A4;
  const contentWidth = size[0] - MARGIN * 2;

  const totalWeight = options.columns.reduce((s, c) => s + c.weight, 0);
  const colWidths = options.columns.map((c) => (c.weight / totalWeight) * contentWidth);

  let page: PDFPage = doc.addPage(size);
  let y = 0;

  const drawHeader = (p: PDFPage, pageNumber: number) => {
    const h = size[1];
    p.drawRectangle({ x: 0, y: h - 92, width: size[0], height: 92, color: NAVY });
    p.drawRectangle({ x: 0, y: h - 96, width: size[0], height: 4, color: GREEN });
    p.drawText(clean(company.name), { x: MARGIN, y: h - 40, size: 17, font: bold, color: WHITE });
    p.drawText(clean(company.tagline || COMPANY.tagline), { x: MARGIN, y: h - 56, size: 8.5, font, color: rgb(0.72, 0.8, 0.92) });
    p.drawText(clean(company.address), { x: MARGIN, y: h - 69, size: 7.5, font, color: rgb(0.65, 0.73, 0.86) });

    const titleWidth = bold.widthOfTextAtSize(clean(options.title), 12);
    p.drawText(clean(options.title).toUpperCase(), {
      x: size[0] - MARGIN - titleWidth,
      y: h - 40,
      size: 12,
      font: bold,
      color: WHITE,
    });
    const sub = clean(options.subtitle || formatDate(new Date()));
    const subWidth = font.widthOfTextAtSize(sub, 8);
    p.drawText(sub, { x: size[0] - MARGIN - subWidth, y: h - 56, size: 8, font, color: rgb(0.72, 0.8, 0.92) });
    const pageText = `Page ${pageNumber}`;
    const pageWidth = font.widthOfTextAtSize(pageText, 7.5);
    p.drawText(pageText, { x: size[0] - MARGIN - pageWidth, y: h - 69, size: 7.5, font, color: rgb(0.65, 0.73, 0.86) });
    return h - 92 - 22;
  };

  let pageNumber = 1;
  y = drawHeader(page, pageNumber);

  if (options.meta?.length) {
    const metaText = options.meta.map((m) => `${m.label}: ${clean(m.value)}`).join("    |    ");
    for (const line of wrap(metaText, font, 8, contentWidth)) {
      page.drawText(line, { x: MARGIN, y, size: 8, font, color: GREY });
      y -= 12;
    }
    y -= 4;
  }

  const headerHeight = 24;
  const drawTableHead = (p: PDFPage, top: number) => {
    p.drawRectangle({ x: MARGIN, y: top - headerHeight, width: contentWidth, height: headerHeight, color: NAVY_SOFT });
    let x = MARGIN;
    options.columns.forEach((col, i) => {
      const w = colWidths[i];
      const text = clean(col.header);
      const textWidth = bold.widthOfTextAtSize(text, 8);
      const tx = col.align === "right" ? x + w - 6 - textWidth : col.align === "center" ? x + (w - textWidth) / 2 : x + 6;
      p.drawText(text, { x: tx, y: top - 16, size: 8, font: bold, color: WHITE });
      x += w;
    });
    return top - headerHeight;
  };

  y = drawTableHead(page, y);

  const rowSize = 8;
  const lineHeight = 10.5;
  let zebra = false;

  for (const row of options.rows) {
    const cellLines = row.map((cell, i) =>
      wrap(String(cell ?? ""), font, rowSize, colWidths[i] - 12),
    );
    const maxLines = Math.max(1, ...cellLines.map((l) => l.length));
    const rowHeight = maxLines * lineHeight + 8;

    if (y - rowHeight < MARGIN + 40) {
      page = doc.addPage(size);
      pageNumber += 1;
      y = drawHeader(page, pageNumber);
      y = drawTableHead(page, y);
      zebra = false;
    }

    if (zebra) {
      page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: contentWidth, height: rowHeight, color: LIGHT });
    }
    page.drawLine({
      start: { x: MARGIN, y: y - rowHeight },
      end: { x: MARGIN + contentWidth, y: y - rowHeight },
      thickness: 0.4,
      color: BORDER,
    });

    let x = MARGIN;
    cellLines.forEach((lines, i) => {
      const w = colWidths[i];
      const align = options.columns[i].align ?? "left";
      lines.forEach((line, li) => {
        const textWidth = font.widthOfTextAtSize(line, rowSize);
        const tx = align === "right" ? x + w - 6 - textWidth : align === "center" ? x + (w - textWidth) / 2 : x + 6;
        page.drawText(line, {
          x: tx,
          y: y - 15 - li * lineHeight,
          size: rowSize,
          font,
          color: DARK,
        });
      });
      x += w;
    });
    y -= rowHeight;
    zebra = !zebra;
  }

  if (!options.rows.length) {
    page.drawText("No records found for the selected filters.", {
      x: MARGIN + 6,
      y: y - 18,
      size: 9,
      font,
      color: GREY,
    });
    y -= 32;
  }

  if (options.summary?.length) {
    if (y < MARGIN + 100) {
      page = doc.addPage(size);
      pageNumber += 1;
      y = drawHeader(page, pageNumber);
    }
    y -= 16;
    const boxWidth = 260;
    const boxX = MARGIN + contentWidth - boxWidth;
    const boxHeight = options.summary.length * 16 + 14;
    page.drawRectangle({ x: boxX, y: y - boxHeight, width: boxWidth, height: boxHeight, color: rgb(0.93, 0.97, 0.94), borderColor: rgb(0.75, 0.88, 0.79), borderWidth: 0.6 });
    let sy = y - 18;
    options.summary.forEach((s, i) => {
      const isLast = i === options.summary!.length - 1;
      page.drawText(clean(s.label), { x: boxX + 10, y: sy, size: 8.5, font: isLast ? bold : font, color: DARK });
      const val = clean(String(s.value));
      const vw = (isLast ? bold : font).widthOfTextAtSize(val, 8.5);
      page.drawText(val, { x: boxX + boxWidth - 10 - vw, y: sy, size: 8.5, font: isLast ? bold : font, color: isLast ? GREEN : DARK });
      sy -= 16;
    });
    y -= boxHeight + 8;
  }

  const pages = doc.getPages();
  pages.forEach((p, idx) => {
    const note = clean(options.footerNote || `${company.name} - Confidential business document`);
    p.drawText(note, { x: MARGIN, y: 22, size: 7, font, color: GREY });
    const stamp = clean(`Generated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
    const w = font.widthOfTextAtSize(stamp, 7);
    p.drawText(stamp, { x: size[0] - MARGIN - w, y: 22, size: 7, font, color: GREY });
    const pn = `Page ${idx + 1} of ${pages.length}`;
    const pw = font.widthOfTextAtSize(pn, 7);
    p.drawText(pn, { x: (size[0] - pw) / 2, y: 22, size: 7, font, color: GREY });
  });

  return doc.save();
}

export type SalarySlipInput = {
  slipNo: string;
  monthLabel: string;
  staff: {
    fullName: string;
    employeeId: string;
    designation: string;
    department?: string | null;
    mobile: string;
    bankName?: string | null;
    bankAccount?: string | null;
    joiningDate: Date | string;
  };
  salary: {
    fixedSalary: number;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    paidLeave: number;
    unpaidLeave: number;
    overtimeHours: number;
    overtimeAmount: number;
    incentive: number;
    commission: number;
    advance: number;
    otherDeduction: number;
    grossSalary: number;
    netSalary: number;
    status: string;
    paidAt?: Date | string | null;
    paymentMode?: string | null;
  };
  company?: { name: string; tagline?: string; address: string };
};

export async function buildSalarySlipPdf(input: SalarySlipInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const company = input.company ?? COMPANY;
  const page = doc.addPage(A4);
  const { width, height } = page.getSize();
  const contentWidth = width - MARGIN * 2;

  page.drawRectangle({ x: 0, y: height - 104, width, height: 104, color: NAVY });
  page.drawRectangle({ x: 0, y: height - 108, width, height: 4, color: GREEN });
  page.drawText(clean(company.name), { x: MARGIN, y: height - 42, size: 19, font: bold, color: WHITE });
  page.drawText(clean(company.tagline || COMPANY.tagline), { x: MARGIN, y: height - 58, size: 8.5, font, color: rgb(0.72, 0.8, 0.92) });
  page.drawText(clean(company.address), { x: MARGIN, y: height - 72, size: 7.5, font, color: rgb(0.65, 0.73, 0.86) });
  page.drawText("SALARY SLIP", { x: MARGIN, y: height - 94, size: 12, font: bold, color: WHITE });
  const monthText = clean(input.monthLabel);
  const mw = bold.widthOfTextAtSize(monthText, 11);
  page.drawText(monthText, { x: width - MARGIN - mw, y: height - 94, size: 11, font: bold, color: rgb(0.75, 0.95, 0.82) });
  const slipText = clean(`Slip No: ${input.slipNo}`);
  const sw = font.widthOfTextAtSize(slipText, 8);
  page.drawText(slipText, { x: width - MARGIN - sw, y: height - 62, size: 8, font, color: rgb(0.72, 0.8, 0.92) });

  let y = height - 132;
  page.drawText("EMPLOYEE DETAILS", { x: MARGIN, y, size: 8.5, font: bold, color: GREEN });
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.8, color: BORDER });
  y -= 18;

  const left = [
    ["Employee Name", input.staff.fullName],
    ["Employee ID", input.staff.employeeId],
    ["Designation", input.staff.designation],
    ["Department", input.staff.department || "-"],
  ];
  const right = [
    ["Mobile", input.staff.mobile],
    ["Joining Date", formatDate(input.staff.joiningDate)],
    ["Bank", input.staff.bankName || "-"],
    ["Account No.", input.staff.bankAccount ? `XXXX${input.staff.bankAccount.slice(-4)}` : "-"],
  ];
  const colX = [MARGIN, MARGIN + contentWidth / 2];
  for (let i = 0; i < 4; i++) {
    [left[i], right[i]].forEach((pair, c) => {
      page.drawText(clean(pair[0]), { x: colX[c], y, size: 8, font, color: GREY });
      page.drawText(clean(pair[1]), { x: colX[c] + 92, y, size: 8.5, font: bold, color: DARK });
    });
    y -= 18;
  }

  y -= 6;
  page.drawText("ATTENDANCE & SALARY PERIOD", { x: MARGIN, y, size: 8.5, font: bold, color: GREEN });
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.8, color: BORDER });
  y -= 16;
  const att = [
    `Working Days: ${input.salary.workingDays}`,
    `Present: ${input.salary.presentDays}`,
    `Absent: ${input.salary.absentDays}`,
    `Paid Leave: ${input.salary.paidLeave}`,
    `Unpaid Leave: ${input.salary.unpaidLeave}`,
    `Overtime: ${input.salary.overtimeHours} hrs`,
  ].join("     ");
  page.drawText(clean(att), { x: MARGIN, y, size: 8.5, font, color: DARK });
  y -= 26;

  const tableX = MARGIN;
  const tableW = contentWidth;
  const half = tableW / 2;
  const drawSectionHead = (x: number, w: number, label: string, color = NAVY_SOFT) => {
    page.drawRectangle({ x, y: y - 22, width: w, height: 22, color });
    page.drawText(label, { x: x + 10, y: y - 15, size: 9, font: bold, color: WHITE });
  };
  drawSectionHead(tableX, half, "EARNINGS");
  drawSectionHead(tableX + half, half, "DEDUCTIONS", rgb(0.45, 0.16, 0.18));
  const topY = y - 22;

  const earnings: [string, number][] = [
    ["Basic / Fixed Salary", input.salary.fixedSalary],
    ["Overtime", input.salary.overtimeAmount],
    ["Incentive", input.salary.incentive],
    ["Commission", input.salary.commission],
  ];
  const deductions: [string, number][] = [
    ["Absent Deduction", Math.max(0, input.salary.grossSalary - input.salary.fixedSalary - input.salary.overtimeAmount - input.salary.incentive - input.salary.commission)],
    ["Unpaid Leave Deduction", 0],
    ["Advance Salary", input.salary.advance],
    ["Other Deductions", input.salary.otherDeduction],
  ];

  let ry = topY - 18;
  for (let i = 0; i < Math.max(earnings.length, deductions.length); i++) {
    if (i % 2 === 0) {
      page.drawRectangle({ x: tableX, y: ry - 8, width: tableW, height: 24, color: LIGHT });
    }
    if (earnings[i]) {
      page.drawText(clean(earnings[i][0]), { x: tableX + 10, y: ry, size: 8.5, font, color: DARK });
      const v = clean(formatINR(earnings[i][1]));
      const vw = font.widthOfTextAtSize(v, 8.5);
      page.drawText(v, { x: tableX + half - 12 - vw, y: ry, size: 8.5, font, color: DARK });
    }
    if (deductions[i]) {
      page.drawText(clean(deductions[i][0]), { x: tableX + half + 10, y: ry, size: 8.5, font, color: DARK });
      const v = clean(formatINR(deductions[i][1]));
      const vw = font.widthOfTextAtSize(v, 8.5);
      page.drawText(v, { x: tableX + tableW - 12 - vw, y: ry, size: 8.5, font, color: DARK });
    }
    ry -= 24;
  }

  const totalDeductions = input.salary.advance + input.salary.otherDeduction + deductions[0][1];
  page.drawLine({ start: { x: tableX, y: ry + 4 }, end: { x: tableX + tableW, y: ry + 4 }, thickness: 0.6, color: BORDER });
  page.drawText("Gross Earnings", { x: tableX + 10, y: ry - 8, size: 9, font: bold, color: DARK });
  const gross = clean(formatINR(input.salary.grossSalary));
  page.drawText(gross, { x: tableX + half - 12 - bold.widthOfTextAtSize(gross, 9), y: ry - 8, size: 9, font: bold, color: DARK });
  page.drawText("Total Deductions", { x: tableX + half + 10, y: ry - 8, size: 9, font: bold, color: DARK });
  const ded = clean(formatINR(totalDeductions));
  page.drawText(ded, { x: tableX + tableW - 12 - bold.widthOfTextAtSize(ded, 9), y: ry - 8, size: 9, font: bold, color: DARK });

  ry -= 36;
  page.drawRectangle({ x: tableX, y: ry - 44, width: tableW, height: 44, color: rgb(0.93, 0.97, 0.94), borderColor: rgb(0.7, 0.86, 0.75), borderWidth: 0.8 });
  page.drawText("NET PAYABLE", { x: tableX + 14, y: ry - 27, size: 11, font: bold, color: rgb(0.05, 0.35, 0.2) });
  const net = clean(formatINR(input.salary.netSalary));
  page.drawText(net, { x: tableX + tableW - 14 - bold.widthOfTextAtSize(net, 15), y: ry - 30, size: 15, font: bold, color: GREEN });

  ry -= 70;
  page.drawText(clean(`Status: ${input.salary.status}${input.salary.paidAt ? `  |  Paid on ${formatDate(input.salary.paidAt)} (${input.salary.paymentMode || "BANK"})` : ""}`), {
    x: MARGIN,
    y: ry,
    size: 8.5,
    font,
    color: GREY,
  });

  ry -= 50;
  page.drawLine({ start: { x: MARGIN, y: ry }, end: { x: MARGIN + 150, y: ry }, thickness: 0.6, color: GREY });
  page.drawLine({ start: { x: width - MARGIN - 150, y: ry }, end: { x: width - MARGIN, y: ry }, thickness: 0.6, color: GREY });
  page.drawText("Employee Signature", { x: MARGIN, y: ry - 14, size: 8, font, color: GREY });
  page.drawText("Authorised Signatory", { x: width - MARGIN - 150, y: ry - 14, size: 8, font, color: GREY });

  page.drawText("This is a computer generated salary slip. Deductions are calculated from recorded attendance and payroll rules.", {
    x: MARGIN,
    y: 42,
    size: 7.5,
    font,
    color: GREY,
  });
  page.drawText(clean(`${company.name} | ${company.address}`), { x: MARGIN, y: 30, size: 7, font, color: GREY });

  return doc.save();
}
