"use client";

import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("./HomeClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center space-y-3 font-sans">
      <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-semibold tracking-wide text-neutral-300">
        VEATEC • กำลังโหลดไวท์บอร์ดรวมออเดอร์...
      </p>
    </div>
  ),
});

export default function HomePage() {
  return <HomeClient initialBatches={[]} initialLocations={[]} />;
}
