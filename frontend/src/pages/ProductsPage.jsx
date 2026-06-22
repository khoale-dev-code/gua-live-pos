import {
  HistoryModal,
  ProductCreateSection,
  ProductEditModal,
  ProductListSection,
  ProductsHero,
  StockInModal,
  VariantsModal,
} from "../features/products/ProductPageSections";
import { useProductsController } from "../features/products/useProductsController";

export default function ProductsPage() {
  const controller = useProductsController();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5">
      <ProductsHero
        stats={controller.stats}
        onRefresh={() => controller.loadData({ force: true })}
      />

      <ProductCreateSection
        form={controller.productForm}
        categories={controller.categories}
        loading={controller.productLoading}
        imageState={controller.createImages}
        existingImages={[]}
        onSubmit={controller.handleCreateProduct}
        onChange={controller.updateProductForm}
        onFilesChange={controller.addImageFiles}
        onRemoveNewImage={controller.removeNewImage}
        onRemoveExistingImage={() => {}}
        onGenerateBarcode={controller.generateBarcodeForCreate}
        variantDrafts={controller.createVariantDrafts}
        onAddVariantDraft={controller.addCreateVariantDraft}
        onUpdateVariantDraft={controller.updateCreateVariantDraft}
        onRemoveVariantDraft={controller.removeCreateVariantDraft}
      />

      <ProductListSection
        products={controller.filteredProducts}
        categories={controller.categories}
        searchText={controller.searchText}
        selectedCategoryFilter={controller.selectedCategoryFilter}
        pageLoading={controller.pageLoading}
        deleteLoadingId={controller.deleteLoadingId}
        onSearchChange={controller.setSearchText}
        onCategoryFilterChange={controller.setSelectedCategoryFilter}
        onEdit={controller.openEditModal}
        onDelete={controller.handleDeleteProduct}
        onStockIn={controller.openStockModal}
        onVariants={controller.openVariantModal}
        onHistory={controller.openHistoryModal}
      />

      {controller.activeModal === "edit" && (
        <ProductEditModal
          product={controller.editingProduct}
          form={controller.editForm}
          categories={controller.categories}
          loading={controller.editLoading}
          imageState={controller.editImages}
          existingImages={controller.editExistingImages}
          onSubmit={controller.handleUpdateProduct}
          onChange={controller.updateEditForm}
          onFilesChange={controller.addImageFiles}
          onRemoveNewImage={controller.removeNewImage}
          onRemoveExistingImage={controller.removeExistingEditImage}
          onGenerateBarcode={controller.generateBarcodeForEdit}
          onClose={controller.closeModal}
        />
      )}

      {controller.activeModal === "stock" && (
        <StockInModal
          product={controller.selectedProduct}
          variants={controller.variants}
          form={controller.stockForm}
          loading={controller.stockLoading}
          onChange={controller.updateStockForm}
          onSubmit={controller.handleStockIn}
          onClose={controller.closeModal}
        />
      )}

      {controller.activeModal === "variants" && (
        <VariantsModal
          product={controller.selectedProduct}
          variants={controller.variants}
          form={controller.variantForm}
          loading={controller.variantLoading}
          onChange={controller.updateVariantForm}
          onSubmit={controller.handleCreateVariant}
          onDelete={controller.handleDeleteVariant}
          onClose={controller.closeModal}
        />
      )}

      {controller.activeModal === "history" && (
        <HistoryModal
          product={controller.selectedProduct}
          history={controller.history}
          loading={controller.historyLoading}
          onClose={controller.closeModal}
        />
      )}
    </div>
  );
}
