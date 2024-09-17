"use client";

import { useStoreModal } from "@/hooks/storeAdmin/use-store-modal";
import { useEffect } from "react";
import { StoreModal } from "./store-modal";

//if the signed user doesn't have a store,
//store dialog will be opened for the user to enter store setup wizard..
const SetupStorePage = () => {
  const onOpen = useStoreModal((state) => state.onOpen);
  const isOpen = useStoreModal((state) => state.isOpen);

  //console.log('onOpen: ' + onOpen);
  //console.log('isOpen: ' + isOpen);

  // open create store modal
  useEffect(() => {
    if (!isOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  return <StoreModal />;
};

export default SetupStorePage;
