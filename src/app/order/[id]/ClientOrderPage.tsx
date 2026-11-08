"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClientOrderPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    let targetId = params?.id as string;
    if (typeof window !== "undefined") {
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const orderIdx = pathParts.indexOf("order");
      if (orderIdx !== -1 && pathParts[orderIdx + 1] && pathParts[orderIdx + 1] !== "current") {
        targetId = pathParts[orderIdx + 1];
      }
    }
    const query = typeof window !== "undefined" ? window.location.search : "";
    if (targetId && targetId !== "current") {
      const extraQuery = query ? query.replace(/^\?/, "&") : "";
      router.replace(`/?batch=${targetId}${extraQuery}`);
    } else {
      router.replace(`/${query}`);
    }
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
      กำลังเปิดกระดานออเดอร์...
    </div>
  );
}
