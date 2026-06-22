import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import { fetchVietnamAddressTree } from "../../lib/vietnamAddressApi";
import {
  DEFAULT_SHIPPING_FEE,
  createDefaultOrderForm,
  createDefaultOrderItems,
} from "./liveSaleConstants";
import {
  buildFacebookLink,
  buildFullAddress,
  extractPhone,
  printOrderReceipt,
} from "./liveSaleUtils";

function normalizePhoneForLookup(value = "") {
  const phone = String(value || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/-/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "");

  if (phone.startsWith("+84")) {
    return `0${phone.slice(3)}`;
  }

  return phone;
}


export function useLiveSaleController(sessionId) {
  const [comments, setComments] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedComment, setSelectedComment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [addressTree, setAddressTree] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");

  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerLookupMessage, setCustomerLookupMessage] = useState("");

  const [orderForm, setOrderForm] = useState(createDefaultOrderForm());
  const [orderItems, setOrderItems] = useState(createDefaultOrderItems());

  const isFetchingCommentsRef = useRef(false);
  const isFetchingProductsRef = useRef(false);
  const hasLoadedProductsRef = useRef(false);

  const productMap = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product;
      return map;
    }, {});
  }, [products]);

  const orderSubtotal = useMemo(() => {
    return orderItems.reduce((total, item) => {
      const product = productMap[item.product_id];
      return total + Number(product?.price || 0) * Number(item.quantity || 0);
    }, 0);
  }, [orderItems, productMap]);

  const orderTotal = useMemo(() => {
    return (
      orderSubtotal +
      Number(orderForm.shipping_fee || 0) -
      Number(orderForm.discount || 0)
    );
  }, [orderSubtotal, orderForm.shipping_fee, orderForm.discount]);

  const selectedProvince = useMemo(() => {
    return addressTree.find((province) => province.name === orderForm.province);
  }, [addressTree, orderForm.province]);

  const availableDistricts = useMemo(() => {
    return selectedProvince?.districts || [];
  }, [selectedProvince]);

  const selectedDistrict = useMemo(() => {
    return availableDistricts.find(
      (district) => district.name === orderForm.district
    );
  }, [availableDistricts, orderForm.district]);

  const availableWards = useMemo(() => {
    return selectedDistrict?.wards || [];
  }, [selectedDistrict]);

  const selectedWard = useMemo(() => {
    return availableWards.find((ward) => ward.name === orderForm.ward);
  }, [availableWards, orderForm.ward]);

  async function loadComments({ silent = false, force = false } = {}) {
    if (!sessionId) return [];

    if (isFetchingCommentsRef.current) {
      return [];
    }

    try {
      isFetchingCommentsRef.current = true;

      if (!silent) {
        setLoading(true);
        setErrorMessage("");
      }

      const commentData = force
        ? await api.refreshLiveComments(sessionId)
        : await api.getLiveComments(sessionId);

      const safeComments = Array.isArray(commentData) ? commentData : [];
      setComments(safeComments);

      return safeComments;
    } catch (error) {
      console.error("Không tải được comment:", error);

      if (!silent) {
        setErrorMessage(error.message || "Không tải được comment phiên live.");
      }

      return [];
    } finally {
      isFetchingCommentsRef.current = false;

      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function loadProductsOnce() {
    if (hasLoadedProductsRef.current || isFetchingProductsRef.current) {
      return;
    }

    try {
      isFetchingProductsRef.current = true;

      const productData = await api.getProducts();
      setProducts(Array.isArray(productData) ? productData : []);
      hasLoadedProductsRef.current = true;
    } catch (error) {
      console.error("Không tải được sản phẩm:", error);
      setProducts([]);
    } finally {
      isFetchingProductsRef.current = false;
    }
  }

  async function refreshProducts() {
    try {
      const productData = await api.refreshProducts();
      setProducts(Array.isArray(productData) ? productData : []);
      hasLoadedProductsRef.current = true;
    } catch (error) {
      console.error("Không tải lại được sản phẩm:", error);
    }
  }

  async function loadAddressTree() {
    try {
      setAddressLoading(true);
      setAddressError("");

      const data = await fetchVietnamAddressTree();
      setAddressTree(data);
    } catch (error) {
      console.error("Không tải được địa chỉ:", error);
      setAddressError(
        error.message || "Không tải được danh sách tỉnh/quận/phường."
      );
    } finally {
      setAddressLoading(false);
    }
  }

  async function lookupCustomerByPhone(phoneValue) {
    const phone = normalizePhoneForLookup(phoneValue);

    if (!selectedComment || phone.length < 9) {
      setCustomerLookupMessage("");
      return;
    }

    try {
      setCustomerLookupLoading(true);
      setCustomerLookupMessage("");

      const result = await api.getCustomerByPhone(phone, {
        force: true,
      });

      if (!result?.found || !result.customer) {
        setCustomerLookupMessage("Ch?a c? d? li?u kh?ch c? cho s? ?i?n tho?i n?y.");
        return;
      }

      const customer = result.customer;

      setOrderForm((prev) => {
        const currentPhone = normalizePhoneForLookup(prev.customer_phone);

        if (currentPhone !== phone) {
          return prev;
        }

        const hasSplitAddress =
          customer.province ||
          customer.district ||
          customer.ward ||
          customer.address_detail;

        return {
          ...prev,
          customer_name: customer.name || prev.customer_name,
          fb_name: customer.fb_name || prev.fb_name,
          customer_phone: customer.phone || prev.customer_phone,
          fb_link: customer.fb_link || prev.fb_link,

          province: customer.province || prev.province,
          district: customer.district || prev.district,
          ward: customer.ward || prev.ward,

          // Nếu khách cũ chỉ có địa chỉ dạng text, vẫn tự đổ vào ô địa chỉ chi tiết
          // để backend không báo Customer address is required.
          address_detail:
            customer.address_detail ||
            prev.address_detail ||
            (!hasSplitAddress ? customer.address || "" : ""),
        };
      });

      setCustomerLookupMessage(
        `?? t? ?i?n th?ng tin kh?ch c?: ${customer.name || customer.phone}`
      );
    } catch (error) {
      console.error("Kh?ng t?m ???c kh?ch theo S?T:", error);
      setCustomerLookupMessage("Kh?ng t?m ???c th?ng tin kh?ch c?.");
    } finally {
      setCustomerLookupLoading(false);
    }
  }

  function updateOrderForm(field, value) {
    setOrderForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleProvinceChange(provinceCode) {
    const province = addressTree.find(
      (item) => String(item.code) === String(provinceCode)
    );

    setOrderForm((prev) => ({
      ...prev,
      province: province?.name || "",
      district: "",
      ward: "",
    }));
  }

  function handleDistrictChange(districtCode) {
    const district = availableDistricts.find(
      (item) => String(item.code) === String(districtCode)
    );

    setOrderForm((prev) => ({
      ...prev,
      district: district?.name || "",
      ward: "",
    }));
  }

  function handleWardChange(wardCode) {
    const ward = availableWards.find(
      (item) => String(item.code) === String(wardCode)
    );

    setOrderForm((prev) => ({
      ...prev,
      ward: ward?.name || "",
    }));
  }

  function updateOrderItem(index, field, value) {
    setOrderItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addOrderItem() {
    setOrderItems((prev) => [
      ...prev,
      {
        product_id: "",
        quantity: 1,
        item_note: "",
      },
    ]);
  }

  function removeOrderItem(index) {
    setOrderItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function openOrderSheet(comment) {
    const phone = extractPhone(comment.message || "");
    const fbLink =
      comment.platform === "facebook" ? buildFacebookLink(comment) : "";
    const fbName = comment.platform === "facebook" ? comment.customer_name || "" : "";
    const noteFromComment = comment.message || "";

    setSelectedComment(comment);

    setOrderForm(
      createDefaultOrderForm({
        customer_name: comment.customer_name || "",
        fb_name: fbName,
        customer_phone: phone,
        fb_link: fbLink,
        shipping_fee: String(DEFAULT_SHIPPING_FEE),
        note: noteFromComment,
      })
    );

    setOrderItems(createDefaultOrderItems(noteFromComment));
    loadProductsOnce();
  }

  function closeOrderSheet() {
    setSelectedComment(null);
    setOrderForm(createDefaultOrderForm());
    setOrderItems(createDefaultOrderItems());
  }

  async function handleSaveOrder({ shouldPrint = false } = {}) {
    if (!selectedComment) return;

    const commentAlreadyUsed =
      Boolean(selectedComment.order_id) || selectedComment.status === "used";

    if (commentAlreadyUsed) {
      alert("Comment này đã được thêm vào đơn rồi.");
      return;
    }

    if (!orderForm.customer_name.trim()) {
      alert("Vui lòng nhập tên khách hàng.");
      return;
    }

    if (!orderForm.customer_phone.trim()) {
      alert("Vui lòng nhập số điện thoại.");
      return;
    }

    if (!orderForm.province) {
      alert("Vui lòng chọn tỉnh/thành phố.");
      return;
    }

    if (!orderForm.district) {
      alert("Vui lòng chọn quận/huyện.");
      return;
    }

    if (!orderForm.ward) {
      alert("Vui lòng chọn phường/xã.");
      return;
    }

    if (!orderForm.address_detail.trim()) {
      alert("Vui lòng nhập số nhà, tên đường hoặc ghi chú giao hàng.");
      return;
    }

    const validItems = orderItems
      .filter((item) => item.product_id)
      .map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity || 1),
        item_note: item.item_note?.trim() || null,
      }));

    if (!validItems.length) {
      alert("Vui lòng chọn ít nhất một cây/sản phẩm.");
      return;
    }

    try {
      setOrderLoading(true);

      const fullAddress = buildFullAddress(orderForm);

      const order = await api.createOrderFromComment({
        comment_id: selectedComment.id,

        customer_name: orderForm.customer_name.trim(),
        fb_name: orderForm.fb_name.trim() || null,
        customer_phone: orderForm.customer_phone.trim(),
        fb_link: orderForm.fb_link.trim() || null,

        province: orderForm.province || null,
        district: orderForm.district || null,
        ward: orderForm.ward || null,
        address_detail: orderForm.address_detail.trim(),
        customer_address: fullAddress,

        shipping_fee: Number(orderForm.shipping_fee || DEFAULT_SHIPPING_FEE),
        discount: Number(orderForm.discount || 0),
        note: orderForm.note.trim() || null,

        items: validItems,
      });

      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id !== selectedComment.id) return comment;

          return {
            ...comment,
            status: "used",
            order_id: order.id,
          };
        })
      );

      if (shouldPrint) {
        const itemsToPrint = Array.isArray(order.items)
          ? order.items
          : Array.isArray(order.added_items)
            ? order.added_items
            : [];

        for (const item of itemsToPrint) {
          try {
            if (item.id) {
              await api.markOrderItemPrinted(order.id, item.id);
            }
          } catch (printError) {
            console.error("Không cập nhật trạng thái in:", printError);
          }
        }

        printOrderReceipt({
          ...order,
          items: itemsToPrint,
        });
      }

      const message = order.merged
        ? `Đã cộng cây vào đơn cũ ${order.order_code}. Phí ship vẫn giữ 1 lần.`
        : `Đã tạo đơn mới ${order.order_code}.`;

      alert(order.message || message);

      closeOrderSheet();
      await loadComments({ silent: true, force: true });
      await refreshProducts();
    } catch (error) {
      alert(error.message || "Không tạo/cộng được đơn hàng.");
    } finally {
      setOrderLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedComment) return undefined;

    const phone = normalizePhoneForLookup(orderForm.customer_phone);

    if (phone.length < 9) {
      setCustomerLookupMessage("");
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      lookupCustomerByPhone(phone);
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [orderForm.customer_phone, selectedComment?.id]);

  useEffect(() => {
    if (!sessionId) return;

    setComments([]);
    setErrorMessage("");
    setLoading(true);

    isFetchingCommentsRef.current = false;
    isFetchingProductsRef.current = false;
    hasLoadedProductsRef.current = false;

    loadComments();
    loadProductsOnce();
    loadAddressTree();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return undefined;

    let channel = null;

    try {
      channel = supabase
        .channel(`live-comments-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_comments",
            filter: `session_id=eq.${sessionId}`,
          },
          () => {
            loadComments({ silent: true, force: true });
          }
        )
        .subscribe();
    } catch (error) {
      console.error("Không kết nối được Supabase realtime:", error);
    }

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      loadComments({ silent: true, force: true });
    }, 5000);

    return () => {
      window.clearInterval(intervalId);

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sessionId]);

  return {
    comments,
    products,
    selectedComment,
    loading,
    orderLoading,
    errorMessage,

    addressTree,
    addressLoading,
    addressError,
    selectedProvince,
    availableDistricts,
    selectedDistrict,
    availableWards,
    selectedWard,

    orderForm,
    orderItems,
    orderSubtotal,
    orderTotal,

    loadComments,
    updateOrderForm,
    handleProvinceChange,
    handleDistrictChange,
    handleWardChange,
    updateOrderItem,
    addOrderItem,
    removeOrderItem,
    openOrderSheet,
    closeOrderSheet,
    handleSaveOrder,
  };
}
