import ClientOrderPage from "./ClientOrderPage";

export function generateStaticParams() {
  return [{ id: "current" }];
}

export default function OrderPage() {
  return <ClientOrderPage />;
}
