type Props = {
  state: "loading" | "empty" | "error";
  message?: string;
  onRetry?: () => void;
};

export function StatePanel({ state, message, onRetry }: Props) {
  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">読み込み中…</span>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="text-red-400 text-2xl">!</div>
          <p className="text-red-400 text-sm font-medium">{message ?? "エラーが発生しました"}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-4 py-1.5 text-sm border border-gray-700 rounded hover:border-gray-500 text-gray-300 transition-colors"
            >
              再試行
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-20 text-gray-600">
      <p className="text-sm">{message ?? "データがありません"}</p>
    </div>
  );
}
