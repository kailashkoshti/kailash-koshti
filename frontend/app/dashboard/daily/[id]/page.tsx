"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

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

interface InstallmentUpdate {
  period: number;
  status: "paid" | "missed" | "pending";
  paidOn?: string;
}

export default function DailyLoanDetail() {
  const router = useRouter();
  const params = useParams();
  const loanId = params.id as string;

  const [loan, setLoan] = useState<DailyLoan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState<Set<number>>(
    new Set()
  );
  const [installmentPreviousStatus, setInstallmentPreviousStatus] = useState<
    Map<number, string>
  >(new Map());
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (loanId) {
      fetchDailyLoan();
    }
  }, [loanId]);

  // Store previous statuses when loan data loads (no auto-selection)
  useEffect(() => {
    if (loan) {
      const previousStatuses = new Map<number, string>();

      loan.installments.forEach((installment) => {
        // Store current status as previous status for all installments
        previousStatuses.set(installment.period, installment.status);
      });

      setInstallmentPreviousStatus(previousStatuses);
      // Don't auto-select paid installments - start with empty selection
      setSelectedInstallments(new Set());
    }
  }, [loan]);

  const fetchDailyLoan = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/daily/${loanId}`,
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
          `HTTP ${response.status}: Failed to fetch loan details`
        );
      }

      const data = await response.json();
      setLoan(data.data);
    } catch (error: unknown) {
      console.error("Error fetching loan details:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load loan details"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInstallmentUpdate = async () => {
    if (selectedInstallments.size === 0) {
      setNotification({
        type: "info",
        message: "Please select at least one installment to update",
      });
      return;
    }

    try {
      setUpdating(true);

      const token = localStorage.getItem("accessToken");

      // Create updates for ALL installments (selected and unselected)
      const allInstallments: InstallmentUpdate[] = [];

      if (loan) {
        loan.installments.forEach((installment) => {
          const period = installment.period;
          const isSelected = selectedInstallments.has(period);
          const currentStatus = installment.status;

          if (isSelected) {
            // Selected installments - determine action based on current status
            if (currentStatus === "paid") {
              // Currently paid - revert based on due date
              const dueDate = new Date(installment.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Reset time to start of day
              dueDate.setHours(0, 0, 0, 0); // Reset time to start of day

              let revertStatus: "paid" | "missed" | "pending";

              if (dueDate < today) {
                // Due date has passed - mark as missed
                revertStatus = "missed";
              } else {
                // Due date is today or in the future - mark as pending
                revertStatus = "pending";
              }

              allInstallments.push({
                period,
                status: revertStatus,
                paidOn: undefined, // Clear paid date when reverting
              });
            } else {
              // Currently not paid - mark as paid
              allInstallments.push({
                period,
                status: "paid",
                paidOn: new Date().toISOString().split("T")[0],
              });
            }
          } else {
            // Unselected installments - keep current status
            allInstallments.push({
              period,
              status: currentStatus as "paid" | "missed" | "pending",
              paidOn:
                currentStatus === "paid"
                  ? installment.paidOn || undefined
                  : undefined,
            });
          }
        });
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/daily/${loanId}/installments`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({ installments: allInstallments }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update installments");
      }

      const responseData = await response.json();

      // Refresh loan data
      await fetchDailyLoan();
      setSelectedInstallments(new Set());
      setInstallmentPreviousStatus(new Map());
      setNotification({
        type: "success",
        message: "Installments updated successfully!",
      });
    } catch (error: unknown) {
      console.error("Error updating installments:", error);

      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update installments",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteLoan = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete this loan?\n\nCustomer: ${
        loan?.name
      }\nLoan Amount: ₹${loan?.loanAmount?.toLocaleString()}\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdating(true);

      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/daily/${loanId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete loan");
      }

      setNotification({
        type: "success",
        message: "Loan deleted successfully!",
      });
      // Redirect after a short delay to show the notification
      setTimeout(() => {
        router.push("/dashboard/daily");
      }, 1500);
    } catch (error: unknown) {
      console.error("Error deleting loan:", error);
      setNotification({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete loan",
      });
    } finally {
      setUpdating(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "missed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleInstallmentSelect = (period: number) => {
    const newSelected = new Set(selectedInstallments);
    const currentInstallment = loan?.installments.find(
      (inst) => inst.period === period
    );

    if (newSelected.has(period)) {
      // Deselecting - store current status as previous status
      newSelected.delete(period);
      if (currentInstallment) {
        setInstallmentPreviousStatus(
          (prev) => new Map(prev.set(period, currentInstallment.status))
        );
      }
    } else {
      // Selecting - mark as paid
      newSelected.add(period);
      if (currentInstallment) {
        setInstallmentPreviousStatus(
          (prev) => new Map(prev.set(period, currentInstallment.status))
        );
      }
    }
    setSelectedInstallments(newSelected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
          Error Loading Loan
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => router.push("/dashboard/daily")}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Back to Daily Loans
        </button>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Loan not found</h3>
        <button
          onClick={() => router.push("/dashboard/daily")}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Back to Daily Loans
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-16 sm:top-20 right-2 sm:right-4 left-2 sm:left-auto z-50 max-w-sm sm:max-w-sm w-auto sm:w-full bg-white rounded-lg shadow-lg border-l-4 ${
            notification.type === "success"
              ? "border-green-500"
              : notification.type === "error"
              ? "border-red-500"
              : "border-blue-500"
          }`}
        >
          <div className="p-3 sm:p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === "success" && (
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {notification.type === "error" && (
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {notification.type === "info" && (
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-2 sm:ml-3 w-0 flex-1">
                <p
                  className={`text-xs sm:text-sm font-medium ${
                    notification.type === "success"
                      ? "text-green-800"
                      : notification.type === "error"
                      ? "text-red-800"
                      : "text-blue-800"
                  }`}
                >
                  {notification.message}
                </p>
              </div>
              <div className="ml-2 sm:ml-4 flex-shrink-0 flex">
                <button
                  onClick={() => setNotification(null)}
                  className={`inline-flex ${
                    notification.type === "success"
                      ? "text-green-500 hover:text-green-700"
                      : notification.type === "error"
                      ? "text-red-500 hover:text-red-700"
                      : "text-blue-500 hover:text-blue-700"
                  }`}
                >
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
            {loan.name}
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Daily Loan Details
          </p>
        </div>
        <div className="flex space-x-2 sm:space-x-3">
          <button
            onClick={handleDeleteLoan}
            disabled={updating}
            className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span className="hidden sm:inline">
              {updating ? "Deleting..." : "Delete Loan"}
            </span>
            <span className="sm:hidden">{updating ? "..." : "Delete"}</span>
          </button>
        </div>
      </div>

      {/* Loan Information Card */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-xs sm:text-sm text-gray-600">Customer Name</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {loan.name}
            </p>
            {loan.phoneNumber && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                {loan.phoneNumber}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs sm:text-sm text-gray-600">Loan Status</p>
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                loan.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {loan.status === "active" ? "Active" : "Completed"}
            </span>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-gray-600">Issuing Date</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              {formatDate(loan.issuingDate)}
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-gray-600">Total Days</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              {loan.numberOfDays} days
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-xs sm:text-sm text-gray-600">
              Total Loan Amount
            </p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {formatCurrency(loan.loanAmount)}
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-gray-600">Amount Given</p>
            <p className="text-lg sm:text-xl font-bold text-blue-600 truncate">
              {formatCurrency(loan.amountGiven)}
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-gray-600">Amount Collected</p>
            <p className="text-lg sm:text-xl font-bold text-green-600 truncate">
              {formatCurrency(loan.collectedAmount)}
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-gray-600">Amount Remaining</p>
            <p className="text-lg sm:text-xl font-bold text-orange-600 truncate">
              {formatCurrency(loan.remainingAmount)}
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <p className="text-xs sm:text-sm text-gray-600">Amount per Day</p>
            <p className="text-base sm:text-lg font-semibold text-indigo-600 truncate">
              {formatCurrency(loan.amountPerDay)}
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-gray-600">Total Profit</p>
            <p className="text-base sm:text-lg font-semibold text-purple-600 truncate">
              {formatCurrency(loan.profitAmount)}
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-gray-600">
              Profit Percentage
            </p>
            <p className="text-base sm:text-lg font-semibold text-purple-600">
              {loan.profitPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Installment Management */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Installment Management
          </h2>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={handleInstallmentUpdate}
              disabled={updating || selectedInstallments.size === 0}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
            >
              {updating
                ? "Updating..."
                : `Update ${selectedInstallments.size} Installment(s)`}
            </button>
          </div>
        </div>

        {/* Installments Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loan.installments.map((installment) => (
                <tr
                  key={installment.period}
                  className={`cursor-pointer transition-colors ${
                    selectedInstallments.has(installment.period)
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleInstallmentSelect(installment.period)}
                >
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedInstallments.has(installment.period)}
                      onChange={() =>
                        handleInstallmentSelect(installment.period)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                      Day {installment.period}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-semibold text-gray-900">
                      {formatCurrency(installment.amount)}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm text-gray-600">
                      {formatDate(installment.date)}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        installment.status
                      )}`}
                    >
                      {installment.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm text-gray-600">
                      {installment.paidOn
                        ? formatDate(installment.paidOn)
                        : "-"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
