"use client";

import { useState, useEffect } from "react";

interface DashboardData {
  totalAmountGiven: number;
  totalAmountCollected: number;
  totalAmountRemaining: number;
  totalProfitAmount: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardData>({
    totalAmountGiven: 0,
    totalAmountCollected: 0,
    totalAmountRemaining: 0,
    totalProfitAmount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("accessToken");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/dashboard`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: Failed to fetch dashboard data`
          );
        }

        const data = await response.json();
        setStats(data.data);
      } catch (error: unknown) {
        console.error("Error fetching dashboard data:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const tiles = [
    {
      title: "Total Amount Given",
      value: stats.totalAmountGiven,
      color: "bg-blue-500",
      icon: "💰",
      description: "Total amount lent out",
    },
    {
      title: "Total Collected",
      value: stats.totalAmountCollected,
      color: "bg-green-500",
      icon: "✅",
      description: "Amount recovered",
    },
    {
      title: "Total Remaining",
      value: stats.totalAmountRemaining,
      color: "bg-orange-500",
      icon: "⏳",
      description: "Amount pending",
    },
    {
      title: "Total Profit",
      value: stats.totalProfitAmount,
      color: "bg-purple-500",
      icon: "📈",
      description: "Net profit earned",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="mt-2 text-gray-600">
            Financial summary and key metrics
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-2 text-gray-600">Financial summary and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiles.map((tile, index) => (
          <div
            key={index}
            className={`${tile.color} rounded-lg shadow-lg p-6 text-white transform hover:scale-105 transition duration-200 ease-in-out`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90 mb-1">
                  {tile.title}
                </p>
                <p className="text-3xl font-bold">
                  {formatCurrency(tile.value)}
                </p>
                <p className="text-xs opacity-75 mt-2">{tile.description}</p>
              </div>
              <div className="text-4xl opacity-80">{tile.icon}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
