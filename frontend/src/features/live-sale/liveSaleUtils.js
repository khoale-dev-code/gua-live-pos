export function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

export function extractPhone(text = "") {
  const match = text.match(/(0|\+84)[0-9\s.-]{8,13}/);
  return match ? match[0].replace(/\s|\.|-/g, "") : "";
}

export function buildFacebookLink(comment) {
  if (!comment?.customer_platform_id) return "";
  return `https://www.facebook.com/${comment.customer_platform_id}`;
}

export function buildFullAddress(orderForm) {
  return [
    orderForm.address_detail,
    orderForm.ward,
    orderForm.district,
    orderForm.province,
  ]
    .filter(Boolean)
    .join(", ");
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderReceiptItems(items = []) {
  return items
    .map((item, index) => {
      const productName = escapeHtml(item.product_name || "");
      const productCode = item.product_code
        ? `<div class="item-code">${escapeHtml(item.product_code)}</div>`
        : "";
      const qty = Number(item.quantity || 0);
      const price = formatCurrency(item.price || 0);
      const total = formatCurrency(item.total || 0);
      const itemNote = item.item_note
        ? `<div class="item-note">Ghi chú: ${escapeHtml(item.item_note)}</div>`
        : "";

      return `
        <tr>
          <td class="col-name">
            <div class="item-index">${index + 1}. ${productName}</div>
            ${productCode}
            ${itemNote}
          </td>
          <td class="col-qty">${qty}</td>
          <td class="col-price">${price}</td>
          <td class="col-total">${total}</td>
        </tr>
      `;
    })
    .join("");
}

export function printOrderReceipt(order) {
  const items =
    Array.isArray(order?.items) && order.items.length
      ? order.items
      : Array.isArray(order?.added_items) && order.added_items.length
        ? order.added_items
        : [];

  const printWindow = window.open("", "_blank", "width=420,height=900");

  if (!printWindow) {
    alert("Trình duyệt đang chặn popup in bill. Hãy cho phép popup.");
    return;
  }

  const customerName = escapeHtml(order?.customer_name || "");
  const customerPhone = escapeHtml(order?.customer_phone || "");
  const customerAddress = escapeHtml(order?.customer_address || "");
  const orderCode = escapeHtml(order?.order_code || "");
  const createdAt = order?.created_at
    ? new Date(order.created_at).toLocaleString("vi-VN")
    : new Date().toLocaleString("vi-VN");
  const note = order?.note
    ? `<div class="note-block"><div class="label">Ghi chú:</div><div>${escapeHtml(order.note)}</div></div>`
    : "";

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Bill ${orderCode}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: "Courier New", Courier, monospace;
          }

          body {
            width: 72mm;
            margin: 0 auto;
            padding: 4mm 0;
            font-size: 12px;
            line-height: 1.45;
          }

          .receipt {
            width: 100%;
          }

          .center {
            text-align: center;
          }

          .title {
            font-size: 18px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .sub-title {
            font-size: 12px;
            margin-top: 2px;
          }

          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }

          .meta-row,
          .info-row,
          .total-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 8px;
          }

          .info-row {
            margin: 3px 0;
          }

          .label {
            font-weight: 700;
          }

          .value-right {
            text-align: right;
          }

          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }

          .table th,
          .table td {
            padding: 4px 2px;
            vertical-align: top;
            border-bottom: 1px dashed #bbb;
            font-size: 11px;
          }

          .table th {
            font-weight: 700;
            text-align: left;
          }

          .col-name {
            width: 44%;
          }

          .col-qty {
            width: 14%;
            text-align: center;
          }

          .col-price {
            width: 21%;
            text-align: right;
          }

          .col-total {
            width: 21%;
            text-align: right;
          }

          .item-index {
            font-weight: 700;
          }

          .item-code,
          .item-note {
            font-size: 10px;
            color: #000;
            margin-top: 2px;
          }

          .totals {
            margin-top: 8px;
          }

          .total-row {
            margin: 4px 0;
          }

          .grand-total {
            font-size: 14px;
            font-weight: 700;
          }

          .note-block {
            margin-top: 8px;
            white-space: pre-wrap;
          }

          .footer {
            margin-top: 12px;
            text-align: center;
            font-size: 11px;
          }

          .thank-you {
            margin-top: 4px;
            font-weight: 700;
          }

          @media print {
            html, body {
              width: 72mm;
            }
          }
        </style>
      </head>

      <body>
        <div class="receipt">
          <div class="center title">HÓA ĐƠN BÁN HÀNG</div>
          <div class="center sub-title">GUA LIVE POS</div>

          <div class="divider"></div>

          <div class="meta-row">
            <div><span class="label">Mã đơn:</span> ${orderCode}</div>
          </div>
          <div class="meta-row">
            <div><span class="label">Ngày in:</span> ${escapeHtml(createdAt)}</div>
          </div>

          <div class="divider"></div>

          <div class="info-row">
            <div class="label">Khách hàng:</div>
            <div class="value-right">${customerName}</div>
          </div>
          <div class="info-row">
            <div class="label">SĐT:</div>
            <div class="value-right">${customerPhone}</div>
          </div>
          <div class="info-row">
            <div class="label">Địa chỉ:</div>
            <div class="value-right">${customerAddress}</div>
          </div>

          <div class="divider"></div>

          <table class="table">
            <thead>
              <tr>
                <th class="col-name">Sản phẩm</th>
                <th class="col-qty">SL</th>
                <th class="col-price">Giá</th>
                <th class="col-total">TT</th>
              </tr>
            </thead>
            <tbody>
              ${renderReceiptItems(items)}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <div>Tạm tính</div>
              <div>${formatCurrency(order?.subtotal || 0)}</div>
            </div>
            <div class="total-row">
              <div>Phí ship</div>
              <div>${formatCurrency(order?.shipping_fee || 0)}</div>
            </div>
            <div class="total-row">
              <div>Giảm giá</div>
              <div>${formatCurrency(order?.discount || 0)}</div>
            </div>
            <div class="divider"></div>
            <div class="total-row grand-total">
              <div>TỔNG CỘNG</div>
              <div>${formatCurrency(order?.total || 0)}</div>
            </div>
          </div>

          ${note}

          <div class="divider"></div>

          <div class="footer">
            <div>Cảm ơn quý khách!</div>
            <div class="thank-you">Hẹn gặp lại</div>
          </div>
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printPlantSlip(order, item) {
  printOrderReceipt({
    ...order,
    items: [item],
  });
}
