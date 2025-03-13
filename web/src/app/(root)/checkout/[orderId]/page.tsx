// route to payment provider based on region and currency
//
const CheckoutHomePage = async (props: {
	params: Promise<{ orderId: string }>;
}) => {
	const params = await props.params;
	//console.log('orderId: ' + params.orderId);

	if (!params.orderId) {
		throw new Error("order Id is missing");
	}

	//redirect(`./stripe/${params.orderId}`);

	return <></>;
};

export default CheckoutHomePage;
