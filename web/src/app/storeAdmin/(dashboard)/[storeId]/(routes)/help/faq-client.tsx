"use client";
import { useTranslation } from "@/app/i18n/client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const FaqClient: React.FC = () => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const searchParams = useSearchParams();

	const initialTab = searchParams.get("tab");
	const [activeTab, setActiveTab] = useState(initialTab || "accounting"); //show order tab by default

	const handleTabChange = (value: string) => {
		//update the state
		setActiveTab(value);
		// update the URL query parameter
		//router.push({ query: { tab: value } });
	};

	// if the query parameter changes, update the state
	useEffect(() => {
		if (initialTab) setActiveTab(initialTab);
	}, [initialTab]);
	//console.log('selectedTab: ' + activeTab);

	return (
		<Container className="lg:pl-2 pr-2">
			<Heading title={t("QandA")} description={""} />

			<Tabs
				value={activeTab}
				defaultValue="orders"
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="getStarted">如何開始</TabsTrigger>
					<TabsTrigger value="accounting">帳務</TabsTrigger>
					<TabsTrigger value="linepay">Line Pay</TabsTrigger>
					{/*<TabsTrigger value="password">
            {t("account_tabs_password")}
          </TabsTrigger>
          */}
				</TabsList>
				<TabsContent value="getStarted">
					<Accordion type="single" collapsible>
						<AccordionItem value="item-0">
							<AccordionTrigger className="font-bold text-gold">
								開設商店
							</AccordionTrigger>
							<AccordionContent />
						</AccordionItem>

						<AccordionItem value="item-10">
							<AccordionTrigger className="font-bold text-gold">
								新增產品及上架
							</AccordionTrigger>
							<AccordionContent />
						</AccordionItem>

						<AccordionItem value="item-20">
							<AccordionTrigger className="font-bold text-gold">
								[基礎篇] 操作教學
							</AccordionTrigger>
							<AccordionContent />
						</AccordionItem>

						<AccordionItem value="item-30">
							<AccordionTrigger className="font-bold text-gold">
								[進階篇] 操作教學
							</AccordionTrigger>
							<AccordionContent />
						</AccordionItem>

						<AccordionItem value="item-40">
							<AccordionTrigger className="font-bold text-gold">
								[收單篇] 操作教學
							</AccordionTrigger>
							<AccordionContent />
						</AccordionItem>

						<AccordionItem value="item-50">
							<AccordionTrigger className="font-bold text-gold">
								開啟客戶支援
							</AccordionTrigger>
							<AccordionContent />
						</AccordionItem>
					</Accordion>
				</TabsContent>

				<TabsContent value="accounting">
					<Accordion type="single" collapsible>
						<AccordionItem value="item-1">
							<AccordionTrigger className="font-bold text-gold">
								我的營業額/ 金流
							</AccordionTrigger>
							<AccordionContent>
								Riben.life協助店家收款，所收款項會成爲您的平台可用餘額。您可以手動或自動，依照您設定的提領時間，提領您的可用餘額，轉帳到您設定的出金銀行帳戶。
								<div className="pt-2">
									若您自有第三方金流帳號，如：LINE
									Pay店家帳號，您可以在商店設定內輸入。這樣平台就不會代收款，所收款項會直接使用您的第三方金流設定。
								</div>
							</AccordionContent>
						</AccordionItem>

						<AccordionItem value="item-2">
							<AccordionTrigger className="font-bold text-gold">
								提領是什麼意思？
							</AccordionTrigger>
							<AccordionContent>
								Riben.life協助 基礎版店家
								收款，所收款項會成爲您的平台可用餘額。您可以手動或自動，依照您設定的提領時間，提領您的可用餘額，轉帳到您設定的出金銀行帳戶。
								<div className="pt-2">
									提領完成後，平台內的可用餘額會減少，提領銀行帳戶的存款會增加。
								</div>
								<div className="pt-2">
									您可連結以下 39 間金融機構的帳戶，即可提領 iPASS MONEY
									內的餘額：臺灣銀行、土地銀行、合作金庫銀行、第一銀行、華南銀行、彰化銀行、上海銀行、台北富邦銀行、國泰世華銀行、高雄銀行、兆豐銀行、花旗（台灣）銀行、王道銀行、台灣企銀、LINE
									Bank（連線銀行）、渣打銀行、台中銀行、京城銀行、匯豐（台灣）銀行、瑞興銀行、華泰銀行、台灣新光銀行、陽信銀行、板信銀行、三信銀行、聯邦銀行、遠東商銀、元大銀行、永豐銀行、玉山銀行、凱基銀行、星展（台灣）銀行、台新銀行、日盛銀行、安泰銀行、中國信託銀行、中華郵政、農業金庫、各農漁會
									提醒您，除指定銀行享提領手續費 0
									元優惠外，其餘銀行提領手續費為 15
									元，請參閱下列提領手續費列表。（自 2023 年 5 月 1 日起適用）。
								</div>
								<div className="pt-2">
									手續費 0 元：聯邦商業銀行、LINE
									Bank（連線商業銀行）、臺灣銀行、合作金庫商業銀行、兆豐國際商業銀行、農業金庫、王道商業銀行、臺灣中小企業銀行、瑞興商業銀行、遠東國際商業銀行、元大商業銀行、凱基商業銀行、台中商業銀行。
									手續費 15
									元：臺灣土地銀行、第一商業銀行、彰化商業銀行、台北富邦商業銀行、國泰世華商業銀行、高雄銀行、新光商業銀行、永豐商業銀行、玉山商業銀行、台新國際商業銀行、中國信託商業銀行、中華郵政公司、華南商業銀行、上海商業儲蓄銀行、花旗（台灣）商業銀行、渣打國際商業銀行、京城商業銀行、匯豐（台灣）商業銀行、華泰商業銀行、陽信商業銀行、板信商業銀行、三信商業銀行、星展（台灣）商業銀行、日盛國際商業銀行、安泰商業銀行、各農漁會。
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</TabsContent>

				<TabsContent value="linepay">
					<Accordion type="single" collapsible>
						<AccordionItem value="item-1">
							<AccordionTrigger className="font-bold text-gold">
								收款會被收手續費嗎？
							</AccordionTrigger>
							<AccordionContent>
								LINE Pay
								收款手續費為交易金額3%未稅，將自撥付給您的交易金額中扣除。無論您的客戶是使用信用卡、LINE
								POINTS 或iPASS MONEY 付款給您，手續費率均一為 3% 未稅。
								<div className="pt-2">
									例如某筆交易金額為 100 元，手續費為 3 元×1.05=3.15
									元，四捨五入即為 3 元，交易紀錄中將顯示該筆交易金額為 100
									元、收款手續費 3 元。 撥款給您時將扣除手續費後撥款 97
									元給您，您會看到iPASS MONEY 帳戶內可用餘額增加 97 元。
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</TabsContent>
			</Tabs>
		</Container>
	);
};
