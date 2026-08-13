import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER

from apps.settings.services import get_settings_dict

BRAND_RED = colors.HexColor("#c11119")
INK = colors.HexColor("#1a1a1a")
SANDAL = colors.HexColor("#e6e6e6")


def build_invoice_pdf(order):
    """Renders a single order into a one-page invoice PDF and returns it as bytes."""
    settings_map = get_settings_dict()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=18 * mm, rightMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("InvoiceTitle", parent=styles["Title"], textColor=BRAND_RED, fontSize=20, spaceAfter=0)
    company_style = ParagraphStyle("Company", parent=styles["Normal"], fontSize=9, textColor=INK, leading=13)
    right_style = ParagraphStyle("Right", parent=styles["Normal"], alignment=TA_RIGHT, fontSize=9, leading=13)
    section_style = ParagraphStyle("Section", parent=styles["Normal"], fontSize=9, textColor=colors.grey, spaceAfter=2)
    normal_style = styles["Normal"]

    elements = []

    company_lines = [f"<b>{settings_map.get('company_name') or 'Company'}</b>"]
    for key in ("company_address", "company_phone", "company_email", "company_gstin"):
        val = settings_map.get(key)
        if val:
            label = {"company_phone": "Ph", "company_email": "Email", "company_gstin": "GSTIN"}.get(key)
            company_lines.append(f"{label}: {val}" if label else val)

    header_table = Table(
        [[Paragraph("INVOICE", title_style), Paragraph("<br/>".join(company_lines), right_style)]],
        colWidths=[90 * mm, 82 * mm],
    )
    header_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(header_table)
    elements.append(Spacer(1, 10 * mm))

    meta_table = Table(
        [
            [Paragraph("Bill To", section_style), Paragraph("Invoice Details", section_style)],
            [
                Paragraph(
                    f"<b>{order.customer.name}</b><br/>{order.customer.phone}<br/>"
                    f"{(order.delivery_address or order.customer.address or '').replace(chr(10), '<br/>')}",
                    normal_style,
                ),
                Paragraph(
                    f"Invoice #: <b>{order.order_number}</b><br/>"
                    f"Date: {order.created_at.strftime('%d %b %Y')}<br/>"
                    f"Payment: {order.get_payment_status_display()}",
                    right_style,
                ),
            ],
        ],
        colWidths=[90 * mm, 82 * mm],
    )
    meta_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(meta_table)
    elements.append(Spacer(1, 8 * mm))

    item_rows = [["Item", "Qty", "Unit Price", "Amount"]]
    for item in order.items.all():
        name = item.product_name + (" (Free)" if item.is_free_item else "")
        item_rows.append([name, str(item.quantity), f"Rs.{item.unit_price}", f"Rs.{item.subtotal}"])

    items_table = Table(item_rows, colWidths=[92 * mm, 20 * mm, 30 * mm, 30 * mm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SANDAL),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, SANDAL),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 4 * mm))

    if order.applied_offers_summary:
        elements.append(Paragraph(f"<b>Offers applied:</b> {order.applied_offers_summary}", normal_style))
        elements.append(Spacer(1, 4 * mm))

    totals_rows = [["Subtotal", f"Rs.{order.subtotal_amount}"]]
    if order.discount_amount and order.discount_amount > 0:
        totals_rows.append(["Discount", f"-Rs.{order.discount_amount}"])
    totals_rows.append(["Total", f"Rs.{order.total_amount}"])

    totals_table = Table(totals_rows, colWidths=[142 * mm, 30 * mm])
    totals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 11),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, INK),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 14 * mm))

    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    elements.append(Paragraph("Thank you for your business!", footer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
