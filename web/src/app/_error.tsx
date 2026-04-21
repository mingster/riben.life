import type { NextPage } from "next";
import type { ErrorProps } from "next/error";
import Error from "next/error";

const CustomErrorComponent: NextPage<ErrorProps> = (props) => {
	return <Error statusCode={props.statusCode} />;
};

CustomErrorComponent.getInitialProps = async (contextData) => {
	// Log error to console
	console.error("Error occurred:", contextData);
	// This will contain the status code of the response
	return Error.getInitialProps(contextData);
};

export default CustomErrorComponent;
