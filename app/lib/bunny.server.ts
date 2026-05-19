const BUNNY_API_KEY = process.env.BUNNY_CDN_API_KEY!;
const STORAGE_ZONE = process.env.BUNNY_CDN_STORAGE_ZONE!;
const CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME!;
const BUNNY_STORAGE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}`;

export function getCDNUrl(path: string) {
  return `https://${CDN_HOSTNAME}/${path}`;
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

export function generateFilePath(
  folder: string,
  userId: string,
  filename: string
): string {
  const ext = filename.split(".").pop();
  const timestamp = Date.now();
  return `${folder}/${userId}/${timestamp}.${ext}`;
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
