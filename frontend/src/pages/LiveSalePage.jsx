import { useParams } from "react-router-dom";
import { useLiveSaleController } from "../features/live-sale/useLiveSaleController";
import {
  CommentList,
  LiveSaleHero,
  OrderModal,
} from "../features/live-sale/LiveSaleSections";

export default function LiveSalePage() {
  const { sessionId } = useParams();
  const liveSale = useLiveSaleController(sessionId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-5">
      <LiveSaleHero
        sessionId={sessionId}
        comments={liveSale.comments}
        onRefresh={() =>
          liveSale.loadComments({
            silent: false,
            force: true,
          })
        }
      />

      <CommentList
        comments={liveSale.comments}
        loading={liveSale.loading}
        errorMessage={liveSale.errorMessage}
        onSelectComment={liveSale.openOrderSheet}
        onRefresh={() =>
          liveSale.loadComments({
            silent: false,
            force: true,
          })
        }
      />

      <OrderModal {...liveSale} />
    </div>
  );
}
