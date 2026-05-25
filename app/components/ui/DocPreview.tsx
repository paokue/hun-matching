import { useState } from "react";

function isPdf(url: string) {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

interface DocPreviewProps {
  url: string;
  label: string;
  viewLabel?: string;
}

// Thumbnail preview for an uploaded document (image or PDF). Click opens a full modal.
export function DocPreview({ url, label, viewLabel = "View" }: DocPreviewProps) {
  const [open, setOpen] = useState(false);
  const pdf = isPdf(url);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
      >
        {pdf ? (
          <>
            <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title={label} className="w-full h-full pointer-events-none" />
            <span className="absolute bottom-1 left-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PDF</span>
          </>
        ) : (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold transition-opacity">{viewLabel}</span>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {pdf ? (
              <iframe src={url} title={label} className="w-full h-[85vh] rounded-xl bg-white shadow-2xl" />
            ) : (
              <img src={url} alt={label} className="max-h-[88vh] w-auto mx-auto rounded-xl shadow-2xl" />
            )}
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-slate-900"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
