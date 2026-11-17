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

  if (bucket === 'media') {
    const { data: publicUrlData } = admin.storage.from(bucket).getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  }

  return `orders:${data.path}`;
}

/**
 * Generates a signed URL for private bucket objects.
 */
export async function getSignedMediaUrl(bucket: string, filePath: string, expiresIn = 3600): Promise<string> {
  const admin = createAdminClient();
  if (!admin) return filePath;

  const cleanPath = filePath.startsWith('orders:') ? filePath.slice(7) : filePath;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(cleanPath, expiresIn);

  if (error || !data) {
    return filePath;
  }

  return data.signedUrl;
}
