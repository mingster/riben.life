"use client";

import type Decimal from "decimal.js";
import { useEffect, useState } from "react";
/*
const formatter = new Intl.NumberFormat("zh-Hant", {
  style: "currency",
  currency: "TWD",
});
*/
const formatter = new Intl.NumberFormat("en"); // 1,000

interface CurrencyProps {
  value?: string | number | Decimal;
}

const Currency: React.FC<CurrencyProps> = ({ value = 0 }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="font-semibold">${formatter.format(Number(value))}</div>
  );
};

export default Currency;
