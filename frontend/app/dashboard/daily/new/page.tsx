"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CreateDailyLoanRequest {
  customerName: string;
  phoneNumber: string;
  amountGiven: number;
  profitAmount: number;
  profitPercentage: number;
  totalLoanAmount: number;
  numberOfDays: number;
  amountPerDay: number;
  issuingDate: string;
}

interface DailyLoanForm {
  customerName: string;
  phoneNumber: string;
  totalLoanAmount: number;
  amountGiven: number;
  profitAmount: number;
  profitPercentage: number;
  numberOfDays: number;
  amountPerDay: number;
  issuingDate: string;
}

export default function CreateDailyLoan() {
  const router = useRouter();
  const [formData, setFormData] = useState<DailyLoanForm>({
    customerName: "",
    phoneNumber: "",
    totalLoanAmount: 0,
    amountGiven: 0,
    profitAmount: 0,
    profitPercentage: 0,
    numberOfDays: 0,
    amountPerDay: 0,
    issuingDate: new Date().toISOString().split("T")[0], // Today's date
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if days fields should be enabled
  const isDaysFieldsEnabled =
    formData.totalLoanAmount > 0 &&
    formData.profitAmount > 0 &&
    formData.profitPercentage > 0;

  // Auto-calculate profit percentage when profit amount or total loan amount changes
  useEffect(() => {
    if (formData.profitAmount > 0 && formData.totalLoanAmount > 0) {
      const percentage =
        (formData.profitAmount / formData.totalLoanAmount) * 100;
      setFormData((prev) => ({
        ...prev,
        profitPercentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      }));
    }
  }, [formData.profitAmount, formData.totalLoanAmount]);

  // Auto-calculate profit amount when profit percentage or total loan amount changes
  useEffect(() => {
    if (formData.profitPercentage > 0 && formData.totalLoanAmount > 0) {
      const amount =
        (formData.totalLoanAmount * formData.profitPercentage) / 100;
      setFormData((prev) => ({
        ...prev,
        profitAmount: Math.round(amount),
      }));
    }
  }, [formData.profitPercentage, formData.totalLoanAmount]);

  // Auto-calculate amount given when total loan amount and profit amount change
  useEffect(() => {
    if (formData.totalLoanAmount > 0 && formData.profitAmount > 0) {
      const amountGiven = formData.totalLoanAmount - formData.profitAmount;
      setFormData((prev) => ({
        ...prev,
        amountGiven: amountGiven,
      }));
    }
  }, [formData.totalLoanAmount, formData.profitAmount]);

  // Track which field was last changed to avoid circular calculations
  const [lastChangedField, setLastChangedField] = useState<string | null>(null);

  // Auto-calculate amount per day when total loan amount and number of days change
  useEffect(() => {
    if (
      formData.totalLoanAmount > 0 &&
      formData.numberOfDays > 0 &&
      lastChangedField === "numberOfDays"
    ) {
      const perDay = formData.totalLoanAmount / formData.numberOfDays;
      const roundedPerDay = Math.ceil(perDay);
      setFormData((prev) => ({
        ...prev,
        amountPerDay: roundedPerDay,
      }));
      // Clear the lastChangedField to prevent circular updates
      setLastChangedField(null);
    }
  }, [formData.totalLoanAmount, formData.numberOfDays, lastChangedField]);

  // Auto-calculate number of days when total loan amount and amount per day change
  useEffect(() => {
    if (
      formData.totalLoanAmount > 0 &&
      formData.amountPerDay > 0 &&
      lastChangedField === "amountPerDay"
    ) {
      const days = formData.totalLoanAmount / formData.amountPerDay;
      const roundedDays = Math.ceil(days);
      setFormData((prev) => ({
        ...prev,
        numberOfDays: roundedDays,
      }));
      // Clear the lastChangedField to prevent circular updates
      setLastChangedField(null);
    }
  }, [formData.totalLoanAmount, formData.amountPerDay, lastChangedField]);

  const handleInputChange = (
    field: keyof DailyLoanForm,
    value: string | number
  ) => {
    // Track which field was last changed for auto-calculation
    setLastChangedField(field);

    // If total loan amount is changed, clear all related fields
    if (field === "totalLoanAmount") {
      setFormData((prev) => ({
        ...prev,
        [field]: Number(value),
        // Clear all money, days, and percentage related fields
        amountGiven: 0,
        profitAmount: 0,
        profitPercentage: 0,
        numberOfDays: 0,
        amountPerDay: 0,
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

    if (formData.amountGiven <= 0) {
      newErrors.amountGiven = "Amount given must be greater than 0";
    }

    if (formData.profitAmount <= 0) {
      newErrors.profitAmount = "Profit amount must be greater than 0";
    }

    if (formData.numberOfDays <= 0) {
      newErrors.numberOfDays = "Number of days must be greater than 0";
    }

    if (formData.amountPerDay <= 0) {
      newErrors.amountPerDay = "Amount per day must be greater than 0";
    }

    // Validate that amountPerDay * numberOfDays is not less than totalLoanAmount
    // Allow any amount more due to rounding, but not less
    if (
      formData.amountPerDay > 0 &&
      formData.numberOfDays > 0 &&
      formData.totalLoanAmount > 0
    ) {
      const calculatedTotal = formData.amountPerDay * formData.numberOfDays;
      const difference = calculatedTotal - formData.totalLoanAmount;

      // Only check if calculated total is less than loan amount (not allowed)
      if (difference < 0) {
        newErrors.amountPerDay = `Amount per day × Number of days (${calculatedTotal}) is less than total loan amount (${formData.totalLoanAmount}). This is not allowed.`;
      }
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
      const loanData: CreateDailyLoanRequest = {
        customerName: formData.customerName,
        phoneNumber: formData.phoneNumber,
        totalLoanAmount: formData.totalLoanAmount,
        amountGiven: formData.amountGiven,
        profitAmount: formData.profitAmount,
        profitPercentage: formData.profitPercentage,
        numberOfDays: formData.numberOfDays,
        amountPerDay: formData.amountPerDay,
        issuingDate: formData.issuingDate,
      };

      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/daily`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(loanData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create daily loan");
      }

      // Redirect back to daily loans page
      router.push("/dashboard/daily");
    } catch (error: unknown) {
      console.error("Error creating loan:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error creating loan. Please try again.";
      // Error handling - you might want to add a notification system here too
      console.error("Error creating loan:", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/daily");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Create New Daily Loan
        </h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Fill in the details to create a new daily loan
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label
                htmlFor="customerName"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
              >
                Customer Name *
              </label>
              <input
                type="text"
                id="customerName"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm sm:text-base ${
                  errors.customerName ? "border-red-500" : "border-gray-300"
                }`}
                value={formData.customerName}
                onChange={(e) =>
                  handleInputChange("customerName", e.target.value)
                }
                placeholder="Enter customer name"
              />
              {errors.customerName && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">
                  {errors.customerName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm sm:text-base ${
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
                <p className="mt-1 text-xs sm:text-sm text-red-600">
                  {errors.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* Loan Amount Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                htmlFor="profitAmount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Profit Amount *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium">₹</span>
                </div>
                <input
                  type="number"
                  id="profitAmount"
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                    errors.profitAmount ? "border-red-500" : "border-gray-300"
                  }`}
                  value={formData.profitAmount || ""}
                  onChange={(e) =>
                    handleInputChange("profitAmount", Number(e.target.value))
                  }
                  placeholder="Enter profit amount"
                  min="0"
                />
              </div>
              {errors.profitAmount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.profitAmount}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profitPercentage"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Profit Percentage *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium">%</span>
                </div>
                <input
                  type="number"
                  id="profitPercentage"
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                    errors.profitPercentage
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={formData.profitPercentage || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "profitPercentage",
                      Number(e.target.value)
                    )
                  }
                  placeholder="Enter profit percentage"
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.profitPercentage && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.profitPercentage}
                </p>
              )}
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
              Total Loan Amount - Profit Amount
            </p>
          </div>

          {/* Days and Amount per Day */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="numberOfDays"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Number of Days *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium">📅</span>
                </div>
                <input
                  type="number"
                  id="numberOfDays"
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                    errors.numberOfDays ? "border-red-500" : "border-gray-300"
                  } ${
                    !isDaysFieldsEnabled ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                  value={formData.numberOfDays || ""}
                  onChange={(e) =>
                    handleInputChange("numberOfDays", Number(e.target.value))
                  }
                  placeholder={
                    isDaysFieldsEnabled
                      ? "Enter number of days"
                      : "Complete loan details first"
                  }
                  min="1"
                  disabled={!isDaysFieldsEnabled}
                />
              </div>
              {errors.numberOfDays && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.numberOfDays}
                </p>
              )}
              {!isDaysFieldsEnabled && (
                <p className="mt-1 text-xs text-gray-500">
                  Enter total loan amount, profit amount, and profit percentage
                  first
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="amountPerDay"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Amount per Day *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm font-medium">₹</span>
                </div>
                <input
                  type="number"
                  id="amountPerDay"
                  className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                    errors.amountPerDay ? "border-red-500" : "border-gray-300"
                  } ${
                    !isDaysFieldsEnabled ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                  value={formData.amountPerDay || ""}
                  onChange={(e) =>
                    handleInputChange("amountPerDay", Number(e.target.value))
                  }
                  placeholder={
                    isDaysFieldsEnabled
                      ? "Enter amount per day"
                      : "Complete loan details first"
                  }
                  min="1"
                  disabled={!isDaysFieldsEnabled}
                />
              </div>
              {errors.amountPerDay && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.amountPerDay}
                </p>
              )}
              {!isDaysFieldsEnabled && (
                <p className="mt-1 text-xs text-gray-500">
                  Enter total loan amount, profit amount, and profit percentage
                  first
                </p>
              )}
            </div>
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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              {isSubmitting ? "Creating..." : "Create Loan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
