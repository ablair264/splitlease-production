"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler
);

export interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  chartData?: Array<{ name: string; value: number }>;
  format?: "currency" | "number" | "percentage";
  displayMode?: "compact" | "medium" | "large";
  design?: "variant1" | "variant2" | "variant3";
  icon?: React.ReactNode;
  color?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  chartData = [],
  format = "number",
  displayMode = "medium",
  design = "variant1",
  icon,
  color = "#79d5e9",
  onClick,
}: MetricCardProps) {
  const renderChart = () => {
    if (!chartData || chartData.length === 0) {
      return null;
    }

    const labels = chartData.map((item) => item.name);
    const values = chartData.map((item) => item.value);

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { display: false },
        y: { display: false },
      },
      elements: {
        point: { radius: 0 },
      },
      interaction: {
        intersect: false,
      },
    };

    let chartDataConfig;
    let ChartComponent: typeof Line | typeof Bar;

    if (design === "variant1") {
      // Line chart
      ChartComponent = Line;
      chartDataConfig = {
        labels,
        datasets: [
          {
            data: values,
            borderColor: color,
            backgroundColor: "transparent",
            fill: false,
            borderWidth: 2,
            tension: 0.4,
          },
        ],
      };
    } else if (design === "variant2") {
      // Bar chart
      ChartComponent = Bar;
      const barColors = values.map((_, index) =>
        index === Math.floor(values.length / 2) ? "#fbbf24" : color
      );
      chartDataConfig = {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: barColors,
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false as const,
          },
        ],
      };
    } else {
      // Area chart for variant3
      ChartComponent = Line;
      chartDataConfig = {
        labels,
        datasets: [
          {
            data: values,
            borderColor: color,
            backgroundColor: `${color}40`,
            fill: true,
            borderWidth: 2,
            tension: 0.4,
          },
        ],
      };
    }

    return (
      <div className="w-full h-full relative">
        <ChartComponent data={chartDataConfig} options={chartOptions} />
      </div>
    );
  };

  // Compact mode
  if (displayMode === "compact") {
    return (
      <div
        onClick={onClick}
        className={cn(
          "bg-white/5 backdrop-blur-[10px] rounded-xl px-4 py-4 flex items-center gap-4",
          "border-l-[3px] h-[90px] transition-all duration-300",
          "hover:translate-y-[-2px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
          onClick && "cursor-pointer"
        )}
        style={{ borderLeftColor: color }}
      >
        {/* Icon */}
        <div
          className="shrink-0 w-[50px] h-[50px] flex items-center justify-center rounded-[10px] text-white text-xl"
          style={{ backgroundColor: color }}
        >
          {icon || "💰"}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold text-white leading-none mb-1">
            {typeof value === "number" ? (
              <CountUp
                end={value}
                duration={1.5}
                separator=","
                prefix={format === "currency" ? "£" : ""}
                suffix={format === "percentage" ? "%" : ""}
                decimals={format === "percentage" ? 1 : 0}
              />
            ) : (
              value
            )}
          </div>
          <div className="text-[13px] text-white/70 font-medium uppercase tracking-wide">
            {title}
          </div>
        </div>

        {/* Trend badge */}
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-[13px] font-semibold px-3 py-1 rounded-full",
              trend.isPositive
                ? "text-[#4d9869] bg-[#4d9869]/10"
                : "text-[#dd4444] bg-[#dd4444]/10"
            )}
          >
            <span>{trend.isPositive ? "↗" : "↘"}</span>
            <span>+{Math.abs(trend.value).toFixed(0)}%</span>
          </div>
        )}
      </div>
    );
  }

  // Full card mode (medium/large)
  const getCardStyles = () => {
    switch (design) {
      case "variant1":
        return {
          borderLeftWidth: "3px",
          borderLeftStyle: "solid" as const,
          borderLeftColor: color,
        };
      case "variant2":
        return {
          borderLeftWidth: "3px",
          borderLeftStyle: "solid" as const,
          borderLeftColor: color,
        };
      case "variant3":
        return {
          borderLeftWidth: "3px",
          borderLeftStyle: "solid" as const,
          borderLeftColor: color,
        };
      default:
        return {};
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white/5 backdrop-blur-[10px] rounded-xl p-4 relative transition-all duration-300",
        "flex flex-col overflow-hidden",
        "hover:translate-y-[-1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
        onClick && "cursor-pointer"
      )}
      style={getCardStyles()}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">
          {title}
        </h3>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold",
              trend.isPositive ? "text-[#4d9869]" : "text-[#dd4444]"
            )}
          >
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value).toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="font-bold text-white text-2xl tracking-tight leading-none mb-1">
        {typeof value === "number" ? (
          <CountUp
            end={value}
            duration={1.5}
            separator=","
            prefix={format === "currency" ? "£" : ""}
            suffix={format === "percentage" ? "%" : ""}
            decimals={format === "percentage" ? 1 : 0}
          />
        ) : (
          value
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-[11px] text-white/50 mb-2">{subtitle}</div>
      )}

      {/* Chart */}
      {chartData && chartData.length > 0 && (
        <div className="flex-1 mx-[-4px] mt-auto overflow-hidden relative z-[1] h-[60px] min-h-[60px]">
          {renderChart()}
        </div>
      )}

      {/* Date range */}
      {chartData && chartData.length > 0 && (
        <div className="flex justify-between text-[10px] text-white/40 mt-1 px-1">
          <span>{chartData[0]?.name}</span>
          <span>{chartData[chartData.length - 1]?.name}</span>
        </div>
      )}
    </div>
  );
}
