"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DailyLoan {
  _id: string;
  name: string;
  phoneNumber: string;
  loanAmount: number;
  amountGiven: number;
  issuingDate: string;
  profitAmount: number;
  profitPercentage: number;
  numberOfDays: number;
  amountPerDay: number;
  collectedAmount: number;
  remainingAmount: number;
  status: "active" | "completed";
  installments: Array<{
    period: number;
    date: string;
    amount: number;
    status: "paid" | "missed" | "pending";
    paidOn: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function DailyLoans() {
  const router = useRouter();
  const [loans, setLoans] = useState<DailyLoan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<DailyLoan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "completed" | "all"
  >("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDailyLoans = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/daily`,
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
            `HTTP ${response.status}: Failed to fetch daily loans`
          );
        }

        const data = await response.json();
        setLoans(data.data);
        setFilteredLoans(
          data.data.filter((loan: DailyLoan) => loan.status === "active")
        );
      } catch (error: unknown) {
        console.error("Error fetching daily loans:", error);
        // You could add error state handling here if needed
      } finally {
        setLoading(false);
      }
    };

    fetchDailyLoans();
  }, []);

  useEffect(() => {
    let filtered = loans;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((loan) => loan.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (loan) =>
          loan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (loan.phoneNumber && loan.phoneNumber.includes(searchTerm))
      );
    }

    setFilteredLoans(filtered);
  }, [loans, searchTerm, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleCreateNewLoan = () => {
    // Navigate to create new loan page
    router.push("/dashboard/daily/new");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Loans</h1>
            <p className="mt-2 text-gray-600">
              Manage and track daily loan transactions
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {loans.length}
            </div>
            <div className="text-sm text-gray-500">
              {loans.length === 1 ? "Loan" : "Loans"}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <label htmlFor="search" className="sr-only">
              Search loans
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by customer name or phone number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-4">
            <label
              htmlFor="status-filter"
              className="text-sm font-medium text-gray-700"
            >
              Status:
            </label>
            <select
              id="status-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "active" | "completed" | "all"
                )
              }
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Create New Loan Button */}
          <button
            onClick={handleCreateNewLoan}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create New Loan
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Showing {filteredLoans.length} of {loans.length} loans
        </p>
      </div>

      {/* Loans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredLoans.map((loan, index) => (
          <div
            key={loan._id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition duration-200 ease-in-out p-6 border-l-4 border-blue-500 cursor-pointer"
            onClick={() => router.push(`/dashboard/daily/${loan._id}`)}
          >
            {/* Card Number */}
            <div className="mb-2">
              <div className="inline-flex bg-blue-100 text-blue-800 text-sm font-bold rounded-full w-8 h-8 items-center justify-center">
                {index + 1}
              </div>
            </div>
            {/* Header with Status */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {loan.name}
              </h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  loan.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {loan.status === "active" ? "Active" : "Completed"}
              </span>
            </div>

            {/* Phone Number */}
            {loan.phoneNumber && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="text-base font-medium text-gray-900">
                  {loan.phoneNumber}
                </p>
              </div>
            )}

            {/* Financial Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-600">Total Loan Amount</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(loan.loanAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Amount Given</p>
                <p className="text-sm font-semibold text-blue-600">
                  {formatCurrency(loan.amountGiven)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Amount Collected</p>
                <p className="text-sm font-semibold text-green-600">
                  {formatCurrency(loan.collectedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Amount Remaining</p>
                <p className="text-sm font-semibold text-orange-600">
                  {formatCurrency(loan.remainingAmount)}
                </p>
              </div>
            </div>

            {/* Days and Amount per Day */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-600">Number of Days</p>
                <p className="text-sm font-semibold text-indigo-600">
                  {loan.numberOfDays} days
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Amount per Day</p>
                <p className="text-sm font-semibold text-teal-600">
                  {formatCurrency(loan.amountPerDay)}
                </p>
              </div>
            </div>

            {/* Profit Information */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-600">Total Profit</p>
                  <p className="text-sm font-semibold text-purple-600">
                    {formatCurrency(loan.profitAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Profit %</p>
                  <p className="text-sm font-semibold text-purple-600">
                    {loan.profitPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Issuing Date */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-600">Issuing Date</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(loan.issuingDate)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredLoans.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No loans found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
