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


候位更聰明，掌握更即時！
顧客可取消或保留候位，商家即時掌握動態，提升候位系統效率，減少空等與人力浪費。

LINE 整合，不需安裝 APP
掃描 QR Code 即可用 LINE 完成線上候位，免下載 App、不用註冊，操作零門檻。

免排隊現場候位，顧客彈性等待
顧客不需現場排隊，可彈性等候叫號通知，適合餐廳、診所等需智慧排隊場域。

選擇人數，精準安排座位
搭配自選候位人數選項（如 2 人~8人等），方便商家安排座位，是餐飲叫號機的最佳搭配。

LINE 訊息自動通知進場
LINE 自動推送叫號提醒，顧客不漏號，體驗更順暢，提升整體排隊服務品質。

後台操作簡單，無須安裝設備
後台管理簡單，免硬體設備，員工快速上手，快速導入各類候位與點餐整合場景。

*/
export default async function WaitingListSettingsPage(props: {
	// Note: rename to WaitingListSettingsPage to match the file name
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
