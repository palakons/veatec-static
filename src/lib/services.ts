import { getClientBatches, getClientBatchById } from "@/lib/client-api";
import { createClientOrder } from "@/lib/client-order-service";
import { uploadBytesResumable } from "firebase/storage";
import { isFirebaseConfigured, db, storage } from "./firebase";
import { BatchWithDetails, Shop, Order, BatchStatus } from "./types";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getLocationById } from "./locations";

// -------------------------------------------------------------
// Image / Slip Compression and Upload Handler
// -------------------------------------------------------------
// Image / Slip Compression and Upload Handler
// -------------------------------------------------------------
async function compressWithBitmap(blob: Blob, maxDim: number, quality: number): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    // Attempt with orientation preservation
    bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // Fallback without options (older WebKit / Android)
    bitmap = await createImageBitmap(blob);
  }

  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas context failed");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", quality);
}

async function compressWithFileReader(blob: Blob, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

async function compressWithObjectURL(blob: Blob, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(blob);
    } catch (err) {
      reject(err);
      return;
    }

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode image"));
    };

    img.src = objectUrl;
  });
}

async function compressWithServer(file: File | Blob): Promise<string> {
  throw new Error("Server compression disabled in static mode");
}

export async function compressImage(
  file: File,
  maxDim = 900,
  quality = 0.70
): Promise<string> {
  if (typeof window === "undefined") return "";

  // Check if file is HEIC / HEIF format
  const fileName = (file.name || "").toLowerCase();
  const fileType = (file.type || "").toLowerCase();
  const isHeic =
    fileType.includes("heic") ||
    fileType.includes("heif") ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif");

  let processableBlob: Blob = file;

  // Convert HEIC client-side if needed
  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default;
      const conv = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.8,
      });
      processableBlob = Array.isArray(conv) ? conv[0] : (conv as Blob);
    } catch (heicErr) {
      console.warn("Client-side heic2any conversion failed, will attempt fallbacks:", heicErr);
    }
  }

  let result = "";

  // Strategy 1: Hardware-accelerated createImageBitmap (fastest, lowest memory on mobile)
  if (typeof createImageBitmap !== "undefined") {
    try {
      result = await compressWithBitmap(processableBlob, maxDim, quality);
    } catch (err) {
      console.warn("createImageBitmap failed, falling back to FileReader:", err);
    }
  }

  // Strategy 2: FileReader DataURL with Image element (essential on Android Chrome for content URIs)
  if (!result) {
    try {
      result = await compressWithFileReader(processableBlob, maxDim, quality);
    } catch (err) {
      console.warn("FileReader image decode failed, falling back to ObjectURL:", err);
    }
  }

  // Strategy 3: URL.createObjectURL with Image element
  if (!result) {
    try {
      result = await compressWithObjectURL(processableBlob, maxDim, quality);
    } catch (err) {
      console.warn("compressWithObjectURL failed, attempting server fallback:", err);
    }
  }

  // Strategy 4: High-reliability Server-side Sharp Fallback (natively handles HEIC & complex EXIF)
  if (!result) {
    try {
      // Only send if within Vercel body limits (~4.2MB)
      if (file.size <= 4.2 * 1024 * 1024) {
        result = await compressWithServer(file);
      }
    } catch (err) {
      console.warn("Server-side compression fallback failed:", err);
    }
  }

  // Final check: Validate compressed result format
  if (!result || !result.startsWith("data:image/")) {
    throw new Error("ไม่สามารถประมวลผลรูปภาพได้ กรุณาถ่ายใหม่อีกครั้ง หรือเลือกจากอัลบั้ม");
  }

  // Extra safety: If base64 string is still > 1MB, downscale further to 640px
  if (result.length > 1024 * 1024) {
    try {
      if (typeof createImageBitmap !== "undefined") {
        result = await compressWithBitmap(processableBlob, 640, 0.60);
      } else {
        result = await compressWithFileReader(processableBlob, 640, 0.60);
      }
    } catch (err) {
      console.warn("Secondary compression failed, using first result:", err);
    }
  }

  return result;
}

export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const matches = dataUrl.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 Data URL");
  }
  const mimeType = matches[1] || "image/jpeg";
  const byteChars = atob(matches[2]);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return {
    blob: new Blob([byteArray], { type: mimeType }),
    mimeType,
  };
}

export interface DirectUploadResult {
  filePath: string;
  url: string;
  directUrl: string;
  proxyUrl: string;
}

/**
 * Uploads an image directly to Google Cloud Storage via V4 Presigned PUT URL.
 * Bypasses Vercel servers completely (0 bytes transferred through Vercel).
 * Accepts either a base64 Data URL string or a File/Blob.
 * Supports optional onProgress callback (0-100%).
 */
export async function uploadDirectToStorage(
  category: "slips" | "delivery" | "shops" | "locations" | "general",
  fileOrDataUrl: string | File | Blob,
  customFilename?: string,
  onProgress?: (percent: number) => void
): Promise<DirectUploadResult> {
  let blob: Blob;
  let mimeType = "image/jpeg";

  if (typeof fileOrDataUrl === "string") {
    const parsed = dataUrlToBlob(fileOrDataUrl);
    blob = parsed.blob;
    mimeType = parsed.mimeType;
  } else {
    blob = fileOrDataUrl;
    mimeType = fileOrDataUrl.type || "image/jpeg";
  }

  const filename = customFilename || `${category}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
  const filePath = `${category}/${filename}`;

  if (storage) {
    onProgress?.(20);
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: mimeType });

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot: any) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 75) + 20;
          onProgress?.(Math.min(95, pct));
        },
        (error: any) => reject(error),
        () => resolve()
      );
    });

    const downloadUrl = await getDownloadURL(storageRef);
    onProgress?.(100);

    return {
      filePath,
      url: downloadUrl,
      directUrl: downloadUrl,
      proxyUrl: downloadUrl,
    };
  }

  onProgress?.(100);
  const dataUrl = typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
  return {
    filePath,
    url: dataUrl,
    directUrl: dataUrl,
    proxyUrl: dataUrl,
  };
}

export async function uploadSlipImage(file: File): Promise<string> {
  // Always compress the slip first in-browser (~40-60 KB)
  let compressedDataUrl = "";
  try {
    compressedDataUrl = await compressImage(file, 640, 0.68);
  } catch (err) {
    console.warn("Slip compression failed, will fallback:", err);
  }

  const target = compressedDataUrl || file;
  try {
    const res = await uploadDirectToStorage("slips", target);
    return res.url;
  } catch (err) {
    console.warn("Direct slip upload failed, falling back to base64 Data URL:", err);
    return compressedDataUrl || "";
  }
}

// -------------------------------------------------------------
// Fetch Batches
// -------------------------------------------------------------
export async function getBatchesList(): Promise<BatchWithDetails[]> {
  return await getClientBatches();
}

// -------------------------------------------------------------
// Fetch Single Batch
// -------------------------------------------------------------
export async function getBatch(batchId: string): Promise<BatchWithDetails> {
  const b = await getClientBatchById(batchId);
  if (!b) throw new Error("Batch not found");
  return b;
}

// -------------------------------------------------------------
// Real-time Batch Subscription (Firestore or Polling)
// -------------------------------------------------------------
export function subscribeToBatch(
  batchId: string,
  onUpdate: (batch: BatchWithDetails) => void
): () => void {
  // If Firebase is active and initialized
  if (isFirebaseConfigured && db) {
    try {
      const batchRef = doc(db, "batches", batchId);
      const unsubscribe = onSnapshot(batchRef, async (docSnap) => {
        if (docSnap.exists()) {
          const enriched = await getClientBatchById(batchId);
          if (enriched) onUpdate(enriched);
        }
      });
      return unsubscribe;
    } catch (err) {
      console.warn("Firestore subscription failed, falling back to polling", err);
    }
  }

  // No background polling to preserve Firestore quota
  return () => {};
}

// -------------------------------------------------------------
// Submit Order
// -------------------------------------------------------------
export async function placeOrder(orderData: {
  batchId: string;
  customerName: string;
  customerPhone: string;
  locationId: string;
  items: Array<{ name: string; price: number; quantity: number; customNote?: string }>;
  totalAmount: number;
  slipFile?: File;
  slipImageUrl?: string;
}): Promise<{ order: Order; batch: BatchWithDetails }> {
  let slipUrl = orderData.slipImageUrl;

  if (orderData.slipFile) {
    slipUrl = await uploadSlipImage(orderData.slipFile);
  }

  if (!slipUrl) {
    throw new Error("Payment slip is required");
  }

  const order = await createClientOrder({
    batchId: orderData.batchId,
    customerName: orderData.customerName,
    customerPhone: orderData.customerPhone,
    locationId: orderData.locationId,
    items: orderData.items,
    totalAmount: orderData.totalAmount,
    slipImageUrl: slipUrl,
  });

  const batch = await getClientBatchById(orderData.batchId);
  return {
    order,
    batch: batch as any,
  };
}

// -------------------------------------------------------------
// Update Batch Status
// -------------------------------------------------------------
export async function changeBatchStatus(
  batchId: string,
  status: BatchStatus,
  deliveryPhotoUrl?: string,
  deliveryPhotoPath?: string
): Promise<any> {
  let finalUrl = deliveryPhotoUrl;
  let finalPath = deliveryPhotoPath;

  if (deliveryPhotoUrl && deliveryPhotoUrl.startsWith("data:image/")) {
    try {
      const directUpload = await uploadDirectToStorage("delivery", deliveryPhotoUrl, `delivery_${batchId}.jpg`);
      finalUrl = directUpload.url;
      finalPath = directUpload.filePath;
    } catch (uploadErr) {
      console.warn("Direct delivery upload failed, falling back to payload:", uploadErr);
    }
  }

  const updatePayload: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (finalUrl) updatePayload.deliveryPhotoUrl = finalUrl;
  if (finalPath) updatePayload.deliveryPhotoPath = finalPath;

  if (db) {
    await updateDoc(doc(db, "batches", batchId), updatePayload);
  }
  return { id: batchId, ...updatePayload };
}

