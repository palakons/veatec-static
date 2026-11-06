"use client";

import dynamic from "next/dynamic";

const AdminClient = dynamic(() => import("./AdminClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
      กำลังโหลดข้อมูล VEATEC Hub...
    </div>
  ),
});

export default function AdminPage() {
  return (
    <AdminClient
      initialBatches={[]}
      initialShops={[]}
      initialLocations={[]}
      initialSystemStatus={undefined}
    />
  );
}
