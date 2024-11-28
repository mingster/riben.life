"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { useTimer } from "react-timer-hook";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const FaqClient: React.FC = () => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, 'storeAdmin');

  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(initialTab || "orders"); //show order tab by default

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

  const title = t('QandA');
  return (

    <Container>
      <Heading title={title} description={""} />

      <Tabs
        value={activeTab}
        defaultValue="orders"
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">{t("account_tabs_orders")}</TabsTrigger>
          <TabsTrigger value="linepay">Line Pay</TabsTrigger>
          <TabsTrigger value="account">{t("account_tabs_account")}</TabsTrigger>
          {/*<TabsTrigger value="password">
            {t("account_tabs_password")}
          </TabsTrigger>
          */}
        </TabsList>


        <TabsContent value="linepay">

          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>收款會被收手續費嗎？</AccordionTrigger>
              <AccordionContent>
                LINE Pay 收款手續費為交易金額3%未稅，將自撥付給您的交易金額中扣除。無論您的客戶是使用信用卡、LINE POINTS 或iPASS MONEY 付款給您，手續費率均一為 3% 未稅。

                <div className='pt-1'>例如某筆交易金額為 100 元，手續費為 3 元×1.05=3.15 元，四捨五入即為 3 元，交易紀錄中將顯示該筆交易金額為 100 元、收款手續費 3 元。
                撥款給您時將扣除手續費後撥款 97 元給您，您會看到iPASS MONEY 帳戶內可用餘額增加 97 元。</div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>


        </TabsContent>

      </Tabs>

    </Container>
  );
};
