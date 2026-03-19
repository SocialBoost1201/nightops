import { useState, useCallback } from "react";
import { apiPost } from "@/lib/api";

interface SubmitParams {
  castId: string;
  castName: string;
  businessDate: string;
  externalMainCastId?: string; // 実際のUUID（URL等から取得）
}

export function useSoftSubmit(onClearDraft: () => void, setAmountRaw: (val: string) => void, params?: SubmitParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [undoState, setUndoState] = useState<{
    isVisible: boolean;
    amount: string;
    castName: string;
    slipId?: string;
    timeoutId?: NodeJS.Timeout;
  }>({ isVisible: false, amount: "0", castName: "" });

  const handleSubmit = useCallback(async (amountRaw: string) => {
    if (amountRaw === "0") return;

    setIsSubmitting(true);
    setSubmitError(null);
    await new Promise(resolve => setTimeout(resolve, 300));

    const submittedAmount = amountRaw;
    const submittedCastName = params?.castName ?? "キャスト";
    const mainCastId = params?.castId ?? "";
    const businessDate = params?.businessDate ?? new Date().toISOString().split("T")[0];

    setIsSubmitting(false);
    setShowSuccessFlash(true);
    onClearDraft();

    setTimeout(() => {
      setShowSuccessFlash(false);
    }, 1000);

    // 5秒後に実際にAPIへ送信（undo余地を残す）
    const realSendTimeout = setTimeout(async () => {
      if (!mainCastId) {
        console.warn("[useSoftSubmit] castId not provided, skipping API call");
        setUndoState(prev => ({ ...prev, isVisible: false }));
        return;
      }

      try {
        const slip = await apiPost<{ id: string }>("/sales/slips", {
          businessDate,
          mainCastId,
          partySize: 1,
          lines: [
            {
              itemCode: "FREE",
              itemName: "売上",
              qty: 1,
              unitPrice: Number(submittedAmount),
              amount: Number(submittedAmount),
            },
          ],
        });
        console.log("[useSoftSubmit] Slip created:", slip.id);
      } catch (err: any) {
        console.error("[useSoftSubmit] API error:", err.message);
        setSubmitError(err.message);
      }

      setUndoState(prev => ({ ...prev, isVisible: false }));
    }, 5000);

    setUndoState({
      isVisible: true,
      amount: submittedAmount,
      castName: submittedCastName,
      timeoutId: realSendTimeout,
    });
  }, [onClearDraft, params]);

  const handleUndo = useCallback(() => {
    if (undoState.timeoutId) {
      clearTimeout(undoState.timeoutId);
    }
    setUndoState(prev => ({ ...prev, isVisible: false }));
    setAmountRaw(undoState.amount);
  }, [undoState, setAmountRaw]);

  const handleUndoDismiss = useCallback(() => {
    setUndoState(prev => ({ ...prev, isVisible: false }));
  }, []);

  return { isSubmitting, showSuccessFlash, submitError, undoState, handleSubmit, handleUndo, handleUndoDismiss };
}
