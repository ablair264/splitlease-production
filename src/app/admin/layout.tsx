import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div
      data-admin-theme
      className="flex h-screen bg-[#161c24] overflow-hidden"
    >
      {/* Sidebar */}
      <Sidebar user={session.user} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#161c24] pt-14 md:pt-4 pr-2 md:pr-4 pl-2">
        {/* Content Panel with rounded left corners and dark gradient */}
        <div
          className="flex-1 overflow-y-auto rounded-xl md:rounded-l-2xl md:rounded-r-none border border-gray-800 md:border-l md:border-t md:border-b md:border-r-0 shadow-2xl admin-scrollbar"
          style={{
            background: "linear-gradient(135deg, #0f1419 0%, #1a1f2a 50%, #0f1419 100%)",
          }}
        >
          <div className="p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
