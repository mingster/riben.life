import type { StoreOrder } from "@/types";

export const saveOrderToLocal = (order: StoreOrder) => {
  const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]");
  existingOrders.push(order);
  localStorage.setItem("orders", JSON.stringify(existingOrders));
};

export const getOrdersFromLocal = (): StoreOrder[] => {
  return JSON.parse(localStorage.getItem("orders") || "[]");
};

export const getOrdersToday = (): StoreOrder[] => {
  // filter orders by date
  const today = new Date();
  const orders = getOrdersFromLocal() as StoreOrder[];

  return orders.filter((order: StoreOrder) => {
    const orderDate = new Date(order.createdAt);
    return (
      orderDate.getFullYear() === today.getFullYear() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getDate() === today.getDate()
    );
  });
};

export const getOrdersTodayByStore = (storeId: string|null|undefined): StoreOrder[] => {
  if (!storeId) return [];

  // filter orders by date
  const today = new Date();
  const orders = getOrdersFromLocal() as StoreOrder[];

  return orders.filter((order: StoreOrder) => {
    const orderDate = new Date(order.createdAt);
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
    const orderDate = new Date(order.createdAt);
    if (
      orderDate.getFullYear() < today.getFullYear() ||
      orderDate.getMonth() < today.getMonth() ||
      orderDate.getDate() < today.getDate()
    ) {
      const index = orders.indexOf(order);
      orders.splice(index);
    }
  });

  localStorage.setItem("orders", JSON.stringify(orders));
};

export const removeOrders = () => {
  localStorage.removeItem("orders");
};

/*
  const orders = getOrdersFromLocal() as StoreOrder[];
  console.log('orders', JSON.stringify(orders));
*/
