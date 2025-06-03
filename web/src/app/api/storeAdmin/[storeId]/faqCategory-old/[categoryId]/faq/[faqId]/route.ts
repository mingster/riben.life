import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

///!SECTION update faq record in database.
export async function PATCH(
	req: Request,
	props: {
		params: Promise<{ storeId: string; categoryId: string; faqId: string }>;
	},
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.categoryId) {
			return new NextResponse("category id is required", { status: 401 });
		}

		if (!params.faqId) {
			return new NextResponse("faq id is required", { status: 402 });
		}

		const body = await req.json();
		const obj = await sqlClient.faq.update({
			where: {
				id: params.faqId,
			},
			data: { ...body },
		});

		//console.log(`update Faq: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		console.log("[FAQ_PATCH]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

///!SECTION delete faq record in database.
export async function DELETE(
	req: Request,
	props: {
		params: Promise<{ storeId: string; categoryId: string; faqId: string }>;
	},
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.categoryId) {
			return new NextResponse("category id is required", { status: 401 });
		}
		if (!params.faqId) {
			return new NextResponse("faq id is required", { status: 402 });
		}

		const _body = await req.json();
		const obj = await sqlClient.faq.delete({
			where: {
				id: params.faqId,
			},
		});

		//console.log(`delete Faq: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		console.log("[FAQ_DELETE]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
