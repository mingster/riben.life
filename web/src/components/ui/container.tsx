"use client";

import { useStoreAdminFullWidth } from "@/contexts/store-admin-full-width";
import { cn } from "@/lib/utils";

interface ContainerProps {
	children: React.ReactNode;
	className?: string;
	/**
	 * Force full-width inner layout even outside store admin (e.g. embedded previews).
	 * Inside store admin, width is full by default via {@link StoreAdminFullWidthProvider}.
	 */
	fullWidth?: boolean;
}

const Container: React.FC<ContainerProps> = ({
	children,
	className,
	fullWidth: fullWidthProp,
}) => {
	const storeAdminFullWidth = useStoreAdminFullWidth();
	const fullWidth = fullWidthProp ?? storeAdminFullWidth;

	return (
		<div className={cn("w-full min-h-screen min-w-0 pt-2 px-1", className)}>
			<div
				className={cn(
					"rounded min-h-[98%] min-w-0",
					fullWidth ? "w-full max-w-none" : "xl:container xl:mx-auto",
				)}
			>
				{/*bg-gradient-to-b from-indigo-500 via-purple-700 to-indigo-900*/}
				{children}
			</div>
		</div>
	);
};

export default Container;
