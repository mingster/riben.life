"use client";

import { ClipLoader } from "react-spinners";

//error is optional
export const Loader = ({ error }: { error?: boolean } = {}) => {
	return (
		<div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-3 sm:px-4 lg:px-6">
			<ClipLoader color={error ? "#ff0036" : "#3498db"} size={50} />
		</div>
	);
};
