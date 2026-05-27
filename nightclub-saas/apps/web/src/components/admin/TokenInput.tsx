"use client";

type Props = {
  token: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  label?: string;
};

export function TokenInput({ token, onChange, onSubmit, loading, label = "Bearer Token" }: Props) {
  return (
    <div className="flex gap-3 items-center">
      <input
        type="password"
        placeholder={label}
        value={token}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className="flex-1 max-w-sm bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={onSubmit}
        disabled={loading || !token}
        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
      >
        {loading ? "読込中…" : "読み込む"}
      </button>
    </div>
  );
}
