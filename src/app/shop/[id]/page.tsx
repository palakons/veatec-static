import ClientShopPage from "./ClientShopPage";

export function generateStaticParams() {
  return [{ id: "current" }];
}

export default function ShopPage() {
  return <ClientShopPage />;
}
