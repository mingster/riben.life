type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

import Container from "@/components/ui/container";

//線上排隊
/*
零設備成本
不需添購設備，電腦或平板就能操作，不必再買叫號燈、熱感應紙，現省五位數成本！

不需綁定機台
開網頁就能操作，不必綁定iPad或特定機台、不必安裝軟體，節省軟硬體費用。

簡化現場流程
告別人工叫號、手寫資料，讓客人以手機留下資訊，節省人力成本。

快速完成排隊
無需下載App，客人只要以手機掃描QRcode登入網址，30秒內就能完成排隊。

降低客訴可能
客人隨時能以手機查看排隊狀況與等候時間，避免來回詢問增加現場人員負擔與不耐感。

一鍵通知顧客
不必在現場大喊，一鍵就能送出通知，自動發送簡訊、LINE、或email提醒即將可入座的顧客。
*/
export default async function WaitingListSettingsPage(props: { // Note: rename to WaitingListSettingsPage to match the file name
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	return (
		<Container>
			<div>Waiting List Settings - Coming Soon</div>
		</Container>
	);
}
