import { BigText, Caption, IconContainer, Paragraph } from "./common";

export function UseCases({ className, ...props }: { className?: string }) {
	return (
		<section id="useCases" className="relative min-h-screen">
			<div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
				<div className="flex gap-2">
				{/*
					<IconContainer
						className="dark:bg-sky-500 dark:highlight-white/20"
						light={require("@/img/icons/home/editor-tools.png").default.src}
						dark={require("@/img/icons/home/dark/editor-tools.png").default.src}
					/>*/}
					<Caption className="text-sky-500">使用情境</Caption>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 md:gap-4 gap-1">
					<div>
						<BigText>客戶預約座位</BigText>
						<Caption>適用場景：高需求的特定時段（如周末、假日）</Caption>
						<Paragraph>
							顧客在谷歌圖進入系統，選擇日期和時間進行預約。
						</Paragraph>
						<Paragraph>店家根據預約情況安排座位、人力和食材。</Paragraph>
					</div>
					<div>
						<BigText>客戶預約#2</BigText>
						<Caption>適用場景：一般日</Caption>
						<Paragraph>
							顧客出發前，進入系統檢視目前狀況，預先排隊取號。
						</Paragraph>
					</div>
					<div>
						<BigText>調整營業時間</BigText>
						<Caption>適用場景：放假日</Caption>
						<Paragraph>店家進入後台，修改相關的營業時間。</Paragraph>
					</div>
					<div>
						<BigText>顧客線上點餐</BigText>
						<Caption>適用場景：各種餐飲業</Caption>
						<Paragraph>顧客透過掃碼，直接線上點餐/付款。</Paragraph>
						<Paragraph>
							店家接單後，顧客依據回覆的資訊，依時間來取貨。
						</Paragraph>
					</div>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 md:gap-4 gap-1">
					<div>
						<BigText>店內自助點餐</BigText>
						<Caption>適用場景：各種餐飲業</Caption>
						<Paragraph>顧客透過掃碼，自行選擇菜品，無需店員介入。</Paragraph>
						<Paragraph>
							菜單隨時更新，避免了傳統菜單的缺陷，如售罄菜品的標示不及時。
						</Paragraph>
					</div>

					<div>
						<BigText>店員桌邊點餐</BigText>
						<Caption>適用場景：高單價餐廳、每日有特色食材的餐廳。</Caption>
						<Paragraph>
							店員使用平板或手機快速下單，協助沒有手機的顧客。
						</Paragraph>
					</div>
					<div>
						<BigText>候位中點餐</BigText>
						<Caption>適用場景：繁忙的餐廳或需要排隊的情況。</Caption>
						<Paragraph>
							顧客在候位時就可以掃碼點餐，縮短等待時間並提升用餐效率。
						</Paragraph>
					</div>
					<div>
						<BigText>用餐後結帳</BigText>
						<Caption>適用場景：火鍋店、燒烤店等需要多次加點的場合。</Caption>
						<Paragraph>
							顧客可以隨時掃碼加點，並在用餐結束後一次性結帳，這樣不僅提升了顧客體驗，也有助於提高客單價。
						</Paragraph>
					</div>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 md:gap-4 gap-1">
					<div>
						<BigText>接單製作</BigText>
						<Caption>適用場景：廚房</Caption>
						<Paragraph>
							顧客下單後，廚房的平板詳列訂單。人員直接開始準備。
						</Paragraph>
						<Paragraph>出餐後，勾選&quot;已出餐&quot;，來完成訂單。</Paragraph>
					</div>
					<div>
						<BigText>調整菜單</BigText>
						<Caption>適用場景：某種食材用完時</Caption>
						<Paragraph>店家進入後台，修改庫存數量。</Paragraph>
						<Paragraph>顧客掃碼點餐時，只可點選有庫存的菜品。</Paragraph>
					</div>
					<div>
						<BigText>數據報表</BigText>
						<Caption>適用場景：每日進行食材採買前</Caption>
						<Paragraph>
							依據分析報表，可看到每週五某菜品比其他日平常多5%。因此今天需多訂一點。
						</Paragraph>
					</div>
					<div>
						<BigText>調整收款方式</BigText>
						<Caption>適用場景：各種餐飲業</Caption>
						<Paragraph>進入後台，勾選要打開的收款方式。</Paragraph>
						<Paragraph>進階版：可勾選餐前 或 餐後收款。</Paragraph>
					</div>
				</div>
			</div>
		</section>
	);
}
