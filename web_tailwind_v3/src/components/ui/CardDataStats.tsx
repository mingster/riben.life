import { TrendingDown, TrendingUp } from "lucide-react";
import type React from "react";
import type { ReactNode } from "react";

interface CardDataStatsProps {
	title: string;
	total: string;
	rate?: string;
	levelUp?: boolean;
	levelDown?: boolean;
	children: ReactNode;
}

const CardDataStats: React.FC<CardDataStatsProps> = ({
	title,
	total,
	rate,
	levelUp,
	levelDown,
	children,
}) => {
	return (
		<div className="flex rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
			<div className="flex size-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
				{children}
			</div>

			<div className="flex mt-0 pl-2 items-center justify-center">
				<div>
					<h4 className="text-title-md font-bold text-black dark:text-primary">
						{total}
					</h4>
					<span className="text-sm font-medium">{title}</span>
				</div>
			</div>
			{rate && (
				<div
					className={`flex pl-10 items-center gap-1 text-sm font-medium ${
						levelUp && "text-meta-3"
					} ${levelDown && "text-meta-5"} `}
				>
					{rate}

					{levelUp && <TrendingUp width={10} height={11} />}
					{levelDown && <TrendingDown width={10} height={11} />}
				</div>
			)}
		</div>
	);
};

export default CardDataStats;
