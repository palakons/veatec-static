import { isFirebaseConfigured, db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import type { Batch, BatchWithDetails, Shop, Order } from "./types";
import { CAMPUS_LOCATIONS, DeliveryLocation } from "./locations";
import { resolveImageUrl } from "./image-url";

function sanitizeShopImages(shop: Shop): Shop {
  return {
    ...shop,
    menuImageUrl: resolveImageUrl(shop.menuImageUrl) || shop.menuImageUrl,
    promptpayQrUrl: resolveImageUrl(shop.promptpayQrUrl) || shop.promptpayQrUrl,
    lineQrUrl: resolveImageUrl(shop.lineQrUrl) || shop.lineQrUrl,
  };
}

function sanitizeLocationImages(loc: DeliveryLocation): DeliveryLocation {
  return {
    ...loc,
    photoUrl: resolveImageUrl(loc.photoUrl) || loc.photoUrl,
  };
}

const FALLBACK_SHOPS: Shop[] = [
  {
    id: "shop-pa-tai",
    name: "ครัวป้าต่าย ป่ายุบใน",
    nameEn: "Krua Pa Tai (Payubnai - Wangchan)",
    cuisine: "อาหารตามสั่งพื้นบ้าน / ปลอดโฟมรักษ์ระยอง",
    description: "ร้านอาหารตามสั่งขวัญใจชุมชนป่ายุบใน ใกล้ VISTEC รสจัดจ้าน ให้เยอะ ร้านต้นแบบปลอดโฟมรักษ์ระยอง",
    phone: "089-245-8891",
    lineId: "patai_payubnai",
    gmapUrl: "https://maps.google.com/?q=ครัวป้าต่าย+ป่ายุบใน+วังจันทร์+ระยอง",
    promptpayNumber: "0892458891",
    promptpayAccountName: "ครัวป้าต่าย ป่ายุบใน",
    promptpayQrUrl: "https://promptpay.io/0892458891.png",
    menuImageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    minDeliveryAmount: 200,
    defaultCutoffTime: "11:15",
    isActive: true,
    openDays: [1, 2, 3, 4, 5],
    menuItems: [],
  },
];

export async function getClientDeliveryLocations(): Promise<DeliveryLocation[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "locations"));
      if (!snap.empty) {
        return snap.docs.map((d) => sanitizeLocationImages(d.data() as DeliveryLocation));
      }
    } catch (err) {
      console.warn("Client Firestore getLocations error:", err);
    }
  }
  return CAMPUS_LOCATIONS.map(sanitizeLocationImages);
}

export async function getClientShops(): Promise<Shop[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "shops"));
      if (!snap.empty) {
        return snap.docs.map((d) => sanitizeShopImages(d.data() as Shop));
      }
    } catch (err) {
      console.warn("Client Firestore getShops error:", err);
    }
  }
  return FALLBACK_SHOPS.map(sanitizeShopImages);
}

export async function getClientBatches(): Promise<BatchWithDetails[]> {
  if (isFirebaseConfigured && db) {
    try {
      const [batchesSnap, ordersSnap, shopsSnap] = await Promise.all([
        getDocs(collection(db, "batches")),
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "shops")),
      ]);

      if (!batchesSnap.empty) {
        const batches = batchesSnap.docs.map((d) => d.data() as Batch);
        const orders = ordersSnap.docs.map((d) => d.data() as Order);
        const shops = shopsSnap.docs.length > 0
          ? shopsSnap.docs.map((d) => sanitizeShopImages(d.data() as Shop))
          : FALLBACK_SHOPS.map(sanitizeShopImages);

        return batches.map((b) => {
          const shop = shops.find((s) => s.id === b.shopId) || FALLBACK_SHOPS[0];
          const batchOrders = orders.filter((o) => o.batchId === b.id && !o.deletedAt);
          const currentTotalAmount = batchOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          const isMinMet = currentTotalAmount >= b.targetMinAmount;
          const amountRemaining = Math.max(0, b.targetMinAmount - currentTotalAmount);

          return {
            ...b,
            deliveryPhotoUrl: resolveImageUrl(b.deliveryPhotoUrl) || b.deliveryPhotoUrl,
            shop,
            orders: batchOrders.map((ord) => ({
              ...ord,
              slipImageUrl: resolveImageUrl(ord.slipImageUrl) || ord.slipImageUrl,
            })),
            currentTotalAmount,
            isMinMet,
            amountRemaining,
            orderCount: batchOrders.length,
          };
        });
      }
    } catch (err) {
      console.warn("Client Firestore getBatches error:", err);
    }
  }
  return [];
}
