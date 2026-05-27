"use client";

type Props = {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, total, limit, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-sm text-gray-500">
      <span>
        {total === 0 ? "0件" : `${from}–${to} / ${total}件`}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 rounded border border-gray-700 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          前へ
        </button>
        <span className="px-3 py-1 text-gray-400">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 rounded border border-gray-700 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
