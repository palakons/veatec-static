"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientDeliveryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
      กำลังเปิดหน้ารายการจัดส่ง...
    </div>
  );
}
