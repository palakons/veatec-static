"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClientOrderPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/?batch=${params.id}`);
    } else {
      router.replace("/");
    }
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
      กำลังเปิดกระดานออเดอร์...
    </div>
  );
}
