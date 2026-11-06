import { isFirebaseConfigured, db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import type { Batch, BatchWithDetails, Shop, Order } from "./types";
import { CAMPUS_LOCATIONS, DeliveryLocation } from "./locations";

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
  {
    id: "shop-chao-rai",
    name: "ร้านอาหารชาวไร่ วังจันทร์",
    nameEn: "Chao Rai Restaurant (Wangchan 344)",
    cuisine: "อาหารไทย-จีน & อาหารป่าชื่อดังกว่า 30 ปี",
    description: "ร้านอาหารระดับตำนาน อ.วังจันทร์ ริมถนนสาย 344 แยกชุมแสง วัตถุดิบทะเลสด อาหารป่ารสจัด และหอยจ๊อปูเนื้อทะลัก",
    phone: "081-454-6374",
    lineId: "chaorai_wangchan",
    gmapUrl: "https://maps.google.com/?q=ร้านอาหารชาวไร่+วังจันทร์+ระยอง",
    promptpayNumber: "0814546374",
    promptpayAccountName: "ร้านอาหารชาวไร่ (Chao Rai Restaurant)",
    promptpayQrUrl: "https://promptpay.io/0814546374.png",
    menuImageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80",
    minDeliveryAmount: 200,
    defaultCutoffTime: "11:20",
    isActive: true,
    openDays: [1, 2, 3, 4, 5],
    menuItems: [],
  },
  {
    id: "shop-krua-mangmee",
    name: "ครัวมั่งมี วังจันทร์ (กม.68)",
    nameEn: "Krua Mangmee (KM.68 Payubnai)",
    cuisine: "อาหารไทย-จีนโฮมเมด & ข้าวแห้งทะเล",
    description: "ร้านดังประจำ ต.ป่ายุบใน กม.68 เมนูขึ้นชื่อข้าวแห้งทะเล ปลาพิโรธรสจัดจ้าน และกระเพาะปลาผัดแห้งสูตรภัตตาคาร",
    phone: "087-137-9837",
    lineId: "mangmee_km68",
    gmapUrl: "https://maps.google.com/?q=ครัวมั่งมี+วังจันทร์+กม.68+ระยอง",
    promptpayNumber: "0871379837",
    promptpayAccountName: "ครัวมั่งมี โต๊ะจีน (Krua Mangmee)",
    promptpayQrUrl: "https://promptpay.io/0871379837.png",
    menuImageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
    minDeliveryAmount: 200,
    defaultCutoffTime: "11:25",
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
        return snap.docs.map((d) => d.data() as DeliveryLocation);
      }
    } catch (err) {
      console.warn("Client Firestore getLocations error:", err);
    }
  }
  return CAMPUS_LOCATIONS;
}

export async function getClientShops(): Promise<Shop[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, "shops"));
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as Shop);
      }
    } catch (err) {
      console.warn("Client Firestore getShops error:", err);
    }
  }
  return FALLBACK_SHOPS;
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
          ? shopsSnap.docs.map((d) => d.data() as Shop)
          : FALLBACK_SHOPS;

        return batches.map((b) => {
          const shop = shops.find((s) => s.id === b.shopId) || FALLBACK_SHOPS[0];
          const batchOrders = orders.filter((o) => o.batchId === b.id && !o.deletedAt);
          const currentTotalAmount = batchOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          const isMinMet = currentTotalAmount >= b.targetMinAmount;
          const amountRemaining = Math.max(0, b.targetMinAmount - currentTotalAmount);

          return {
            ...b,
            shop,
            orders: batchOrders,
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
