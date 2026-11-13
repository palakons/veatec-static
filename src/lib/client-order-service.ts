import { db, isFirebaseConfigured } from "@/lib/firebase";
import { fetchWithVeatecAuth, VEATEC_FUNCTIONS_CONFIG } from "@/lib/functions-client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import type { Order } from "@/lib/types";

export interface CreateClientOrderInput {
  batchId: string;
  customerName: string;
  customerPhone?: string;
  customerLineId?: string;
  locationId?: string;
  items: Array<{ id?: string; name: string; price: number; quantity: number; customNote?: string }>;
  totalAmount: number;
  slipImageUrl: string;
  slipImagePath?: string;
  slipTransRef?: string;
  slipBankCode?: string;
  slipBankName?: string;
  isSlipVerified?: boolean;
}

export async function createClientOrder(input: CreateClientOrderInput): Promise<Order> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง");
  }

  // 1. Verify batch exists and is OPEN
  const batchRef = doc(db, "batches", input.batchId);
  const batchSnap = await getDoc(batchRef);
  if (!batchSnap.exists()) {
    throw new Error("ไม่พบข้อมูลรอบสั่งอาหาร (Batch not found)");
  }
  const batchData = batchSnap.data() as any;
  if (batchData.status !== "OPEN") {
    throw new Error("รอบนี้ปิดรับออเดอร์แล้ว");
  }

  // 2. Fetch existing orders for this batch to compute orderNumber and check duplicate slip
  const ordersColl = collection(db, "orders");
  const q = query(ordersColl, where("batchId", "==", input.batchId));
  const snap = await getDocs(q);
  const existingOrders: Order[] = snap.docs
    .map((d) => d.data() as Order)
    .filter((o) => !o.deletedAt);

  if (input.slipTransRef && existingOrders.some((o) => o.slipTransRef === input.slipTransRef)) {
    throw new Error(`สลิปรหัสอ้างอิง ${input.slipTransRef} นี้ถูกใช้งานไปแล้วในรอบนี้`);
  }

  const orderNumber = existingOrders.length + 1;
  const locCode = input.locationId === "loc-m4" ? "M4" : (input.locationId || "LOC");
  const itemsSummary = input.items.map((i) => i.name).join(" + ");
  const lineTag = input.customerLineId ? `@${input.customerLineId}` : input.customerName;
  const boxLabel = `#${String(orderNumber).padStart(2, "0")} ${lineTag} - ${locCode} [${itemsSummary}]`;

  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber,
    batchId: input.batchId,
    customerName: input.customerName,
    customerPhone: input.customerPhone || "",
    customerLineId: input.customerLineId || "",
    locationId: input.locationId || "loc-m4",
    items: input.items.map((it, idx) => ({
      id: it.id || `item-${Date.now()}-${idx}`,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      customNote: it.customNote,
    })),
    totalAmount: input.totalAmount,
    slipImageUrl: input.slipImageUrl,
    slipImagePath: input.slipImagePath,
    slipTransRef: input.slipTransRef,
    slipBankCode: input.slipBankCode,
    slipBankName: input.slipBankName,
    isSlipVerified: input.isSlipVerified ?? Boolean(input.slipImageUrl),
    createdAt: new Date().toISOString(),
    boxLabel,
  };

  // 3. Write order document
  await setDoc(doc(db, "orders", newOrder.id), JSON.parse(JSON.stringify(newOrder)));

  return newOrder;
}

export async function deleteClientOrder(
  orderId: string,
  reason = "Cancelled by user/host",
  by = "Host"
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  const orderRef = doc(db, "orders", orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) return false;

  await updateDoc(orderRef, {
    deletedAt: new Date().toISOString(),
    deletedReason: `${reason} (by ${by})`,
  });
  return true;
}

export interface CreateBatchInput {
  shopId: string;
  date: string;
  cutoffTime: string;
  targetMinAmount: number;
  notes?: string;
  hostLineId?: string;
  hostPhone?: string;
  hostName?: string;
  hostPin: string;
  buildingId: string;
  buildingName: string;
}

export async function createClientBatch(input: CreateBatchInput): Promise<any> {
  if (!isFirebaseConfigured || !db) {
    throw new Error("ระบบฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง");
  }

  const batchId = `batch-${Date.now()}`;
  const newBatch = {
    id: batchId,
    shopId: input.shopId,
    date: input.date,
    cutoffTime: input.cutoffTime,
    targetMinAmount: input.targetMinAmount,
    currentTotalAmount: 0,
    status: "OPEN",
    notes: input.notes || "",
    hostLineId: input.hostLineId || "",
    hostPhone: input.hostPhone || "",
    hostName: input.hostName || "",
    hostPin: input.hostPin,
    buildingId: input.buildingId,
    buildingName: input.buildingName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "batches", batchId), JSON.parse(JSON.stringify(newBatch)));

  // Trigger serverless LINE notification via Cloud Function (Protected with App Secret)
  try {
    await fetchWithVeatecAuth(VEATEC_FUNCTIONS_CONFIG.sendLineNotificationUrl, {
      method: "POST",
      keepalive: true,
      body: JSON.stringify({ batchId, type: "new_board" }),
    });
  } catch (e) {
    console.warn("Cloud function line notify error:", e);
  }

  return newBatch;
}

export async function updateClientBatchStatus(batchId: string, status: string, hostPin?: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  const batchRef = doc(db, "batches", batchId);
  const snap = await getDoc(batchRef);
  if (!snap.exists()) return false;

  const data = snap.data() as any;
  if (hostPin && data.hostPin && data.hostPin !== hostPin) {
    throw new Error("PIN หัวหน้าตี้ไม่ถูกต้อง");
  }

  await updateDoc(batchRef, {
    status,
    updatedAt: new Date().toISOString(),
  });
  return true;
}
