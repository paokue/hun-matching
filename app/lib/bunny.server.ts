const BUNNY_API_KEY = process.env.BUNNY_CDN_API_KEY!;
const STORAGE_ZONE = process.env.BUNNY_CDN_STORAGE_ZONE!;
const CDN_HOST = process.env.BUNNY_CDN_HOST!; // pull-zone host, includes protocol
const BUNNY_STORAGE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;

export function getCDNUrl(path: string) {
  return `${CDN_HOST}/${path}`;
}

export async function uploadToBunny(
  fileBuffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const url = `${BUNNY_STORAGE_URL}/${path}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: BUNNY_API_KEY,
      "Content-Type": contentType,
    },
    body: fileBuffer as unknown as BodyInit,
  });
  if (!response.ok) {
    throw new Error(`BunnyCDN upload failed: ${response.statusText}`);
  }
  return getCDNUrl(path);
}

export async function deleteFromBunny(path: string): Promise<void> {
  const url = `${BUNNY_STORAGE_URL}/${path}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { AccessKey: BUNNY_API_KEY },
  });
  if (!response.ok) {
    throw new Error(`BunnyCDN delete failed: ${response.statusText}`);
  }
}

// Files are keyed by a stable identifier (phone for applicants, agencyId for agencies).
// e.g. generateFilePath("profile", "+856 20 5512 3456", "x.jpg") → "profile/1716600000000-8562055123456.jpg"
export function generateFilePath(
  folder: string,
  key: string,
  filename: string
): string {
  const ext = filename.split(".").pop();
  const rand = Date.now();
  const cleanKey = (key || "unknown").replace(/[^0-9a-zA-Z]/g, "");
  return `${folder}/${rand}-${cleanKey}.${ext}`;
}

export async function parseMultipartForm(request: Request): Promise<{
  fields: Record<string, string>;
  files: Record<string, { buffer: Buffer; filename: string; contentType: string }[]>;
}> {
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  const files: Record<
    string,
    { buffer: Buffer; filename: string; contentType: string }[]
  > = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer());
      if (!files[key]) files[key] = [];
      files[key].push({
        buffer,
        filename: value.name,
        contentType: value.type,
      });
    } else {
      fields[key] = value;
    }
  }
  return { fields, files };
}
