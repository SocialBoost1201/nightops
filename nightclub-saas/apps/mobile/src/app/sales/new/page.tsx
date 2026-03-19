"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { CustomNumpad } from "@/components/ui/CustomNumpad";
import { SwipeToSubmit } from "@/components/ui/SwipeToSubmit";
import { UndoToast } from "@/components/ui/UndoToast";
import { clsx } from "clsx";
import { useSalesInput } from "@/hooks/useSalesInput";
import { useSoftSubmit } from "@/hooks/useSoftSubmit";

function MobileSalesInputInner() {
  const searchParams = useSearchParams();
  const castId = searchParams.get("castId") ?? "";
  const castName = searchParams.get("castName") ?? "キャスト";
  const businessDate = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const { amountRaw, formattedAmount, handleInput, handleDelete, handleClear, setAmountRaw } = useSalesInput();
  const { isSubmitting, showSuccessFlash, submitError, undoState, handleSubmit, handleUndo, handleUndoDismiss } =
    useSoftSubmit(handleClear, setAmountRaw, { castId, castName, businessDate });

  return (
    <ScreenLayout
      header={
        <div className="flex items-center justify-between">
          <button className="text-gray-400 p-2 -ml-2 select-none active:opacity-50">← 戻る</button>
          <div className="text-sm font-bold text-gray-300">
            {businessDate} 稼働中
          </div>
          <button
            onClick={handleClear}
            className="text-red-400 text-sm font-bold p-2 active:opacity-50 select-none"
          >
            クリア
          </button>
        </div>
      }
      footer={
        <div className="w-full relative">
          <CustomNumpad
            onInput={handleInput}
            onDelete={handleDelete}
            onClear={handleClear}
            disabled={isSubmitting || undoState.isVisible}
          />
          <div className="px-4 mt-2">
            <SwipeToSubmit
              onConfirm={() => handleSubmit(amountRaw)}
              isLoading={isSubmitting}
              disabled={amountRaw === "0" || undoState.isVisible}
            />
          </div>
        </div>
      }
    >
      {/* Screen-wide success flash */}
      {showSuccessFlash && (
        <div className="absolute inset-0 bg-green-500/20 z-50 pointer-events-none transition-opacity duration-1000 opacity-0 animate-[flash_1s_ease-out]" />
      )}

      {/* Undo Toast Overlay */}
      <UndoToast
        isVisible={undoState.isVisible}
        message={`${undoState.castName}: ¥${Number(undoState.amount).toLocaleString()} を登録しました`}
        onUndo={handleUndo}
        onDismiss={handleUndoDismiss}
        durationMs={5000}
      />

      {submitError && (
        <div className="absolute top-4 left-4 right-4 bg-red-900/80 text-red-200 text-xs px-4 py-2 rounded-lg z-50">
          送信エラー: {submitError}
        </div>
      )}

      <div className="w-full flex-1 flex flex-col justify-center relative z-10">
        {/* Cast Display */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-xl border border-blue-500/30">👩</div>
          <span className="font-bold text-xl text-white">{castName}</span>
          {!castId && (
            <span className="text-amber-400 text-xs bg-amber-900/30 px-2 py-1 rounded-full">ID未設定</span>
          )}
        </div>

        {/* Amount Display */}
        <div className="flex flex-col items-center justify-center mb-10 w-full">
          <p className="text-blue-500 text-sm mb-2 uppercase tracking-widest font-bold">入力金額</p>
          <div
            className={clsx(
              "text-6xl font-extrabold tracking-tighter flex items-end transition-colors duration-150",
              amountRaw === "0" ? "text-gray-600" : "text-white"
            )}
            style={{
              fontSize: amountRaw.length > 6 ? "3.5rem" : "4rem",
              lineHeight: 1,
            }}
          >
            <span className={clsx("text-3xl mr-2 mb-1", amountRaw === "0" ? "text-gray-700" : "text-blue-400")}>¥</span>
            {formattedAmount}
          </div>

          <div className="h-6 mt-4 text-blue-400/80 text-sm font-bold tracking-widest uppercase">
            {amountRaw !== "0" ? "入力中..." : " "}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
}

export default function MobileSalesInputPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <MobileSalesInputInner />
    </Suspense>
  );
}
