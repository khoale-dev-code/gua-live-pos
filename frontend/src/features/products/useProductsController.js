import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { uploadProductImages } from "../../lib/uploadProductImage";
import {
  EMPTY_PRODUCT_FORM,
  EMPTY_STOCK_FORM,
  EMPTY_VARIANT_FORM,
} from "./productConstants";
import {
  buildImagePreview,
  getProductImage,
  normalizeImageUrls,
  parseVnd,
  toNumber,
} from "./productUtils";
import { buildAutoBarcode, buildVariantSku } from "./barcodeUtils.jsx";
import { buildVariantDisplayName, hasVariantInfo } from "./variantUtils";

function createEmptyImageState() {
  return {
    files: [],
    previews: [],
  };
}

function revokePreviews(previews = []) {
  previews.forEach((preview) => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  });
}

export function useProductsController() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [editForm, setEditForm] = useState(EMPTY_PRODUCT_FORM);
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT_FORM);
  const [stockForm, setStockForm] = useState(EMPTY_STOCK_FORM);

  const [createImages, setCreateImages] = useState(createEmptyImageState);
  const [editImages, setEditImages] = useState(createEmptyImageState);
  const [createVariantDrafts, setCreateVariantDrafts] = useState([]);
  const [editExistingImages, setEditExistingImages] = useState([]);

  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [variants, setVariants] = useState([]);
  const [history, setHistory] = useState([]);

  const [activeModal, setActiveModal] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [variantLoading, setVariantLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return products.filter((product) => {
      const matchText = [
        product.code,
        product.name,
        product.category_name,
        product.unit,
        product.supplier_name,
        product.barcode,
        product.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesKeyword = !keyword || matchText.includes(keyword);
      const matchesCategory =
        !selectedCategoryFilter ||
        product.category_id === selectedCategoryFilter;

      return matchesKeyword && matchesCategory;
    });
  }, [products, searchText, selectedCategoryFilter]);

  const stats = useMemo(() => {
    return products.reduce(
      (result, product) => {
        const stock = Number(product.stock || 0);
        const variantStock = Number(product.variant_stock || 0);
        const totalStock = stock + variantStock;
        const costPrice = Number(product.cost_price || 0);

        result.totalProducts += 1;
        result.totalStock += totalStock;
        result.inventoryValue += totalStock * costPrice;

        if (stock <= Number(product.min_stock || 0)) {
          result.lowStock += 1;
        }

        if (Number(product.variant_count || 0) > 0) {
          result.hasVariants += 1;
        }

        return result;
      },
      {
        totalProducts: 0,
        totalStock: 0,
        lowStock: 0,
        hasVariants: 0,
        inventoryValue: 0,
      }
    );
  }, [products]);

  async function loadData({ force = false } = {}) {
    try {
      setPageLoading(true);

      const [productData, categoryData] = await Promise.all([
        force ? api.refreshProducts() : api.getProducts(),
        force ? api.refreshCategories() : api.getCategories(),
      ]);

      setProducts(Array.isArray(productData) ? productData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (error) {
      alert(error.message || "Không tải được dữ liệu sản phẩm.");
    } finally {
      setPageLoading(false);
    }
  }

  function updateProductForm(field, value) {
    setProductForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === "code" && !prev.barcode) {
        next.barcode = buildAutoBarcode(value);
      }

      return next;
    });
  }

  function updateEditForm(field, value) {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateVariantForm(field, value) {
    setVariantForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateStockForm(field, value) {
    setStockForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function addImageFiles(mode, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const previews = files.map(buildImagePreview);

    if (mode === "create") {
      setCreateImages((prev) => ({
        files: [...prev.files, ...files],
        previews: [...prev.previews, ...previews],
      }));
      return;
    }

    setEditImages((prev) => ({
      files: [...prev.files, ...files],
      previews: [...prev.previews, ...previews],
    }));
  }

  function removeNewImage(mode, index) {
    if (mode === "create") {
      setCreateImages((prev) => {
        const removed = prev.previews[index];
        if (removed?.url) URL.revokeObjectURL(removed.url);

        return {
          files: prev.files.filter((_, itemIndex) => itemIndex !== index),
          previews: prev.previews.filter((_, itemIndex) => itemIndex !== index),
        };
      });
      return;
    }

    setEditImages((prev) => {
      const removed = prev.previews[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);

      return {
        files: prev.files.filter((_, itemIndex) => itemIndex !== index),
        previews: prev.previews.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  function removeExistingEditImage(index) {
    setEditExistingImages((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function generateBarcodeForCreate() {
    setProductForm((prev) => ({
      ...prev,
      barcode: buildAutoBarcode(prev.code || prev.name || "SP"),
    }));
  }

  function generateBarcodeForEdit() {
    setEditForm((prev) => ({
      ...prev,
      barcode: buildAutoBarcode(prev.code || prev.name || "SP"),
    }));
  }

  function addCreateVariantDraft() {
    setCreateVariantDrafts((prev) => [
      ...prev,
      {
        ...EMPTY_VARIANT_FORM,
        sku: buildVariantSku(productForm.code || "SP", prev.length + 1),
        unit: productForm.unit || "chậu",
        price: productForm.price || "",
        cost_price: productForm.cost_price || "",
      },
    ]);
  }

  function updateCreateVariantDraft(index, field, value) {
    setCreateVariantDrafts((prev) =>
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

  function removeCreateVariantDraft(index) {
    setCreateVariantDrafts((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function resetCreateForm() {
    revokePreviews(createImages.previews);
    setProductForm(EMPTY_PRODUCT_FORM);
    setCreateVariantDrafts([]);
    setCreateImages(createEmptyImageState());
  }

  function productPayloadFromForm(form, imageUrls = []) {
    return {
      code: form.code.trim(),
      name: form.name.trim(),
      category_id: form.category_id || null,
      price: parseVnd(form.price),
      cost_price: parseVnd(form.cost_price),
      stock: toNumber(form.stock),
      min_stock: toNumber(form.min_stock),
      unit: form.unit.trim() || "chậu",
      supplier_name: form.supplier_name.trim() || null,
      barcode: form.barcode.trim() || buildAutoBarcode(form.code),
      image_url: imageUrls[0] || null,
      image_urls: imageUrls,
      note: form.note.trim() || null,
    };
  }

  function variantPayloadFromForm(form) {
    const displayName = buildVariantDisplayName(form);

    return {
      sku: form.sku.trim() || null,
      name: displayName,
      unit: form.unit.trim() || "chậu",
      price: parseVnd(form.price),
      cost_price: parseVnd(form.cost_price),
      stock: toNumber(form.stock),
      min_stock: toNumber(form.min_stock),
    };
  }

  async function handleCreateProduct(event) {
    event.preventDefault();

    if (!productForm.code.trim()) {
      alert("Vui lòng nhập mã sản phẩm.");
      return;
    }

    if (!productForm.name.trim()) {
      alert("Vui lòng nhập tên sản phẩm.");
      return;
    }

    try {
      setProductLoading(true);

      const uploadedUrls = await uploadProductImages(createImages.files);
      const manualUrls = productForm.image_url.trim()
        ? [productForm.image_url.trim()]
        : [];
      const finalImageUrls = [...manualUrls, ...uploadedUrls];

      const createdProduct = await api.createProduct(
        productPayloadFromForm(productForm, finalImageUrls)
      );

      const createdProductId = createdProduct?.id;

      if (createdProductId && createVariantDrafts.length > 0) {
        for (const [index, draft] of createVariantDrafts.entries()) {
          if (!hasVariantInfo(draft)) continue;

          await api.createProductVariant(createdProductId, {
            ...variantPayloadFromForm(draft),
            sku: draft.sku.trim() || buildVariantSku(productForm.code, index + 1),
          });
        }
      }

      resetCreateForm();
      await loadData({ force: true });
    } catch (error) {
      alert(error.message || "Không tạo được sản phẩm.");
    } finally {
      setProductLoading(false);
    }
  }

  function openEditModal(product) {
    setEditingProduct(product);

    revokePreviews(editImages.previews);
    setEditImages(createEmptyImageState());

    const existingUrls = normalizeImageUrls(product.images);
    const fallbackImage = getProductImage(product);
    const safeExistingUrls = existingUrls.length
      ? existingUrls
      : fallbackImage
        ? [fallbackImage]
        : [];

    setEditExistingImages(safeExistingUrls);

    setEditForm({
      code: product.code || "",
      name: product.name || "",
      category_id: product.category_id || "",
      price: String(Number(product.price || 0)),
      cost_price: String(Number(product.cost_price || 0)),
      stock: String(Number(product.stock || 0)),
      min_stock: String(Number(product.min_stock || 0)),
      unit: product.unit || "chậu",
      supplier_name: product.supplier_name || "",
      barcode: product.barcode || "",
      image_url: "",
      note: product.note || "",
    });

    setActiveModal("edit");
  }

  async function handleUpdateProduct(event) {
    event.preventDefault();

    if (!editingProduct) return;

    try {
      setEditLoading(true);

      const uploadedUrls = await uploadProductImages(editImages.files);
      const manualUrls = editForm.image_url.trim()
        ? [editForm.image_url.trim()]
        : [];

      const finalImageUrls = [
        ...editExistingImages,
        ...manualUrls,
        ...uploadedUrls,
      ].filter(Boolean);

      await api.updateProduct(
        editingProduct.id,
        productPayloadFromForm(editForm, finalImageUrls)
      );

      revokePreviews(editImages.previews);
      setActiveModal(null);
      setEditingProduct(null);
      setEditImages(createEmptyImageState());
      setEditExistingImages([]);

      await loadData({ force: true });
    } catch (error) {
      alert(error.message || "Không cập nhật được sản phẩm.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}" không?`
    );

    if (!confirmed) return;

    try {
      setDeleteLoadingId(product.id);

      await api.deleteProduct(product.id);
      await loadData({ force: true });
    } catch (error) {
      alert(error.message || "Không xóa được sản phẩm.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  async function openStockModal(product) {
    setSelectedProduct(product);
    setStockForm({
      ...EMPTY_STOCK_FORM,
      unit_cost: String(Number(product.cost_price || 0)),
      supplier_name: product.supplier_name || "",
    });

    setActiveModal("stock");

    try {
      const data = await api.getProductVariants(product.id, { force: true });
      setVariants(Array.isArray(data) ? data : []);
    } catch {
      setVariants([]);
    }
  }

  async function handleStockIn(event) {
    event.preventDefault();

    if (!selectedProduct) return;

    if (toNumber(stockForm.quantity) <= 0) {
      alert("Vui lòng nhập số lượng nhập hàng lớn hơn 0.");
      return;
    }

    try {
      setStockLoading(true);

      await api.stockInProduct(selectedProduct.id, {
        variant_id: stockForm.variant_id || null,
        quantity: toNumber(stockForm.quantity),
        unit_cost: parseVnd(stockForm.unit_cost),
        supplier_name: stockForm.supplier_name.trim() || null,
        note: stockForm.note.trim() || null,
      });

      setActiveModal(null);
      setSelectedProduct(null);
      await loadData({ force: true });
    } catch (error) {
      alert(error.message || "Không nhập hàng được.");
    } finally {
      setStockLoading(false);
    }
  }

  async function openVariantModal(product) {
    setSelectedProduct(product);
    setVariantForm({
      ...EMPTY_VARIANT_FORM,
      unit: product.unit || "chậu",
      price: String(Number(product.price || 0)),
      cost_price: String(Number(product.cost_price || 0)),
    });

    setActiveModal("variants");
    setVariantLoading(true);

    try {
      const data = await api.getProductVariants(product.id, { force: true });
      setVariants(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error.message || "Không tải được biến thể.");
      setVariants([]);
    } finally {
      setVariantLoading(false);
    }
  }

  async function reloadVariants(productId = selectedProduct?.id) {
    if (!productId) return;

    const data = await api.getProductVariants(productId, { force: true });
    setVariants(Array.isArray(data) ? data : []);
  }

  async function handleCreateVariant(event) {
    event.preventDefault();

    if (!selectedProduct) return;

    if (!hasVariantInfo(variantForm)) {
      alert("Vui lòng nhập ít nhất một thông tin biến thể như size, chậu, chiều cao hoặc màu hoa.");
      return;
    }

    try {
      setVariantLoading(true);

      await api.createProductVariant(
        selectedProduct.id,
        variantPayloadFromForm(variantForm)
      );

      setVariantForm({
        ...EMPTY_VARIANT_FORM,
        unit: selectedProduct.unit || "chậu",
        price: String(Number(selectedProduct.price || 0)),
        cost_price: String(Number(selectedProduct.cost_price || 0)),
      });

      await reloadVariants(selectedProduct.id);
      await loadData({ force: true });
    } catch (error) {
      alert(error.message || "Không tạo được biến thể.");
    } finally {
      setVariantLoading(false);
    }
  }

  async function handleDeleteVariant(variant) {
    if (!selectedProduct) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa biến thể "${variant.name}" không?`
    );

    if (!confirmed) return;

    try {
      setVariantLoading(true);

      await api.deleteProductVariant(selectedProduct.id, variant.id);

      await reloadVariants(selectedProduct.id);
      await loadData({ force: true });
    } catch (error) {
      alert(error.message || "Không xóa được biến thể.");
    } finally {
      setVariantLoading(false);
    }
  }

  async function openHistoryModal(product) {
    setSelectedProduct(product);
    setHistory([]);
    setActiveModal("history");
    setHistoryLoading(true);

    try {
      const data = await api.getProductInventoryHistory(product.id, {
        force: true,
      });

      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(error.message || "Không tải được lịch sử tồn kho.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeModal() {
    revokePreviews(editImages.previews);

    setActiveModal(null);
    setEditingProduct(null);
    setSelectedProduct(null);
    setVariants([]);
    setHistory([]);
    setEditImages(createEmptyImageState());
    setEditExistingImages([]);
  }

  useEffect(() => {
    loadData();

    return () => {
      revokePreviews(createImages.previews);
      revokePreviews(editImages.previews);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    categories,
    filteredProducts,
    stats,

    productForm,
    editForm,
    variantForm,
    stockForm,

    createImages,
    editImages,
    createVariantDrafts,
    editExistingImages,

    editingProduct,
    selectedProduct,
    variants,
    history,
    activeModal,

    searchText,
    selectedCategoryFilter,

    pageLoading,
    productLoading,
    editLoading,
    deleteLoadingId,
    stockLoading,
    variantLoading,
    historyLoading,

    setSearchText,
    setSelectedCategoryFilter,

    updateProductForm,
    updateEditForm,
    updateVariantForm,
    updateStockForm,

    generateBarcodeForCreate,
    generateBarcodeForEdit,
    addCreateVariantDraft,
    updateCreateVariantDraft,
    removeCreateVariantDraft,

    addImageFiles,
    removeNewImage,
    removeExistingEditImage,

    loadData,
    handleCreateProduct,
    openEditModal,
    handleUpdateProduct,
    handleDeleteProduct,
    openStockModal,
    handleStockIn,
    openVariantModal,
    handleCreateVariant,
    handleDeleteVariant,
    openHistoryModal,
    closeModal,
  };
}
