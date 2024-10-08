"use client";

import CardDataStats from "@/components/ui/CardDataStats";
import ChartOne from "@/components/ui/Charts/ChartOne";
import ChartThree from "@/components/ui/Charts/ChartThree";
import ChartTwo from "@/components/ui/Charts/ChartTwo";
import ChatCard from "@/components/ui/Chat/ChatCard";
import MapOne from "@/components/ui/Maps/MapOne";
import TableOne from "@/components/ui/Tables/TableOne";
import { DollarSign, Eye, PersonStanding, Sofa } from "lucide-react";
import { RequiredProVersion } from "./require-pro-version";

export interface props {
  disablePaidOptions: boolean;
}
export const MockupDashboardContent: React.FC<props> = ({
  disablePaidOptions
}) => {

  //disablePaidOptions = true;

  return (
    <>
      {
        disablePaidOptions && <RequiredProVersion />
      }
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        <CardDataStats title="Total views" total="$3.456K" rate="0.43%" levelUp>
          <Eye />
        </CardDataStats>
        <CardDataStats title="Total Profit" total="$47,2K" rate="4.35%" levelUp>
          <DollarSign />
        </CardDataStats>
        <CardDataStats title="Total Product" total="2.450" rate="2.59%" levelUp>
          <Sofa />
        </CardDataStats>
        <CardDataStats title="Total Users" total="3.456" rate="0.95%" levelDown>
          <PersonStanding />
        </CardDataStats>
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <ChartOne />
        <ChartTwo />
        <ChartThree />
        <MapOne />
        <div className="col-span-12 xl:col-span-8">
          <TableOne />
        </div>
        <ChatCard />
      </div>
    </>
  );
};
