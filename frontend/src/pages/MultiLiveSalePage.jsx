import { useParams } from "react-router-dom";
import {
  MultiCommentFeed,
  MultiLiveFilters,
  MultiLiveHeader,
  OrderBottomSheet,
} from "../features/multi-live/MultiLiveSections";
import { useMultiLiveSaleController } from "../features/multi-live/useMultiLiveSaleController";

export default function MultiLiveSalePage() {
  const { eventId } = useParams();
  const live = useMultiLiveSaleController(eventId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-3 px-3 pb-6 sm:space-y-5 sm:px-0">
      <MultiLiveHeader
        event={live.event}
        counts={live.counts}
        onRefresh={() => live.loadData({ force: true })}
      />

      <MultiLiveFilters
        platformFilter={live.platformFilter}
        statusFilter={live.statusFilter}
        counts={live.counts}
        onPlatformChange={live.setPlatformFilter}
        onStatusChange={live.setStatusFilter}
      />

      <MultiCommentFeed
        comments={live.filteredComments}
        loading={live.loading}
        onSelectComment={live.openOrderSheet}
      />

      <OrderBottomSheet
        comment={live.selectedComment}
        products={live.products}
        form={live.orderForm}
        items={live.orderItems}
        subtotal={live.orderSubtotal}
        total={live.orderTotal}
        loading={live.orderLoading}
        customerLookupLoading={live.customerLookupLoading}
        customerLookupMessage={live.customerLookupMessage}
        onChange={live.updateOrderForm}
        onItemChange={live.updateOrderItem}
        onAddItem={live.addOrderItem}
        onRemoveItem={live.removeOrderItem}
        onSubmit={live.handleCreateOrder}
        onClose={live.closeOrderSheet}
      />
    </div>
  );
}
