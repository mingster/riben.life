"use client";
import Breadcrumb from "@/components/ui/Breadcrumbs/Breadcrumb";
import ChartOne from "@/components/ui/Charts/ChartOne";
import ChartThree from "@/components/ui/Charts/ChartThree";
import ChartTwo from "@/components/ui/Charts/ChartTwo";
import type React from "react";

const Chart: React.FC = () => {
  return (
    <>
      <Breadcrumb pageName="Chart" />

      <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        <ChartOne />
        <ChartTwo />
        <ChartThree />
      </div>
    </>
  );
};

export default Chart;
