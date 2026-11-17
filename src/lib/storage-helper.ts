import { createAdminClient } from './supabase-server';

/**
 * Uploads a base64 Data URL to Supabase Storage.
 */
export async function uploadBase64Image(
  bucket: string,
  filePath: string,
  dataUrl: string
): Promise<string> {
  const admin = createAdminClient();
  if (!admin) {
    // If Supabase is not configured, return the data URL as fallback
    return dataUrl;
  }

  // Parse mime type and clean base64 string
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return dataUrl; // Not a base64 data url, return as is
  }

  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  const { data, error } = await admin.storage.from(bucket).upload(filePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error(`Storage upload error for ${filePath}:`, error);
    return dataUrl;
  }

  const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(filePath);
  return publicUrlData?.publicUrl || dataUrl;
}

/**
 * Resolves any legacy 'orders:...' relative path into a direct, browser-renderable public URL.
 */
export function resolveOrderMediaUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  if (
    rawUrl.startsWith('data:image/') ||
    rawUrl.startsWith('http://') ||
    rawUrl.startsWith('https://') ||
    rawUrl.startsWith('/')
  ) {
    return rawUrl;
  }
  if (rawUrl.startsWith('orders:')) {
    const cleanPath = rawUrl.slice(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aogeqovceacvhtvkwswk.supabase.co';
    return `${supabaseUrl}/storage/v1/object/public/orders/${cleanPath}`;
  }
  return rawUrl;
}

/**
 * Generates a signed URL for private bucket objects (or returns public URL).
 */
export async function getSignedMediaUrl(bucket: string, filePath: string, expiresIn = 3600): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return filePath;

  const cleanPath = filePath.startsWith('orders:') ? filePath.slice(7) : filePath;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(cleanPath, expiresIn);

  if (error || !data) {
    return resolveOrderMediaUrl(filePath);
  }

  return data.signedUrl;
}
