import { useState, useEffect } from "react";
import { XSubscription } from "../../graphql/XSubscription";
import Observable from "zen-observable";
import { Constructor } from "@kaviar/core";
import { Collection } from "../../graphql/Collection";
import { use } from "./use";
import { ISubscriptionOptions } from "../..//graphql/Collection";
import { QueryBodyType } from "../../graphql/defs";

/**
 * Starts the subscription and inteligently re-uses it
 * @param observable
 */
export function useSubscription<T>(
  observableCreator: () => Observable<any>
): [T[], boolean] {
  const [isReady, setIsReady] = useState(false);
  const [dataSet, setDataSet] = useState<any[]>([]);

  useEffect(() => {
    const observable = observableCreator();
    const subscription = new XSubscription(observable, setDataSet, {
      onReady: () => setIsReady(true),
    });
    return () => {
      subscription.stop();
    };
  }, []);

  return [dataSet, isReady];
}

/**
 * @deprecated
 */
export function useCollectionSubscription<T>(
  collectionClass: Constructor<Collection<T>>,
  body: QueryBodyType<T>,
  options: ISubscriptionOptions = {}
): [T[], boolean] {
  const collection = use(collectionClass);
  const [isReady, setIsReady] = useState(false);
  const [dataSet, setDataSet] = useState<any[]>([]);

  useEffect(() => {
    const observable = collection.subscribe(body, options);
    const subscription = new XSubscription(observable, setDataSet, {
      onReady: () => setIsReady(true),
    });
    return () => {
      subscription.stop();
    };
  }, []);

  return [dataSet, isReady];
}

/**
 * @deprecated
 */
export function useCollectionSubscriptionOne<T>(
  collectionClass: Constructor<Collection<T>>,
  body: QueryBodyType<T>,
  options: ISubscriptionOptions = {}
): [T, boolean] {
  const [dataSet, isReady] = useCollectionSubscription(
    collectionClass,
    body,
    options
  );

  return [dataSet && dataSet.length ? dataSet[0] : null, isReady];
}
