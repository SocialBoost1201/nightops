'use client';

import { useMemo, useState } from 'react';
import { Braces, ChevronDown, ChevronRight } from 'lucide-react';

interface JsonSnapshotViewerProps {
  title: string;
  data: unknown;
  defaultExpanded?: boolean;
}

function stringifySnapshot(data: unknown): string {
  if (data === null || data === undefined) {
    return '-';
  }

  if (typeof data === 'string') {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return '[Unserializable snapshot]';
  }
}

export function JsonSnapshotViewer({
  title,
  data,
  defaultExpanded = false,
}: JsonSnapshotViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const renderedJson = useMemo(() => stringifySnapshot(data), [data]);

  return (
    <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full px-4 py-3 border-b border-gray-800 bg-[#151515] flex items-center justify-between text-sm"
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span className="inline-flex items-center gap-2 text-gray-200">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Braces size={14} className="text-gray-500" />
          {title}
        </span>
        <span className="text-[11px] text-gray-500">{isExpanded ? 'Hide' : 'Show'}</span>
      </button>

      {isExpanded && (
        <pre className="max-h-80 overflow-auto text-[12px] leading-5 text-gray-300 p-4 font-mono whitespace-pre-wrap break-words">
          {renderedJson}
        </pre>
      )}
    </div>
  );
}
