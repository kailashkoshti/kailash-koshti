"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

export default function DashboardNavbar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const handleLogout = () => {
    // Handle logout logic here
    // Clear all authentication data
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Daily", href: "/dashboard/daily" },
    { name: "Weekly", href: "/dashboard/weekly" },
    { name: "Monthly", href: "/dashboard/monthly" },
  ];

  return (
    <nav className="bg-blue-600 text-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="container-responsive">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left side - Brand */}
          <div className="flex-shrink-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">
              Kailash Koshti
            </h1>
          </div>

          {/* Center - Navigation Items (Desktop) */}
          <div className="hidden lg:flex space-x-4 xl:space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-2 xl:px-3 py-2 rounded-md text-xs xl:text-sm font-medium transition duration-150 ease-in-out ${
                  pathname === item.href
                    ? "bg-blue-700 text-white"
                    : "text-blue-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side - Time, Date, and Mobile Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Time and Date (Always visible) */}
            <div className="text-right">
              <div className="text-xs xl:text-sm font-bold">
                {formatTime(currentTime)}
              </div>
              <div className="text-xs xl:text-sm font-bold">
                {formatDate(currentTime)}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-blue-100 hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-blue-500">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition duration-150 ease-in-out ${
                    pathname === item.href
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-blue-700 hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              {/* Logout Button in Mobile Menu */}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium transition duration-150 ease-in-out bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
