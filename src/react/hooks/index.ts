import {
  ContainerInstance,
  EventManager,
  IEventConstructor,
} from "@kaviar/core";
import { useContext, useEffect } from "react";

import { ContainerContext } from "../XUIProvider";
import { XRouter } from "../XRouter";
import { use } from "./use";
import { useSubscription, useCollectionSubscription } from "./useSubscription";
import { GuardianSmart } from "../smarts/GuardianSmart";
import { useSmart } from "../smart";

export { use, useSubscription, useCollectionSubscription };

export const useContainer = (): ContainerInstance => {
  return useContext(ContainerContext);
};

export const useRouter = (): XRouter => {
  return use<XRouter>(XRouter);
};

export const useEventManager = (): EventManager => {
  return use<EventManager>(EventManager);
};

export const useListener = (
  eventClass: IEventConstructor<any>,
  listener: (e: any) => any
) => {
  const manager = useEventManager();
  useEffect(() => {
    manager.addListener(eventClass, listener);

    return () => {
      manager.removeListener(eventClass, listener);
    };
  }, []);
};

export const useGuardian = (): GuardianSmart => {
  return useSmart(GuardianSmart);
};
