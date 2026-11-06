import ClientLeaderPage from "./ClientLeaderPage";

export function generateStaticParams() {
  return [{ id: "current" }];
}

export default function LeaderPage() {
  return <ClientLeaderPage />;
}
