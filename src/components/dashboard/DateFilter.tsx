"use client";
import React, { useState } from "react";
import { FiCalendar, FiChevronDown } from "react-icons/fi";

export type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

export type DateFilterProps = {
  onDateChange: (dateRange: DateRange) => void;
  className?: string;
};

const DateFilter: React.FC<DateFilterProps> = ({
  onDateChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string>("this-month");
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const toggleDropdown = () => setIsOpen(!isOpen);

  const getDateRange = (rangeType: string): DateRange => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let label = "";

    switch (rangeType) {
      case "today":
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        label = "Aujourdhui";
        break;
      case "yesterday":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setDate(today.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        label = "Hier";
        break;
      case "this-week":
        startDate = new Date(today);
        startDate.setDate(
          today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)
        ); // Lundi de cette semaine
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        label = "Cette semaine";
        break;
      case "last-week":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() - 6);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setDate(today.getDate() - today.getDay());
        endDate.setHours(23, 59, 59, 999);
        label = "Semaine dernière";
        break;
      case "this-month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today);
        label = "Ce mois-ci";
        break;
      case "last-month":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        label = "Mois dernier";
        break;
      case "this-quarter":
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today);
        label = "Ce trimestre";
        break;
      case "this-year":
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today);
        label = "Cette année";
        break;
      case "last-year":
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        label = "Année dernière";
        break;
      case "custom":
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        const formatDate = (date: Date) => {
          return `${date.getDate()}/${
            date.getMonth() + 1
          }/${date.getFullYear()}`;
        };
        label = `Du ${formatDate(startDate)} au ${formatDate(endDate)}`;
        break;
      default:
        label = "Période personnalisée";
    }

    return { startDate, endDate, label };
  };

  const handleRangeSelect = (rangeType: string) => {
    setSelectedRange(rangeType);
    const dateRange = getDateRange(rangeType);
    onDateChange(dateRange);

    if (rangeType !== "custom") {
      setIsOpen(false);
    }
  };

  const applyCustomRange = () => {
    handleRangeSelect("custom");
    setIsOpen(false);
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const currentRange = getDateRange(selectedRange);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-between w-full py-2 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
      >
        <div className="flex items-center">
          <FiCalendar className="text-gray-500 dark:text-gray-300 mr-2" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {currentRange.label}
          </span>
        </div>
        <FiChevronDown className="text-gray-500 dark:text-gray-300" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 p-2">
          <div className="space-y-1">
            <button
              onClick={() => handleRangeSelect("today")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedRange === "today"
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              Aujourdhui
            </button>
            <button
              onClick={() => handleRangeSelect("yesterday")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedRange === "yesterday"
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              Hier
            </button>
            <button
              onClick={() => handleRangeSelect("this-week")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedRange === "this-week"
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              Cette semaine
            </button>
            <button
              onClick={() => handleRangeSelect("last-week")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedRange === "last-week"
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              Semaine dernière
            </button>
            <button
              onClick={() => handleRangeSelect("this-month")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedRange === "this-month"
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              Ce mois-ci
            </button>
            <button
              onClick={() => handleRangeSelect("last-month")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedRange === "last-month"
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              Mois dernier
            </button>
            <button
              onClick={() => handleRangeSelect("this-quarter")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedRange === "this-quarter"
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              Ce trimestre
            </button>
            <button
              onClick={() => handleRangeSelect("this-year")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedRange === "this-year"
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              Cette année
            </button>
            <button
              onClick={() => handleRangeSelect("last-year")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedRange === "last-year"
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              Année dernière
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Période personnalisée
              </p>
              <div className="flex flex-col space-y-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Du
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full p-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Au
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full p-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                  />
                </div>
                <button
                  onClick={applyCustomRange}
                  className="mt-2 w-full py-1 px-3 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;
