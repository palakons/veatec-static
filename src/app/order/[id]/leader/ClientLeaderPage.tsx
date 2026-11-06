"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const LeaderPageClient = dynamic(() => import("./LeaderPageClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
      กำลังโหลดแผงควบคุมหัวหน้าตี้...
    </div>
  ),
});

export default function ClientLeaderPage() {
  const params = useParams();
  const batchId = (params?.id as string) || "";

  return <LeaderPageClient batchId={batchId} initialBatch={null} />;
}
