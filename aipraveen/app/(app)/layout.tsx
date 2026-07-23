import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <>
      <AppHeader email={user.email} />
      <main>{children}</main>
    </>
  );
}
