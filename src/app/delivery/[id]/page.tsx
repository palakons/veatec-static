import ClientDeliveryPage from "./ClientDeliveryPage";

export function generateStaticParams() {
  return [{ id: "current" }];
}

export default function DeliveryPage() {
  return <ClientDeliveryPage />;
}
