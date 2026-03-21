// lib/storageSupabase.ts
// Adaptado do padrão Sinapse para anexos de OS (imagens + PDF)
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "pdv-edl-imagens";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg","image/png","image/webp","image/gif","application/pdf"];

function safeName(name: string) {
  return String(name || "arquivo").replace(/[^\w.\-]+/g, "_");
}

async function ensureBucket() {
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) throw new Error(`Supabase listBuckets: ${error.message}`);
  if ((buckets || []).some((b) => b.name === BUCKET)) return;

  const { error: err } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_SIZE,
    allowedMimeTypes: ALLOWED_TYPES,
  });
  if (err) throw new Error(`Supabase createBucket: ${err.message}`);
}

export async function uploadAnexoOS(args: {
  osId: string;
  file: Buffer;
  filename: string;
  contentType: string;
}): Promise<{ src: string; publicUrl: string; path: string }> {
  if (!ALLOWED_TYPES.includes(args.contentType)) {
    throw new Error(`Tipo não permitido: ${args.contentType}`);
  }

  await ensureBucket();

  const filename = safeName(args.filename);
  const objectPath = `os/${args.osId}/${Date.now()}-${filename}`;

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(objectPath, args.file, {
    contentType: args.contentType,
    upsert: false,
  });
  if (error) throw new Error(`Supabase upload: ${error.message}`);

  const publicUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
  const src = `supabase://${BUCKET}/${objectPath}`;

  return { src, publicUrl, path: objectPath };
}

export async function deleteAnexoOS(path: string) {
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Supabase delete: ${error.message}`);
}

export function parseSupabaseSrc(src: string): { bucket: string; path: string } | null {
  const m = String(src).match(/^supabase:\/\/([^\/]+)\/(.+)$/i);
  if (!m) return null;
  return { bucket: m[1], path: m[2] };
}

export function isSupabaseSrc(src: string) {
  return /^supabase:\/\/[^\/]+\/.+/i.test(String(src));
}