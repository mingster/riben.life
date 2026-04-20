"use client";

import { ClipLoader } from "react-spinners";

//error is optional
export const Loader = ({ error }: { error?: boolean } = {}) => {
	return (
		<div className="w-full">
			<div className="flex h-screen place-items-center place-content-center">
				<ClipLoader color={error ? "#ff0036" : "#3498db"} size={50} />
			</div>
		</div>
	);
};
