"use client";

import { cn } from "@/lib/utils";

interface ContainerProps {
	children: React.ReactNode;
	className?: string;
}

const Container: React.FC<ContainerProps> = ({ children, className }) => {
	return (
		<div className={cn("w-full min-h-screen pt-2 px-1", className)}>
			<div className="rounded min-h-[98%] xl:container xl:mx-auto">
				{/*bg-gradient-to-b from-indigo-500 via-purple-700 to-indigo-900*/}
				{children}
			</div>
		</div>
	);
};

export default Container;
