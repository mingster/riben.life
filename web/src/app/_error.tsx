import type { NextPage } from "next";
import type { ErrorProps } from "next/error";
import Error from "next/error";
import logger from "@/lib/logger";

const CustomErrorComponent: NextPage<ErrorProps> = (props) => {
	return <Error statusCode={props.statusCode} />;
};

CustomErrorComponent.getInitialProps = async (contextData) => {
	// Log error to console
	logger.error("Error occurred", {
		metadata: {
			statusCode: contextData.res?.statusCode,
			error: contextData.err?.message,
		},
		tags: ["error"],
	});
	// This will contain the status code of the response
	return Error.getInitialProps(contextData);
};

export default CustomErrorComponent;
