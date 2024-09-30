import clsx from "clsx";
import { CheckIcon, XIcon } from "lucide-react";
import { BigText, Caption, IconContainer, Paragraph } from "./common";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const features_qrcode = [
  {
    description: "不須另外下載APP，客人直接掃碼，用手機點餐",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "自取點餐，不須在現場。只要掃碼，時間到即可來取餐。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "入座後，直接掃桌上的條碼、綁定桌號，資訊明確，出餐無負擔。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "自訂餐點規格、庫存，減少服務負擔。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "多元支付，提升點餐效率，加倍翻桌效率。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "用餐後結帳。",
    basic: false,
    advanced: true,
    multi: true,
  },
  {
    description: "現金或原有店內系統結帳。",
    basic: false,
    advanced: true,
    multi: true,
  },
];

const features_rsvp = [
  {
    description: "線上訂位：確認客人訂位資訊後，直接取得排隊號碼，時時掌握店家排隊狀態。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "電話訂位：消費者來電訂位，店家端爲客人紀錄訂位資訊。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "預約訂餐：直接線上訂餐，減少雙方的時間壓力。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "檢視未帶位、已入座、過號的客人資訊，桌位狀況一目了然。",
    basic: false,
    advanced: true,
    multi: true,
  },
  {
    description: "自定營業時間，避免客戶空跑。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description:
      "整合Google 預訂服務，消費者透過 Google 搜尋／地圖即可完成線上訂位。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "Google日曆及Gmail用餐提醒通知。",
    basic: true,
    advanced: true,
    multi: true,
  },
];

const features_pos = [
  {
    description: "訂單/出餐流程自動化",
    basic: true,
    advanced: true,
    multi: true,
  },
  /*
  {
    description: "桌位管理，一個螢幕掌握整間店",
    basic: true,
    advanced: true,
    multi: true,
  },*/
  {
    description: "商品資訊、庫存管理，菜單即時更新。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "每日交易紀錄、訂單細項一目了然。",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "日、週、業績報表：掌握營業額、來客數、客單價",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "進階分析報表：掌握產品銷售/時段、來客數、客單價等分析數據",
    basic: false,
    advanced: true,
    multi: true,
  },
  {
    description: "產品銷售排行、分析：幫助營運方向規劃",
    basic: true,
    advanced: true,
    multi: true,
  },
  {
    description: "自定義付款方式：LINE Pay、街口支付、一卡通 等，持續增加中",
    basic: true,
    advanced: true,
    multi: true,
  },
];

export function Features({ className, ...props }: { className?: string }) {
  return (
    <section id="features" className="relative min-h-screen mt-15 sm:mt-5">
      <div
        className={clsx(
          "absolute inset-0 bottom-10 bg-bottom bg-no-repeat bg-slate-50 dark:bg-[#0B1120]",
        )}
      >
        <div
          className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5"
          style={{
            maskImage: "linear-gradient(to bottom, transparent, black)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black)",
          }}
        />
      </div>

      <div className="relative px-4 pt-5 mx-auto max-w-7xl sm:px-6 md:px-8">
        <div className="flex gap-2">
          <IconContainer
            className="dark:bg-sky-500 dark:highlight-white/20"
            light={require("@/img/icons/home/editor-tools.png").default.src}
            dark={require("@/img/icons/home/dark/editor-tools.png").default.src}
          />
          <Caption className="text-sky-500">功能表</Caption>
        </div>


        <BigText>預約/排隊系統</BigText>
        <Paragraph>預約候位/預先點餐，客人不用現場等候．降減客服壓力</Paragraph>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>&nbsp;</TableHead>
              <TableHead className="w-[60px]">基礎版</TableHead>
              <TableHead className="w-[60px]">進階版</TableHead>
              <TableHead className="w-[60px]">多店版</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features_rsvp.map((feature, index) => (
              <TableRow
                key={feature.description}
                className={
                  index % 2 === 0
                    ? "bg-slate-50 dark:bg-slate-800"
                    : "bg-white dark:bg-slate-900"
                }
              >
                <TableCell className="">{feature.description}</TableCell>
                <TableCell>
                  {feature.basic ? <CheckIcon /> : <XIcon />}
                </TableCell>
                <TableCell>
                  {feature.advanced ? <CheckIcon /> : <XIcon />}
                </TableCell>
                <TableCell>
                  {feature.multi ? <CheckIcon /> : <XIcon />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <BigText>掃碼點餐</BigText>
        <Paragraph>提升點餐效率、減少服務人力</Paragraph>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>&nbsp;</TableHead>
              <TableHead className="w-[60px]">基礎版</TableHead>
              <TableHead className="w-[60px]">進階版</TableHead>
              <TableHead className="w-[60px]">多店版</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features_qrcode.map((feature, index) => (
              <TableRow
                key={feature.description}
                className={
                  index % 2 === 0
                    ? "bg-slate-50 dark:bg-slate-800"
                    : "bg-white dark:bg-slate-900"
                }
              >
                <TableCell className="">{feature.description}</TableCell>
                <TableCell>
                  {feature.basic ? <CheckIcon /> : <XIcon />}
                </TableCell>
                <TableCell>
                  {feature.advanced ? <CheckIcon /> : <XIcon />}
                </TableCell>
                <TableCell>
                  {feature.multi ? <CheckIcon /> : <XIcon />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <BigText>商店管理</BigText>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>&nbsp;</TableHead>
              <TableHead className="w-[60px]">基礎版</TableHead>
              <TableHead className="w-[60px]">進階版</TableHead>
              <TableHead className="w-[60px]">多店版</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features_pos.map((feature, index) => (
              <TableRow
                key={feature.description}
                className={
                  index % 2 === 0
                    ? "bg-slate-50 dark:bg-slate-800"
                    : "bg-white dark:bg-slate-900"
                }
              >
                <TableCell className="">{feature.description}</TableCell>
                <TableCell>
                  {feature.basic ? <CheckIcon /> : <XIcon />}
                </TableCell>
                <TableCell>
                  {feature.advanced ? <CheckIcon /> : <XIcon />}
                </TableCell>
                <TableCell>
                  {feature.multi ? <CheckIcon /> : <XIcon />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
