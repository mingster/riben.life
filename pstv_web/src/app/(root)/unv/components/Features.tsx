import React from "react";
import { BigText, Caption, IconContainer, Paragraph,Link } from "./common";
import clsx from "clsx";
import { motion } from "framer-motion";
export function Features({ className, ...props }: { className?: string }) {
  return (
    <section id="features" className="relative h-screen">


      <BigText>排隊候位預先點餐，縮短店內用餐時間 為你帶來加倍翻桌率！
      </BigText>
      <motion.ul
        exit={{ opacity: 0 }}
        className={clsx('pt-6 space-y-4')}
      >
        <li>不須另外下載APP，客人手機點餐，節省外場人力</li>
        <li>掃描QR CODE就可點餐，突破場域限制</li>
        <li>客人即時瀏覽菜單，自助下單</li>
        <li>一鍵下單送廚房，減少人力負擔</li>
        <li>提升點餐效率， 帶來加倍翻桌率</li>
<li>不論是初次點餐或後續加點，消費者輕鬆掌握點餐節奏</li>
<li>綁定桌號，資訊明確，出餐無負擔</li>
</motion.ul>

    </section>
  );
}
