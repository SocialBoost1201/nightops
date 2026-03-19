import { useState, useCallback, useEffect } from "react";

const DRAFT_KEY = "nightops_sales_draft";

export function useSalesInput() {
  const [amountRaw, setAmountRaw] = useState<string>("0");

  useEffect(() => {
    try {
      const draftRaw = localStorage.getItem(DRAFT_KEY);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        const CAST_ID = "sakura"; 
        const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
        const now = Date.now();
        
        if (
          draft.castId === CAST_ID &&
          draft.updatedAt &&
          (now - draft.updatedAt) <= THREE_HOURS_MS &&
          !isNaN(Number(draft.amount)) &&
          Number(draft.amount) > 0
        ) {
          setAmountRaw(draft.amount);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch (e) {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (amountRaw !== "0") {
      const draft = {
        amount: amountRaw,
        castId: "sakura", 
        updatedAt: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [amountRaw]);

  const handleInput = useCallback((val: string) => {
    setAmountRaw((prev) => {
      let nextValue: string;
      if (prev === "0") {
        if (val === "0" || val === "00") return "0";
        nextValue = val;
      } else {
        nextValue = prev + val;
      }
      if (Number(nextValue) > 9999999) return prev;
      return nextValue;
    });
  }, []);

  const handleDelete = useCallback(() => {
    setAmountRaw((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  }, []);

  const handleClear = useCallback(() => {
    setAmountRaw("0");
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const formattedAmount = Number(amountRaw).toLocaleString("ja-JP");

  return { amountRaw, formattedAmount, handleInput, handleDelete, handleClear, setAmountRaw };
}
