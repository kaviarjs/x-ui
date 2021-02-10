import {
  Bundle,
  EventManager,
  KernelAfterInitEvent,
  KernelBeforeInitEvent,
} from "@kaviar/core";
import { setDefaults } from "@kaviar/smart";
import { InMemoryCache } from "@apollo/client/core";

import { IXUIBundleConfig } from "./defs";
import { APOLLO_CLIENT_OPTIONS_TOKEN, XUI_CONFIG_TOKEN } from "./constants";
import { RoutingPreparationEvent } from "./events/RoutingPreparationEvent";
import { XRouter } from "./react/XRouter";
import { ApolloClient } from "./graphql/ApolloClient";
import { GuardianSmart } from "./react/smarts/GuardianSmart";

export class XUIBundle extends Bundle<IXUIBundleConfig> {
  protected defaultConfig = {
    graphql: {},
    guardianClass: GuardianSmart,
    guardianSmartOptions: {},
    enableSubscriptions: true,
  };

  async hook() {
    const eventManager = this.get<EventManager>(EventManager);
    const router = this.get<XRouter>(XRouter);

    // After the kernel has passed through all intialisation of all bundles and all routes have been added
    // It's time to hook into them and have extensions for configuration
    eventManager.addListener(
      KernelAfterInitEvent,
      async (e: KernelBeforeInitEvent) => {
        await eventManager.emit(
          new RoutingPreparationEvent({
            routes: router.store,
          })
        );
      }
    );
  }

  async prepare() {
    if (!this.config.graphql.cache) {
      this.config.graphql.cache = new InMemoryCache({
        dataIdFromObject: (object) => (object?._id as string) || null,
      }).restore((window as any).__APOLLO_STATE__ || {});
    }

    this.container.set(XUI_CONFIG_TOKEN, this.config);
    this.container.set({
      id: APOLLO_CLIENT_OPTIONS_TOKEN,
      value: this.config.graphql,
    });
  }

  async init() {
    const container = this.container;
    setDefaults({
      factory(targetType, config) {
        return container.get(targetType);
      },
    });
  }
}
