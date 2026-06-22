export const DEFAULT_SHIPPING_FEE = 30000;

export function createDefaultOrderForm(overrides = {}) {
  return {
    customer_name: "",
    fb_name: "",
    customer_phone: "",
    fb_link: "",
    province: "",
    district: "",
    ward: "",
    address_detail: "",
    shipping_fee: String(DEFAULT_SHIPPING_FEE),
    discount: "",
    note: "",
    ...overrides,
  };
}

export function createDefaultOrderItems(defaultNote = "") {
  return [
    {
      product_id: "",
      quantity: 1,
      item_note: defaultNote || "",
    },
  ];
}
