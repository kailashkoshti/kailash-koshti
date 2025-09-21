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
        <main className="container-responsive py-4 sm:py-6 pt-16 sm:pt-20">
          {children}
        </main>
      </div>
    </AuthWrapper>
  );
}
