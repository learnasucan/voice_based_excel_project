import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { mapRowsToSheetData } from "@/lib/server/export/mappers";
import { ExportRow } from "@/lib/server/export/types";

const resolveMarathiFontPath = (): string | null => {
  const bundledPath = path.join(process.cwd(), "public", "fonts", "NotoSansDevanagari-Regular.ttf");
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  const systemPath = "/System/Library/Fonts/Supplemental/NotoSansDevanagari-Regular.ttf";
  if (fs.existsSync(systemPath)) {
    return systemPath;
  }

  return null;
};

const drawRow = (
  document: PDFKit.PDFDocument,
  row: Array<string | number>,
  y: number,
  columnWidths: number[],
  rowHeight: number
): void => {
  let x = document.page.margins.left;

  row.forEach((value, index) => {
    document.text(String(value), x, y, {
      width: columnWidths[index],
      height: rowHeight,
      ellipsis: true
    });
    x += columnWidths[index];
  });
};

const measureRowHeight = (
  document: PDFKit.PDFDocument,
  row: Array<string | number>,
  columnWidths: number[]
): number => {
  const textHeight = row.reduce<number>((maxHeight, value, index) => {
    const height = Number(
      document.heightOfString(String(value), {
        width: columnWidths[index]
      })
    );

    return Math.max(maxHeight, height);
  }, 0);

  return Math.max(16, Math.ceil(textHeight + 4));
};

export const buildPdf = async (rows: ExportRow[]): Promise<Buffer> => {
  const fontPath = resolveMarathiFontPath();
  const { headers, rows: values, total } = mapRowsToSheetData(rows);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 24,
      size: "A4",
      ...(fontPath ? { font: fontPath } : {})
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(14).text("Aaherpatti Contributions", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9);

    const columnWidths = [42, 110, 110, 70, 90, 90];
    let y = doc.y;
    const headerValues = [...headers];
    const headerHeight = measureRowHeight(doc, headerValues, columnWidths);

    drawRow(doc, headerValues, y, columnWidths, headerHeight);
    y += headerHeight + 4;

    doc.moveTo(doc.page.margins.left, y - 4)
      .lineTo(doc.page.width - doc.page.margins.right, y - 4)
      .stroke();

    for (const row of values) {
      const rowValues = row as Array<string | number>;
      const rowHeight = measureRowHeight(doc, rowValues, columnWidths);

      if (y + rowHeight > doc.page.height - 60) {
        doc.addPage();
        if (fontPath) {
          doc.font(fontPath);
        }
        doc.fontSize(9);
        y = doc.page.margins.top;
        drawRow(doc, headerValues, y, columnWidths, headerHeight);
        y += headerHeight + 4;
      }

      drawRow(doc, rowValues, y, columnWidths, rowHeight);
      y += rowHeight + 3;
    }

    y += 4;
    doc.moveTo(doc.page.margins.left, y)
      .lineTo(doc.page.width - doc.page.margins.right, y)
      .stroke();
    y += 6;

    const totalRow: Array<string | number> = ["TOTAL", "", "", total, "", ""];
    const totalHeight = measureRowHeight(doc, totalRow, columnWidths);
    drawRow(doc, totalRow, y, columnWidths, totalHeight);

    doc.end();
  });
};
