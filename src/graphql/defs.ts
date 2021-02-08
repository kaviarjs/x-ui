import { FilterQuery } from "mongodb";

export enum SubscriptionEvents {
  ADDED = "added",
  CHANGED = "changed",
  REMOVED = "removed",
  READY = "ready",
}
export interface ISubscriptionEventMessage {
  event: SubscriptionEvents;
  document: string;
}
export interface IEventsMap {
  onReady?: () => void;
  onChanged?: (document: any, changeSet: any, previousDocument: any) => void;
  onRemoved?: (document: any) => void;
  onAdded?: (document: any) => void;
}
export interface IQueryOptions<T = any> {
  limit?: number;
  skip?: number;
  sort?:
    | Array<[string, number]>
    | {
        [key in keyof T]?: number | boolean;
      }
    | { [key: string]: number | boolean };
}

export interface ICollectionQueryConfig<T = any> {
  filters?: T extends null ? any : FilterQuery<T>;
  options?: IQueryOptions<T>;
  pipeline?: any[];
}

export { FilterQuery as MongoFilterQuery };

/**
 * @deprecated The naming was meaningless. Please use ICollectionQueryConfig
 */
export interface IParameterableObject extends ICollectionQueryConfig {}

// The separation between body and sub body is the fact body doesn't have functionable $()
type BodyCustomise<T = null> = {
  $?: ICollectionQueryConfig<T>;
};

type SubBodyCustomise<T = null> = {
  $?: ICollectionQueryConfig<T>;
  $alias?: string;
};

type SimpleFieldValue =
  | 1
  | number
  | boolean
  // This is the part where a reducer is involved and we pass params to it
  | {
      $: {
        [key: string]: any;
      };
    }
  // This is a type of projection operator
  | {
      $filter: any;
    };
// Nested field specification
// | {
//     [key: string]: SimpleFieldValue;
//   };

type Unpacked<T> = T extends (infer U)[] ? U : T;

export type AnyBody = {
  [key: string]: SimpleFieldValue | ICollectionQueryConfig | AnyBody;
};

type RootSpecificBody<T> = {
  [K in keyof T]?:
    | T[K]
    | SimpleFieldValue
    // We do this because the type might be an array
    | QuerySubBodyType<T[K] extends Array<any> ? Unpacked<T[K]> : T[K]>;
};

export type QueryBodyType<T = null> = BodyCustomise<T> &
  (T extends null ? AnyBody : RootSpecificBody<T>);

export type QuerySubBodyType<T = null> = SubBodyCustomise<T> &
  (T extends null ? AnyBody : RootSpecificBody<T>);
