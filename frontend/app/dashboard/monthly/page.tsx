"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MonthlyLoan {
  _id: string;
  loanNumber: number;
  name: string;
  phoneNumber: string;
  loanAmount: number;
  amountGiven: number;
  profitAmount: number;
  interestAmount: number;
  interestPercentage: number;
  collectedAmount: number;
  remainingAmount: number;
  issuingDate: string;
  status: "active" | "completed";
  endDate: string | null;
}

export default function MonthlyLoans() {
  const router = useRouter();
  const [loans, setLoans] = useState<MonthlyLoan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<MonthlyLoan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "completed" | "all"
  >("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMonthlyLoans = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("accessToken");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/monthly`,
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
            `HTTP ${response.status}: Failed to fetch monthly loans`
          );
        }

        const data = await response.json();
        setLoans(data.data);
        setFilteredLoans(
          data.data.filter((loan: MonthlyLoan) => loan.status === "active")
        );
      } catch (error: unknown) {
        console.error("Error fetching monthly loans:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load monthly loans"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyLoans();
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
    router.push("/dashboard/monthly/new");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error Loading Monthly Loans
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Monthly Loans
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
              Manage and track monthly loan transactions
            </p>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {loans.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              {loans.length === 1 ? "Loan" : "Loans"}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 w-full sm:max-w-md">
            <label htmlFor="search" className="sr-only">
              Search loans
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"
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
                className="block w-full pl-8 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
                placeholder="Search by customer name or phone number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
            <label
              htmlFor="status-filter"
              className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Status:
            </label>
            <select
              id="status-filter"
              className="block w-full sm:w-auto pl-3 pr-8 py-2 text-sm border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 rounded-md"
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
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Create New Loan
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-gray-700">
          Showing {filteredLoans.length} of {loans.length} loans
        </p>
      </div>

      {/* Loans Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredLoans.map((loan, index) => (
          <div
            key={loan._id}
            onClick={() => router.push(`/dashboard/monthly/${loan._id}`)}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition duration-200 ease-in-out p-4 sm:p-6 border-l-4 border-purple-500 cursor-pointer"
          >
            {/* Card Number */}
            <div className="mb-2">
              <div className="inline-flex bg-purple-100 text-purple-800 text-sm font-bold rounded-full w-8 h-8 items-center justify-center">
                {loan.loanNumber}
              </div>
            </div>
            {/* Header with Status */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {loan.name}
              </h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
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
              <div className="mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-gray-600">Phone Number</p>
                <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                  {loan.phoneNumber}
                </p>
              </div>
            )}

            {/* Financial Details Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <p className="text-xs text-gray-600">Total Loan Amount</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                  {formatCurrency(loan.loanAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Amount Given</p>
                <p className="text-xs sm:text-sm font-semibold text-blue-600 truncate">
                  {formatCurrency(loan.amountGiven)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Amount Collected</p>
                <p className="text-xs sm:text-sm font-semibold text-green-600 truncate">
                  {formatCurrency(loan.collectedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Amount Remaining</p>
                <p className="text-xs sm:text-sm font-semibold text-orange-600 truncate">
                  {formatCurrency(loan.remainingAmount)}
                </p>
              </div>
            </div>

            {/* Interest Information */}
            <div className="border-t pt-3 sm:pt-4 mb-3 sm:mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-600">Interest Amount</p>
                  <p className="text-xs sm:text-sm font-semibold text-orange-600 truncate">
                    {formatCurrency(loan.interestAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Interest %</p>
                  <p className="text-xs sm:text-sm font-semibold text-red-600">
                    {loan.interestPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Total Profit */}
            <div className="border-t pt-3 sm:pt-4 mb-3 sm:mb-4">
              <p className="text-xs text-gray-600">Total Profit</p>
              <p className="text-xs sm:text-sm font-semibold text-purple-600 truncate">
                {formatCurrency(loan.profitAmount)}
              </p>
            </div>

            {/* Issuing Date */}
            <div className="pt-3 sm:pt-4 border-t">
              <p className="text-xs text-gray-600">Issuing Date</p>
              <p className="text-xs sm:text-sm font-medium text-gray-900">
                {formatDate(loan.issuingDate)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredLoans.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <svg
            className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
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
          <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">
            No loans found
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 px-4">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
