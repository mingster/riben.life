"use client";

import type { StoreOrder } from "@/types";
import { useEffect } from "react";

export const KEY_LOCALORDERS = "orders";

export const saveOrderToLocal = (order: StoreOrder) => {
	if (typeof window !== "undefined") {
		const existingOrders = JSON.parse(
			window.localStorage.getItem(KEY_LOCALORDERS) || "[]",
		);
		existingOrders.push(order.id);
		localStorage.setItem(KEY_LOCALORDERS, JSON.stringify(existingOrders));
	}
};

export const getOrdersFromLocal = () => {
	if (typeof window !== "undefined") {
		return JSON.parse(window.localStorage.getItem(KEY_LOCALORDERS) || "[]");
	}
};

export const removeOrdersFromLocal = () => {
	if (typeof window !== "undefined") {
		window.localStorage.removeItem(KEY_LOCALORDERS);
	}
};

/*
export const getOrdersToday = (): StoreOrder[] => {
  // filter orders by date
  const today = new Date();
  const orders = getOrdersFromLocal() as StoreOrder[];

  return orders.filter((order: StoreOrder) => {
    const orderDate = new Date(order.updatedAt);
    return (
      orderDate.getFullYear() === today.getFullYear() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getDate() === today.getDate()
    );
  });
};

export const getOrdersTodayByStore = (
  storeId: string | null | undefined,
): StoreOrder[] => {
  if (!storeId) return [];

  // filter orders by date
  const today = new Date();
  const orders = getOrdersFromLocal() as StoreOrder[];
  //console.log("orders_local", JSON.stringify(orders));

  return orders.filter((order: StoreOrder) => {
    const orderDate = new Date(order.updatedAt);
    return (
      orderDate.getFullYear() === today.getFullYear() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getDate() === today.getDate() &&
      order.storeId === storeId
    );
  });
};
export const removePreviousOrders = () => {
  const orders = getOrdersFromLocal() as StoreOrder[];
  const today = new Date();

  orders.map((order: StoreOrder) => {
    const orderDate = new Date(order.updatedAt);
    if (
      orderDate.getFullYear() < today.getFullYear() ||
      orderDate.getMonth() < today.getMonth() ||
      orderDate.getDate() < today.getDate()
    ) {
      const index = orders.indexOf(order);
      orders.splice(index);
    }
  });

  localStorage.setItem(KEY, JSON.stringify(orders));
};
*/
