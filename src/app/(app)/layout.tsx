import { redirect } from "next/navigation";

import { auth, signOut } from "@/server/auth";
import { AppNav } from "@/components/AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav
        userEmail={session.user.email}
        signOutAction={signOutAction}
      />
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
