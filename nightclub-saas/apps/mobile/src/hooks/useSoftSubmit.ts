import { useState, useCallback } from "react";

export function useSoftSubmit(onClearDraft: () => void, setAmountRaw: (val: string) => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  
  const [undoState, setUndoState] = useState<{
    isVisible: boolean;
    amount: string;
    castName: string;
    timeoutId?: NodeJS.Timeout;
  }>({ isVisible: false, amount: "0", castName: "" });

  const handleSubmit = useCallback(async (amountRaw: string) => {
    if (amountRaw === "0") return;
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setIsSubmitting(false);
    setShowSuccessFlash(true);
    
    const submittedAmount = amountRaw;
    const submittedCastName = "さくら"; 
    
    onClearDraft();

    setTimeout(() => {
      setShowSuccessFlash(false);
    }, 1000);

    const realSendTimeout = setTimeout(() => {
      console.log(`[API SENT] ${submittedCastName}: ¥${submittedAmount}`);
      setUndoState(prev => ({ ...prev, isVisible: false }));
    }, 5000);

    setUndoState({
      isVisible: true,
      amount: submittedAmount,
      castName: submittedCastName,
      timeoutId: realSendTimeout,
    });
  }, [onClearDraft]);

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

  return { isSubmitting, showSuccessFlash, undoState, handleSubmit, handleUndo, handleUndoDismiss };
}
