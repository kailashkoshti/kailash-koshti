"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

export default function DashboardNavbar() {
  const [currentTime, setCurrentTime] = useState(new Date());
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Brand */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold">Kailash Koshti</h1>
          </div>

          {/* Center - Navigation Items */}
          <div className="hidden md:flex space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out ${
                  pathname === item.href
                    ? "bg-blue-700 text-white"
                    : "text-blue-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side - Time and Logout */}
          <div className="flex items-center space-x-6">
            {/* Time and Date */}
            <div className="text-right">
              <div className="text-sm font-bold">{formatTime(currentTime)}</div>
              <div className="text-sm font-bold">{formatDate(currentTime)}</div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium transition duration-150 ease-in-out ${
                  pathname === item.href
                    ? "bg-blue-700 text-white"
                    : "text-blue-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
