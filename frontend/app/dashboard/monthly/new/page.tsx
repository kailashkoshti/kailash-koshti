"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MonthlyLoanForm {
  customerName: string;
  phoneNumber: string;
  totalLoanAmount: number;
  interestAmount: number;
  interestPercentage: number;
  amountGiven: number;
  issuingDate: string;
}

export default function CreateMonthlyLoan() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<MonthlyLoanForm>({
    customerName: "",
    phoneNumber: "",
    totalLoanAmount: 0,
    interestAmount: 0,
    interestPercentage: 0,
    amountGiven: 0,
    issuingDate: new Date().toISOString().split("T")[0],
  });

  // Auto-calculate interest amount when interest percentage changes
  const handleInterestPercentageChange = (value: string) => {
    const percentage = parseFloat(value) || 0;
    const interestAmount = (formData.totalLoanAmount * percentage) / 100;
    const amountGiven = formData.totalLoanAmount - interestAmount;

    setFormData({
      ...formData,
      interestPercentage: percentage,
      interestAmount: Math.round(interestAmount),
      amountGiven: Math.round(amountGiven),
    });
  };

  // Auto-calculate interest percentage when interest amount changes
  const handleInterestAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    const percentage =
      formData.totalLoanAmount > 0
        ? (amount / formData.totalLoanAmount) * 100
        : 0;
    const amountGiven = formData.totalLoanAmount - amount;

    setFormData({
      ...formData,
      interestAmount: amount,
      interestPercentage: Math.round(percentage * 100) / 100,
      amountGiven: Math.round(amountGiven),
    });
  };

  // Auto-calculate amount given when total loan amount changes
  const handleTotalLoanAmountChange = (value: string) => {
    const totalAmount = parseFloat(value) || 0;
    const interestAmount = (totalAmount * formData.interestPercentage) / 100;
    const amountGiven = totalAmount - interestAmount;

    setFormData({
      ...formData,
      totalLoanAmount: totalAmount,
      interestAmount: Math.round(interestAmount),
      amountGiven: Math.round(amountGiven),
    });
  };

  const handleInputChange = (field: keyof MonthlyLoanForm, value: string) => {
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    if (field === "phoneNumber") {
      // Only allow digits and limit to 10 characters
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [field]: numericValue });
    } else if (field === "totalLoanAmount") {
      handleTotalLoanAmountChange(value);
    } else if (field === "interestPercentage") {
      handleInterestPercentageChange(value);
    } else if (field === "interestAmount") {
      handleInterestAmountChange(value);
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }

    if (formData.phoneNumber && formData.phoneNumber.length !== 10) {
      newErrors.phoneNumber = "Phone number must be exactly 10 digits";
    }

    if (formData.totalLoanAmount <= 0) {
      newErrors.totalLoanAmount = "Total loan amount must be greater than 0";
    }

    if (formData.interestAmount < 0) {
      newErrors.interestAmount = "Interest amount cannot be negative";
    }

    if (formData.interestPercentage < 0) {
      newErrors.interestPercentage = "Interest percentage cannot be negative";
    }

    if (!formData.issuingDate) {
      newErrors.issuingDate = "Issuing date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/monthly`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            customerName: formData.customerName,
            phoneNumber: formData.phoneNumber || null,
            totalLoanAmount: formData.totalLoanAmount,
            interestAmount: formData.interestAmount,
            interestPercentage: formData.interestPercentage,
            amountGiven: formData.amountGiven,
            issuingDate: formData.issuingDate,
          }),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        router.push("/");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create monthly loan");
      }

      // Redirect to monthly loans page
      router.push("/dashboard/monthly");
    } catch (error: unknown) {
      console.error("Error creating monthly loan:", error);
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Failed to create monthly loan",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Create New Monthly Loan
        </h1>
        <p className="mt-2 text-gray-600">
          Fill in the details to create a new monthly loan
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Name and Phone Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Name */}
            <div>
              <label
                htmlFor="customerName"
                className="block text-sm font-medium text-gray-700"
              >
                Customer Name *
              </label>
              <input
                type="text"
                id="customerName"
                value={formData.customerName}
                onChange={(e) =>
                  handleInputChange("customerName", e.target.value)
                }
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                  errors.customerName ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter customer name"
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.customerName}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) =>
                  handleInputChange("phoneNumber", e.target.value)
                }
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                maxLength={10}
                pattern="[0-9]{10}"
                inputMode="numeric"
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                  errors.phoneNumber ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter 10-digit phone number (optional)"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* Total Loan Amount */}
          <div>
            <label
              htmlFor="totalLoanAmount"
              className="block text-sm font-medium text-gray-700"
            >
              <span className="flex items-center">
                <span className="mr-2">₹</span>
                Total Loan Amount *
              </span>
            </label>
            <input
              type="number"
              id="totalLoanAmount"
              value={formData.totalLoanAmount || ""}
              onChange={(e) =>
                handleInputChange("totalLoanAmount", e.target.value)
              }
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                errors.totalLoanAmount ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Enter total loan amount"
              min="0"
              step="1"
            />
            {errors.totalLoanAmount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.totalLoanAmount}
              </p>
            )}
          </div>

          {/* Interest Amount and Percentage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interest Amount */}
            <div>
              <label
                htmlFor="interestAmount"
                className="block text-sm font-medium text-gray-700"
              >
                <span className="flex items-center">
                  <span className="mr-2">₹</span>
                  Interest Amount
                </span>
              </label>
              <input
                type="number"
                id="interestAmount"
                value={formData.interestAmount || ""}
                onChange={(e) =>
                  handleInputChange("interestAmount", e.target.value)
                }
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                  errors.interestAmount ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter interest amount"
                min="0"
                step="1"
              />
              {errors.interestAmount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.interestAmount}
                </p>
              )}
            </div>

            {/* Interest Percentage */}
            <div>
              <label
                htmlFor="interestPercentage"
                className="block text-sm font-medium text-gray-700"
              >
                <span className="flex items-center">
                  <span className="mr-2">%</span>
                  Interest Percentage
                </span>
              </label>
              <input
                type="number"
                id="interestPercentage"
                value={formData.interestPercentage || ""}
                onChange={(e) =>
                  handleInputChange("interestPercentage", e.target.value)
                }
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                  errors.interestPercentage
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
                placeholder="Enter interest percentage"
                min="0"
                step="0.01"
              />
              {errors.interestPercentage && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.interestPercentage}
                </p>
              )}
            </div>
          </div>

          {/* Amount Given (Read-only) */}
          <div>
            <label
              htmlFor="amountGiven"
              className="block text-sm font-medium text-gray-700"
            >
              <span className="flex items-center">
                <span className="mr-2">₹</span>
                Amount Given (Auto-calculated)
              </span>
            </label>
            <input
              type="number"
              id="amountGiven"
              value={formData.amountGiven}
              readOnly
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Calculated as: Total Loan Amount - Interest Amount
            </p>
          </div>

          {/* Issuing Date */}
          <div>
            <label
              htmlFor="issuingDate"
              className="block text-sm font-medium text-gray-700"
            >
              <span className="flex items-center">
                <span className="mr-2">📅</span>
                Issuing Date *
              </span>
            </label>
            <input
              type="date"
              id="issuingDate"
              value={formData.issuingDate}
              onChange={(e) => handleInputChange("issuingDate", e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                errors.issuingDate ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.issuingDate && (
              <p className="mt-1 text-sm text-red-600">{errors.issuingDate}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/monthly")}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Monthly Loan"}
            </button>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="text-red-600 text-sm">{errors.submit}</div>
          )}
        </form>
      </div>
    </div>
  );
}
