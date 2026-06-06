// Browser-side image downscale + re-encode helper.
// Photos straight from a modern phone camera are 4–12 MB each; uploading 10 of
// them in one multipart POST blows past most hosting platforms' request-body
// limits (Vercel 4.5 MB hobby, Netlify ~6 MB, etc.) and crashes the action
// before our error handler even runs. Compressing to ~1920px / JPEG 0.85
// brings each file down to ~200–500 KB while staying visually crisp.
//
// Safe to call from any event handler — no-ops on the server or if the browser
// can't read the file. Returns the original file as a fallback so the upload
// never silently disappears.

const DEFAULT_MAX_DIM = 1920;
const DEFAULT_QUALITY = 0.85;

export async function compressImage(
  file: File,
  options: { maxDim?: number; quality?: number; minBytes?: number } = {},
): Promise<File> {
  const maxDim = options.maxDim ?? DEFAULT_MAX_DIM;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const minBytes = options.minBytes ?? 500 * 1024; // skip compression for <500 KB files

  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.size < minBytes) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let { width, height } = img;
    if (width === 0 || height === 0) return file;

    if (width > maxDim || height > maxDim) {
      const scale = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file; // never make it bigger

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}
