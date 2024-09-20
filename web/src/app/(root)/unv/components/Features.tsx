import React from "react";
import { BigText, Caption, IconContainer, Paragraph } from "./common";
import Link from "next/link";
import clsx from "clsx";
import { motion } from "framer-motion";
export function Features({ className, ...props }: { className?: string }) {
  return (
    <section id="features" className="relative h-screen">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
        <div className="flex gap-2">
          <IconContainer
            className="dark:bg-sky-500 dark:highlight-white/20"
            light={require("@/img/icons/home/editor-tools.png").default.src}
            dark={require("@/img/icons/home/dark/editor-tools.png").default.src}
          />
          <Caption className="text-sky-500">功能表</Caption>
        </div>

        <BigText>掃碼點餐</BigText>
        <Paragraph>
          排隊候位預先點餐，縮短店內用餐時間 為你帶來加倍翻桌率！
        </Paragraph>
        <motion.ul exit={{ opacity: 0 }} className={clsx("pt-6 space-y-4")}>
          <li>不須另外下載APP，客人手機點餐，節省外場人力</li>
          <li>掃描QR CODE就可點餐，突破場域限制</li>
          <li>客人即時瀏覽菜單，自助下單</li>
          <li>一鍵下單送廚房，減少人力負擔</li>
          <li>提升點餐效率， 帶來加倍翻桌率</li>
          <li>不論是初次點餐或後續加點，消費者輕鬆掌握點餐節奏</li>
          <li>綁定桌號，資訊明確，出餐無負擔</li>
        </motion.ul>

        <BigText>預約/排隊</BigText>
        <Paragraph>線上、線下訂位整合</Paragraph>
        <pre>
          <code>
            LINE OA訂位：消費者掃描QRcode，一鍵導流至Line頁面，進行訂位
            網路訂位：把握辦公室客群，透過網址連結，直接進入線上訂位頁面
            電話訂位：消費者來電訂位，店家端即時於平板紀錄訂位資訊
            檢視未帶位、已入座、過號的客人資訊，帶位狀況一目了然
            標籤顏色區分客人排隊狀態，過號、排程帶位、等待，一目瞭然
            預先了解來客人數、資訊，桌位管理運用更得當
            客人透過掃描QRcode取得排隊號碼，時時掌握店家排隊狀態，不錯過期待已久的美食饗宴
            彈性制定訂候位規則， 即時掌握客人訂位偏好
            掌握客人資訊，現場候位狀態如有異動，可以即時與消費者協調處理
            店家能夠詳細根據週間、週末等不同消費情境，制定訂候位規則
            完整保存客人的訂位偏好及習慣
          </code>
        </pre>

        <BigText>線上點餐</BigText>
        <pre>
          <code>
            LINE即時推播，維持良好客戶關係
            訂單進度自動傳到消費者手機，雙方清楚掌握訂單狀況
            店務繁忙時可用退回功能進行「延單」或「狀況說明」，不怕客人白跑一趟
          </code>
        </pre>

        <BigText>POS</BigText>
        <pre>
          <code>
            桌位管理，一個螢幕掌握整間店
            以顏色標明空桌、未點餐、已點餐與結帳狀態，一眼掌握整間店狀態
            直覺式設計，拖曳即可排桌位，輕鬆規劃不同樓層與空間
            併桌管理、結帳拆單，清楚處理客人需求 總部系統管理分店 
            讓餐廳品牌成長茁壯 即時掌握各店營業狀況
            不需來回切換帳號，即可同步處理多店設定
            支援商品資訊管理、優惠活動設置、會員資料整合、員工出勤紀錄，皆可一鍵配發及查詢
            分析報表完整又好懂 幫助營運方向規劃 雲端即時儲存最安全，不怕資料流失
            業績概況-掌握營業額、來客數、客單價
            商品、標籤分析-觀看熱門商品排行、完整銷售明細
            折扣分析-釐清折扣比例、優惠活動成效
            交易紀錄-查詢訂單細項、發票字軌紀錄
            每日營運報表可下載成紙本文檔，整理資訊更方便 支援多種結帳方式
            滿足消費者需求 現金、信用卡是基本！ LINE
            Pay、街口支付、一卡通、台新one碼都支援
            自定義付款方式，五倍券、折價券、禮券，通通可以用
            單筆訂單，可結合多種付款方式，滿足客人消費習慣
          </code>
        </pre>
      </div>
    </section>
  );
}
