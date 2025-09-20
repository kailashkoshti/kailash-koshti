import DashboardNavbar from "../components/DashboardNavbar";
import AuthWrapper from "../components/AuthWrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-20">
          {children}
        </main>
      </div>
    </AuthWrapper>
  );
}
