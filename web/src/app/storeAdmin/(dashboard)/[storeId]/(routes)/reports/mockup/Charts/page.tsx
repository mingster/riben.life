"use client";
import Breadcrumb from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/reports/mockup/Breadcrumbs/Breadcrumb";
import ChartOne from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/reports/mockup/Charts/ChartOne";
import ChartThree from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/reports/mockup/Charts/ChartThree";
import ChartTwo from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/reports/mockup/Charts/ChartTwo";
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
