import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import {
  buildCustomerAddress,
  getPlatformLabel,
  normalizePhone,
  parseMoney,
} from "./multiLiveUtils";

const EMPTY_ORDER_FORM = {
  customer_name: "",
  customer_phone: "",
  customer_address: "",
  shipping_fee: "",
  discount: "",
  note: "",
};

const EMPTY_ORDER_ITEM = {
  product_id: "",
  quantity: "1",
  price: "",
  item_note: "",
};

export function useMultiLiveSaleController(eventId) {
  const [event, setEvent] = useState(null);
  const [comments, setComments] = useState([]);
  const [products, setProducts] = useState([]);

  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedComment, setSelectedComment] = useState(null);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER_FORM);
  const [orderItems, setOrderItems] = useState([EMPTY_ORDER_ITEM]);

  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerLookupMessage, setCustomerLookupMessage] = useState("");

  const productMap = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      const platform = String(comment.platform || "").toLowerCase();

      const platformMatched =
        platformFilter === "all" || platform === platformFilter;

      const statusMatched =
        statusFilter === "all" ||
        (statusFilter === "new" && !comment.order_id) ||
        (statusFilter === "ordered" && Boolean(comment.order_id));

      return platformMatched && statusMatched;
    });
  }, [comments, platformFilter, statusFilter]);

  const counts = useMemo(() => {
    return comments.reduce(
      (result, comment) => {
        const platform = String(comment.platform || "").toLowerCase();

        result.total += 1;

        if (platform === "facebook") result.facebook += 1;
        if (platform === "tiktok") result.tiktok += 1;
        if (comment.order_id) result.ordered += 1;
        if (!comment.order_id) result.new += 1;

        return result;
      },
      {
        total: 0,
        facebook: 0,
        tiktok: 0,
        new: 0,
        ordered: 0,
      }
    );
  }, [comments]);

  const orderSubtotal = useMemo(() => {
    return orderItems.reduce((sum, item) => {
      const quantity = Number(item.quantity || 0);
      const price = parseMoney(item.price);
      return sum + quantity * price;
    }, 0);
  }, [orderItems]);

  const orderTotal = useMemo(() => {
    return (
      orderSubtotal +
      parseMoney(orderForm.shipping_fee) -
      parseMoney(orderForm.discount)
    );
  }, [orderSubtotal, orderForm.shipping_fee, orderForm.discount]);

  async function loadData({ silent = false, force = false } = {}) {
    try {
      if (!silent) setLoading(true);

      const [eventPayload, productData] = await Promise.all([
        force
          ? api.refreshLiveEventComments(eventId)
          : api.getLiveEventComments(eventId, { force: true }),
        force ? api.refreshProducts() : api.getProducts(),
      ]);

      setEvent(eventPayload?.event || null);
      setComments(Array.isArray(eventPayload?.comments) ? eventPayload.comments : []);
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (error) {
      alert(error.message || "Không tải được buổi live tổng hợp.");
    } finally {
      setLoading(false);
    }
  }

  function updateOrderForm(field, value) {
    setOrderForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateOrderItem(index, field, value) {
    setOrderItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const next = {
          ...item,
          [field]: value,
        };

        if (field === "product_id") {
          const product = productMap.get(value);
          next.price = String(Number(product?.price || 0));
        }

        return next;
      })
    );
  }

  function addOrderItem() {
    setOrderItems((prev) => [...prev, EMPTY_ORDER_ITEM]);
  }

  function removeOrderItem(index) {
    setOrderItems((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [EMPTY_ORDER_ITEM];
    });
  }

  async function lookupCustomerByPhone(phoneValue) {
    const phone = normalizePhone(phoneValue);

    if (phone.length < 9) {
      setCustomerLookupMessage("");
      return;
    }

    try {
      setCustomerLookupLoading(true);
      setCustomerLookupMessage("");

      const payload = await api.getCustomerByPhone(phone, { force: true });

      if (!payload?.found || !payload?.customer) {
        setCustomerLookupMessage("Khách mới, chưa có thông tin cũ.");
        return;
      }

      const customer = payload.customer;

      setOrderForm((prev) => ({
        ...prev,
        customer_name: customer.name || prev.customer_name,
        customer_phone: customer.phone || prev.customer_phone,
        customer_address:
          buildCustomerAddress(customer) || prev.customer_address,
      }));

      setCustomerLookupMessage("Đã tự điền thông tin khách cũ.");
    } catch {
      setCustomerLookupMessage("");
    } finally {
      setCustomerLookupLoading(false);
    }
  }

  function openOrderSheet(comment) {
    const platformLabel = comment.platform_label || getPlatformLabel(comment.platform);

    setSelectedComment(comment);

    setOrderForm({
      ...EMPTY_ORDER_FORM,
      customer_name: comment.customer_name || "",
      note: `Nguồn: ${platformLabel}`,
    });

    setOrderItems([EMPTY_ORDER_ITEM]);
  }

  function closeOrderSheet() {
    setSelectedComment(null);
    setOrderForm(EMPTY_ORDER_FORM);
    setOrderItems([EMPTY_ORDER_ITEM]);
    setCustomerLookupLoading(false);
    setCustomerLookupMessage("");
  }

  async function handleCreateOrder() {
    if (!selectedComment) return;

    const items = orderItems
      .filter((item) => item.product_id)
      .map((item) => {
        const product = productMap.get(item.product_id);

        return {
          product_id: item.product_id,
          product_code: product?.code || "",
          product_name: product?.name || "",
          quantity: Number(item.quantity || 1),
          price: parseMoney(item.price) || Number(product?.price || 0),
          item_note: item.item_note || null,
        };
      });

    if (!orderForm.customer_name.trim()) {
      alert("Vui lòng nhập tên khách hàng.");
      return;
    }

    if (!orderForm.customer_phone.trim()) {
      alert("Vui lòng nhập số điện thoại khách hàng.");
      return;
    }

    if (!orderForm.customer_address.trim()) {
      alert("Vui lòng nhập địa chỉ giao hàng.");
      return;
    }

    if (!items.length) {
      alert("Vui lòng chọn ít nhất một sản phẩm.");
      return;
    }

    const platformLabel =
      selectedComment.platform_label || getPlatformLabel(selectedComment.platform);

    const sourceNote = [
      `Nền tảng: ${platformLabel}`,
      selectedComment.message ? `Comment: ${selectedComment.message}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const finalNote = [orderForm.note, sourceNote]
      .filter(Boolean)
      .join("\n");

    try {
      setOrderLoading(true);

      await api.createOrderFromComment({
        comment_id: selectedComment.id,
        customer_name: orderForm.customer_name.trim(),
        customer_phone: normalizePhone(orderForm.customer_phone),
        customer_address: orderForm.customer_address.trim(),
        address_detail: orderForm.customer_address.trim(),
        items,
        shipping_fee: parseMoney(orderForm.shipping_fee),
        discount: parseMoney(orderForm.discount),
        note: finalNote,
      });

      closeOrderSheet();
      await loadData({ silent: true, force: true });
    } catch (error) {
      alert(error.message || "Không tạo được đơn hàng.");
    } finally {
      setOrderLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const interval = window.setInterval(() => {
      loadData({ silent: true, force: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    if (!selectedComment) return undefined;

    const phone = normalizePhone(orderForm.customer_phone);

    if (phone.length < 9) {
      setCustomerLookupMessage("");
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      lookupCustomerByPhone(phone);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [orderForm.customer_phone, selectedComment?.id]);

  return {
    event,
    comments,
    filteredComments,
    products,
    platformFilter,
    statusFilter,
    selectedComment,
    orderForm,
    orderItems,
    loading,
    orderLoading,
    customerLookupLoading,
    customerLookupMessage,
    counts,
    orderSubtotal,
    orderTotal,

    setPlatformFilter,
    setStatusFilter,
    updateOrderForm,
    updateOrderItem,
    addOrderItem,
    removeOrderItem,
    openOrderSheet,
    closeOrderSheet,
    handleCreateOrder,
    loadData,
  };
}
