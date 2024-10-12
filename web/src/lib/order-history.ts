import type { StoreOrder } from "@/types";

export const saveOrderToLocal = (order: StoreOrder) => {
  const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
  existingOrders.push(order);
  localStorage.setItem('orders', JSON.stringify(existingOrders));
};

export const getOrdersFromLocal = (): StoreOrder[] => {
  return JSON.parse(localStorage.getItem('orders') || '[]');
};
