import Container from "@/components/ui/container";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 線上排隊系統
 * 掃QRcode、看菜單餐點、不必在場、自動通知、回餐廳、入座
 * 客人以手機掃描 QRcode 會來到此網址，登記後即可排隊。
 * 客人可以手機查看排隊狀況與等候時間
 *
 * https://menushop.tw/queue_system
 * @param props
 * @returns
 */
export default async function WaitingListPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	return (
		<Container>
			<div>Waiting List - Coming Soon</div>
		</Container>
	);
}
