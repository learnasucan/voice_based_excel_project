"""PDF exporter with Marathi font strategy."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Sequence

from ..constants import EXPORT_HEADERS
from ..types import ExportPayload, ExportRow
from .base import build_total_row, compute_total

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
except ModuleNotFoundError:  # pragma: no cover - handled at runtime
    colors = None
    A4 = None
    ParagraphStyle = None
    getSampleStyleSheet = None
    pdfmetrics = None
    TTFont = None
    Paragraph = None
    SimpleDocTemplate = None
    Spacer = None
    Table = None
    TableStyle = None


def _find_devanagari_font() -> tuple[str, str | None]:
    """Find and register a Devanagari font for Marathi text rendering."""
    if pdfmetrics is None or TTFont is None:
        return "Helvetica", None

    font_candidates = [
        Path("/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf"),
        Path("/usr/share/fonts/truetype/noto/NotoSerifDevanagari-Regular.ttf"),
        Path("/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/Library/Fonts/NotoSansDevanagari-Regular.ttf"),
        Path("/Library/Fonts/Mukta-Regular.ttf"),
        Path.home() / "Library/Fonts/NotoSansDevanagari-Regular.ttf",
        Path.home() / "Library/Fonts/Mukta-Regular.ttf",
    ]
    for font_path in font_candidates:
        if not font_path.exists():
            continue
        font_name = f"MarathiFont-{font_path.stem}"
        try:
            pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
            return font_name, str(font_path)
        except Exception:
            continue

    return "Helvetica", None


class PDFRecordExporter:
    content_type = "application/pdf"
    extension = "pdf"

    def export(self, rows: Sequence[ExportRow]) -> ExportPayload:
        if any(tool is None for tool in (SimpleDocTemplate, Table, Paragraph)):
            raise RuntimeError("PDF export requires 'reportlab'. Install it with: pip install reportlab")

        total = compute_total(rows)
        marathi_font, font_path = _find_devanagari_font()
        warnings: list[str] = []
        if font_path is None:
            warnings.append(
                "No Devanagari font found for PDF. Marathi may not render correctly. "
                "Install NotoSansDevanagari-Regular.ttf or Mukta-Regular.ttf."
            )

        buffer = BytesIO()
        document = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=24,
            rightMargin=24,
            topMargin=24,
            bottomMargin=24,
            pageCompression=0,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ExportTitle",
            parent=styles["Title"],
            fontName=marathi_font,
            fontSize=14,
            leading=18,
        )
        cell_style = ParagraphStyle(
            "CellStyle",
            parent=styles["BodyText"],
            fontName=marathi_font,
            fontSize=8.5,
            leading=11,
        )
        header_style = ParagraphStyle(
            "HeaderStyle",
            parent=cell_style,
            fontName=marathi_font,
            fontSize=8.5,
            leading=11,
        )

        table_data = [[Paragraph(header, header_style) for header in EXPORT_HEADERS]]
        for row in rows:
            table_data.append([Paragraph(str(value), cell_style) for value in row.as_list()])

        total_row = build_total_row(total)
        table_data.append([Paragraph(str(value), cell_style) for value in total_row])

        table = Table(
            table_data,
            repeatRows=1,
            colWidths=[52, 100, 95, 75, 90, 90],
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("ALIGN", (3, 1), (3, -1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.grey),
                    ("FONTNAME", (0, 0), (-1, -1), marathi_font),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                    ("TOPPADDING", (0, 0), (-1, 0), 6),
                    ("BACKGROUND", (0, -1), (-1, -1), colors.whitesmoke),
                ]
            )
        )

        story = [
            Paragraph("Contribution Records Export", title_style),
            Spacer(1, 8),
            table,
        ]
        document.build(story)

        return ExportPayload(
            data=buffer.getvalue(),
            total_amount=total,
            warnings=tuple(warnings),
        )
