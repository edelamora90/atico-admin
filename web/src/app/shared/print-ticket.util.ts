export function printTicketFromElement(element: HTMLElement): boolean {
  const ticketHtml = element.outerHTML;
  const printWindow = window.open('', '_blank', 'width=380,height=700');

  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Ticket</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: "Courier New", monospace;
          }

          body {
            width: 80mm;
          }

          .ticket-print-area {
            width: 80mm;
            max-width: 80mm;
            box-sizing: border-box;
            padding: 6mm;
            background: #ffffff;
            color: #000000;
            border: none;
            box-shadow: none;
            font-family: "Courier New", monospace;
          }

          .ticket-print-area * {
            box-sizing: border-box;
            color: #000000 !important;
          }

          .thermal-ticket {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
            background: #ffffff;
            border: none;
            box-shadow: none;
            font-family: "Courier New", monospace;
            font-size: 12px;
            line-height: 1.35;
          }

          .ticket-logo {
            display: block;
            margin: 0 0 3mm;
            padding-bottom: 3mm;
            border-bottom: 1px dashed #000000;
            text-align: center;
          }

          .ticket-logo span {
            display: inline-block;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 2px;
          }

          .ticket-logo img {
            max-width: 38mm;
            height: auto;
            display: block;
            margin: 0 auto 4mm;
          }

          .ticket-address {
            text-align: center;
            font-size: 12px;
            margin-bottom: 4mm;
          }

          .ticket-meta-line {
            display: flex;
            justify-content: space-between;
            gap: 4mm;
            font-size: 12px;
            margin: 1mm 0;
          }

          .ticket-meta-line strong {
            text-align: right;
            overflow-wrap: anywhere;
          }

          .ticket-customer {
            border-top: 1px dashed #000000;
            border-bottom: 1px dashed #000000;
            margin: 3mm 0;
            padding: 2mm 0;
            font-size: 12px;
          }

          .ticket-customer div {
            margin: 1mm 0;
            overflow-wrap: anywhere;
          }

          .ticket-table {
            width: 100%;
            border-bottom: 1px dashed #000000;
            padding-bottom: 2mm;
            font-size: 12px;
          }

          .ticket-table-head,
          .ticket-table-row,
          .ticket-total {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 4mm;
          }

          .ticket-table-head {
            font-weight: 700;
            margin-bottom: 1.5mm;
          }

          .ticket-table-row {
            margin: 1.5mm 0;
          }

          .ticket-table-head span:last-child,
          .ticket-table-row strong,
          .ticket-total strong {
            text-align: right;
            white-space: nowrap;
          }

          .ticket-table-row span {
            overflow-wrap: anywhere;
          }

          .ticket-table-row small {
            display: block;
            font-size: 11px;
            margin-top: 1mm;
          }

          .ticket-total {
            font-weight: 700;
            font-size: 14px;
            margin-top: 3mm;
          }

          .thermal-ticket p {
            border-top: 1px dashed #000000;
            text-align: center;
            font-size: 12px;
            margin: 4mm 0 0;
            padding-top: 3mm;
          }

          .ticket-cancelled-stamp {
            border: 2px solid #000000;
            font-weight: 700;
            letter-spacing: 2px;
            text-align: center;
            font-size: 16px;
            margin-bottom: 3mm;
            padding: 2mm;
          }

          .ticket-actions,
          .no-print,
          button {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${ticketHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  const closePrintWindow = () => {
    setTimeout(() => printWindow.close(), 150);
  };

  printWindow.onafterprint = closePrintWindow;

  setTimeout(() => {
    printWindow.print();
    setTimeout(closePrintWindow, 1000);
  }, 250);

  return true;
}
