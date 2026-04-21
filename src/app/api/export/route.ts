import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildCsv } from "@/lib/server/export/csv";
import { buildPdf } from "@/lib/server/export/pdf";
import { buildXlsx } from "@/lib/server/export/xlsx";
import { rowRepository } from "@/lib/server/db/repository";

const ExportFormatSchema = z.enum(["csv", "xlsx", "pdf"]);

export const runtime = "nodejs";

const sanitizeFilenameBase = (raw: string | null): string | null => {
  if (!raw) {
    return null;
  }

  const withoutExtension = raw.replace(/\.(csv|xlsx|pdf)$/i, "");
  const normalized = withoutExtension
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized.length > 0 ? normalized : null;
};

const buildFilename = (
  format: "csv" | "xlsx" | "pdf",
  customBaseName: string | null
): string => {
  if (customBaseName) {
    return `${customBaseName}.${format}`;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return `aaherpatti_contributions_${stamp}.${format}`;
};

export async function GET(request: NextRequest) {
  try {
    const format = ExportFormatSchema.parse(
      request.nextUrl.searchParams.get("format") ?? "csv"
    );
    const search = request.nextUrl.searchParams.get("search") ?? "";
    const fileName = sanitizeFilenameBase(request.nextUrl.searchParams.get("fileName"));

    const { rows } = await rowRepository.listRows(search);
    const filename = buildFilename(format, fileName);

    if (format === "csv") {
      const csv = buildCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"${filename}\"`
        }
      });
    }

    if (format === "xlsx") {
      const buffer = buildXlsx(rows);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=\"${filename}\"`
        }
      });
    }

    const pdf = await buildPdf(rows);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${filename}\"`
      }
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate export"
        }
      },
      { status: 500 }
    );
  }
}
