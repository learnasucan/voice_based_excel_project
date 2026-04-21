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
  columnWidths: number[]
): void => {
  let x = document.page.margins.left;

  row.forEach((value, index) => {
    document.text(String(value), x, y, {
      width: columnWidths[index],
      ellipsis: true
    });
    x += columnWidths[index];
  });
};

export const buildPdf = async (rows: ExportRow[]): Promise<Buffer> => {
  const fontPath = resolveMarathiFontPath();
  const { headers, rows: values, total } = mapRowsToSheetData(rows);

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 24,
      size: "A4"
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (fontPath) {
      doc.font(fontPath);
    }

    doc.fontSize(14).text("Aaherpatti Contributions", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9);

    const columnWidths = [42, 110, 110, 70, 90, 90];
    let y = doc.y;

    drawRow(doc, [...headers], y, columnWidths);
    y += 16;

    doc.moveTo(doc.page.margins.left, y - 4)
      .lineTo(doc.page.width - doc.page.margins.right, y - 4)
      .stroke();

    for (const row of values) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        if (fontPath) {
          doc.font(fontPath);
        }
        doc.fontSize(9);
        y = doc.page.margins.top;
        drawRow(doc, [...headers], y, columnWidths);
        y += 16;
      }

      drawRow(doc, row as Array<string | number>, y, columnWidths);
      y += 15;
    }

    y += 4;
    doc.moveTo(doc.page.margins.left, y)
      .lineTo(doc.page.width - doc.page.margins.right, y)
      .stroke();
    y += 6;

    drawRow(doc, ["TOTAL", "", "", total, "", ""], y, columnWidths);

    doc.end();
  });
};
