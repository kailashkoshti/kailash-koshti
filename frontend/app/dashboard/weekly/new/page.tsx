"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CreateWeeklyLoanRequest {
  customerName: string;
  phoneNumber: string;
  totalLoanAmount: number;
  interestAmount: number;
  interestPercentage: number;
  installmentPeriodInDays: number;
  amountGiven: number;
  issuingDate: string;
}

interface WeeklyLoanForm {
  customerName: string;
  phoneNumber: string;
  totalLoanAmount: number;
  interestAmount: number;
  interestPercentage: number;
  installmentPeriodInDays: number;
  amountGiven: number;
  issuingDate: string;
}

export default function CreateWeeklyLoan() {
  const router = useRouter();
  const [formData, setFormData] = useState<WeeklyLoanForm>({
    customerName: "",
    phoneNumber: "",
    totalLoanAmount: 0,
    interestAmount: 0,
    interestPercentage: 0,
    installmentPeriodInDays: 7, // Default to 7 days
    amountGiven: 0,
    issuingDate: new Date().toISOString().split("T")[0], // Today's date
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate interest percentage when interest amount or total loan amount changes
  useEffect(() => {
    if (formData.interestAmount > 0 && formData.totalLoanAmount > 0) {
      const percentage =
        (formData.interestAmount / formData.totalLoanAmount) * 100;
      setFormData((prev) => ({
        ...prev,
        interestPercentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      }));
    }
  }, [formData.interestAmount, formData.totalLoanAmount]);

  // Auto-calculate interest amount when interest percentage or total loan amount changes
  useEffect(() => {
    if (formData.interestPercentage > 0 && formData.totalLoanAmount > 0) {
      const amount =
        (formData.totalLoanAmount * formData.interestPercentage) / 100;
      setFormData((prev) => ({
        ...prev,
        interestAmount: Math.round(amount),
      }));
    }
  }, [formData.interestPercentage, formData.totalLoanAmount]);

  // Auto-calculate amount given when total loan amount and interest amount change
  useEffect(() => {
    if (formData.totalLoanAmount > 0 && formData.interestAmount > 0) {
      const amountGiven = formData.totalLoanAmount - formData.interestAmount;
      setFormData((prev) => ({
        ...prev,
        amountGiven: amountGiven,
      }));
    }
  }, [formData.totalLoanAmount, formData.interestAmount]);

  const handleInputChange = (
    field: keyof WeeklyLoanForm,
    value: string | number
  ) => {
    // If total loan amount is changed, clear all related fields
    if (field === "totalLoanAmount") {
      setFormData((prev) => ({
        ...prev,
        [field]: Number(value),
        // Clear all money and percentage related fields
        interestAmount: 0,
        interestPercentage: 0,
        amountGiven: 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }

    if (formData.phoneNumber.trim()) {
      // Remove all non-digit characters for validation
      const digitsOnly = formData.phoneNumber.replace(/\D/g, "");
      if (digitsOnly.length !== 10) {
        newErrors.phoneNumber = "Phone number must be exactly 10 digits";
      }
    }

    if (formData.totalLoanAmount <= 0) {
      newErrors.totalLoanAmount = "Total loan amount must be greater than 0";
    }

    if (formData.interestAmount <= 0) {
      newErrors.interestAmount = "Interest amount must be greater than 0";
    }

    if (formData.amountGiven <= 0) {
      newErrors.amountGiven = "Amount given must be greater than 0";
    }

    if (formData.installmentPeriodInDays <= 0) {
      newErrors.installmentPeriodInDays =
        "Installment period must be greater than 0";
    }

    if (formData.installmentPeriodInDays > 365) {
      newErrors.installmentPeriodInDays =
        "Installment period cannot exceed 365 days";
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

    setIsSubmitting(true);

    try {
      const loanData: CreateWeeklyLoanRequest = {
        customerName: formData.customerName,
        phoneNumber: formData.phoneNumber,
        totalLoanAmount: formData.totalLoanAmount,
        interestAmount: formData.interestAmount,
        interestPercentage: formData.interestPercentage,
        installmentPeriodInDays: formData.installmentPeriodInDays,
        amountGiven: formData.amountGiven,
        issuingDate: formData.issuingDate,
      };

      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/weekly`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(loanData),
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
        throw new Error(errorData.message || "Failed to create weekly loan");
      }

      // Redirect back to weekly loans page
      router.push("/dashboard/weekly");
    } catch (error: unknown) {
      console.error("Error creating loan:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error creating loan. Please try again.";
      console.error("Error creating loan:", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/weekly");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Create New Custom Period Loan
        </h1>
        <p className="mt-2 text-gray-600">
          Fill in the details to create a new loan with customizable installment
          periods
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="customerName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Customer Name *
              </label>
              <input
                type="text"
                id="customerName"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                  errors.customerName ? "border-red-500" : "border-gray-300"
                }`}
                value={formData.customerName}
                onChange={(e) =>
                  handleInputChange("customerName", e.target.value)
                }
                placeholder="Enter customer name"
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.customerName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                  errors.phoneNumber ? "border-red-500" : "border-gray-300"
                }`}
                value={formData.phoneNumber}
                onChange={(e) => {
                  // Only allow digits and limit to 10 characters
                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                  handleInputChange("phoneNumber", value);
                }}
                onKeyPress={(e) => {
                  // Prevent non-numeric input
                  if (
                    !/[0-9]/.test(e.key) &&
                    e.key !== "Backspace" &&
                    e.key !== "Delete" &&
                    e.key !== "Tab"
                  ) {
                    e.preventDefault();
                  }
                }}
                placeholder="Enter 10-digit phone number (optional)"
                maxLength={10}
                pattern="[0-9]{10}"
                inputMode="numeric"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* Loan Amount Information */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label
                htmlFor="totalLoanAmount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Total Loan Amount *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium">₹</span>
                </div>
                <input
                  type="number"
                  id="totalLoanAmount"
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                    errors.totalLoanAmount
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={formData.totalLoanAmount || ""}
                  onChange={(e) =>
                    handleInputChange("totalLoanAmount", Number(e.target.value))
                  }
                  placeholder="Enter total loan amount"
                  min="0"
                />
              </div>
              {errors.totalLoanAmount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.totalLoanAmount}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="interestAmount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Interest Amount *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium">₹</span>
                </div>
                <input
                  type="number"
                  id="interestAmount"
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                    errors.interestAmount ? "border-red-500" : "border-gray-300"
                  }`}
                  value={formData.interestAmount || ""}
                  onChange={(e) =>
                    handleInputChange("interestAmount", Number(e.target.value))
                  }
                  placeholder="Enter interest amount"
                  min="0"
                />
              </div>
              {errors.interestAmount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.interestAmount}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="interestPercentage"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Interest Percentage *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium">%</span>
                </div>
                <input
                  type="number"
                  id="interestPercentage"
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                    errors.interestPercentage
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={formData.interestPercentage || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "interestPercentage",
                      Number(e.target.value)
                    )
                  }
                  placeholder="Enter interest percentage"
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.interestPercentage && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.interestPercentage}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="installmentPeriodInDays"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Installment Period (Days) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium">
                    Days
                  </span>
                </div>
                <input
                  type="number"
                  id="installmentPeriodInDays"
                  className={`w-full pl-12 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white ${
                    errors.installmentPeriodInDays
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={formData.installmentPeriodInDays || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "installmentPeriodInDays",
                      Number(e.target.value)
                    )
                  }
                  placeholder="Enter days"
                  min="1"
                  max="365"
                />
              </div>
              {errors.installmentPeriodInDays && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.installmentPeriodInDays}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                How many days between installments (1-365)
              </p>
            </div>
          </div>

          {/* Auto-calculated Amount Given */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Given (Auto-calculated)
            </label>
            <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
              ₹{formData.amountGiven.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Total Loan Amount - Interest Amount
            </p>
          </div>

          {/* Issuing Date */}
          <div>
            <label
              htmlFor="issuingDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Issuing Date *
            </label>
            <input
              type="date"
              id="issuingDate"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                errors.issuingDate ? "border-red-500" : "border-gray-300"
              }`}
              value={formData.issuingDate}
              onChange={(e) => handleInputChange("issuingDate", e.target.value)}
            />
            {errors.issuingDate && (
              <p className="mt-1 text-sm text-red-600">{errors.issuingDate}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {isSubmitting ? "Creating..." : "Create Loan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
