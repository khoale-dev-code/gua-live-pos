import { supabase } from "./supabaseClient";

const BUCKET_NAME = "product-images";
const MAX_SIZE_MB = 5;

function getFileExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() || "jpg";
}

function makeSafeFileName(fileName) {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");

  return nameWithoutExt
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "");
}

export async function uploadProductImage(file) {
  if (!file) return null;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF");
  }

  const fileSizeMb = file.size / 1024 / 1024;

  if (fileSizeMb > MAX_SIZE_MB) {
    throw new Error(`Ảnh không được vượt quá ${MAX_SIZE_MB}MB`);
  }

  const ext = getFileExtension(file.name);
  const safeName = makeSafeFileName(file.name);
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}.${ext}`;
  const filePath = `products/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "Upload ảnh thất bại");
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

export async function uploadProductImages(files = []) {
  if (!files.length) return [];

  const uploadedUrls = [];

  for (const file of files) {
    const url = await uploadProductImage(file);
    if (url) uploadedUrls.push(url);
  }

  return uploadedUrls;
}
