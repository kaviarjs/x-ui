This bundle is a set of tools to allow you to quickly bootstrap your frontend. Using the X-way.

## Install

You can easily create it by running `x`, choose `microservice`, and select `frontend`.

```bash
npm i @kaviar/x-ui @apollo/client
npm i react react-dom react-router-dom
```

## Setup

First we initialise our kernel with our bundle:

```ts title="src/startup/kernel.ts"
import { XUIBundle } from "@kaviar/x-ui";
import { Kernel } from "@kaviar/core";

// All UI bundles need to be prefixed with UI
// All X-way bundles have the first prefix X
export const kernel = new Kernel({
  bundles: [
    new XUIBundle({
      graphql: {
        // ApolloClient Options
        // https://www.apollographql.com/docs/react/api/core/ApolloClient/#ApolloClientOptions
        uri: "http://localhost:4000/graphql",
      },
    }),
  ],
});
```

Then we use the provider to generate the root rendering.

```tsx title="src/startup/App.tsx"
import * as React from "react";
import { XUIProvider } from "@kaviar/x-ui";
import { kernel } from "./kernel";

export const App = () => <XUIProvider kernel={kernel} />;
```

## Routing

Now let's create routes. It's important to understand that everything we do for routing is done via services and through the container.

```tsx title="src/bundles/ui-app/UIAppBundle.ts"
import { XRouter } from "@kaviar/x-ui";
import { routes } from "./routes";
import "./pages"; // Described later what for
import { Bundle } from "@kaviar/core";

export class UIAppBundle extends Bundle {
  async init() {
    // All routes are added via service
    const router = this.get<XRouter>(XRouter);

    router.add(routes);
  }
}
```

```tsx title="src/bundles/app/routes.ts"
import { IRoute } from "@kaviar/x-ui-bundle";

export const HOME_PAGE: IRoute = {
  path: "/",
  component: Home,
};
```

Notice that you need to add `new UIAppBundle()` to your kernel.

```tsx title="src/bundles/app/pages/Home.tsx"
import * as React from "react";
import { routes } from "../routes";

// Example if you want to keep routes near pages rather than centralised
routes.push({
  path: "/",
  component: Home,
});

export const Home = () => {
  return <h1>Hello world!</h1>;
};
```

Now don't forget to import it. Everything that adds to routing should be imported. If a route does not work, double check that you have imported it.

```tsx title="src/bundles/app/pages/index.ts"
import "./Home";
```

If you prefer keeping your routes separated from components, feel free to do so. Especially if you have bundles pages, such as a CRUD, it can be a good idea to have something like `pages/UsersCRUD/routes.ts` that gets imported from `pages/UsersCRUD/index.ts`, which gets imported from `pages/index.ts`.

Routes can also have a name instead of a path, this can be helpful when generating routes:

```tsx
import { useRoute } from "@kaviar/x-ui";

const Component = () => {
  // This gets you access to our custom Router which can inteligently create routes by name and others
  const router = useRouter();
  const path = router.path(HOME_PAGE, {
    projectId: "XXX",
  });

  router.go(path);
};
```

## GraphQL

Since we are using `@apollo/client` we can use it directly in here. You can look at the official documentation for more info:

- https://www.apollographql.com/docs/react/data/queries/
- https://www.apollographql.com/docs/react/data/mutations/

However we'll cover here how we can work with our client-side collections to achieve more seamless operations:

```tsx title="Defining client-side collections"
import { Collection } from "@kaviar/x-ui";

interface IProject {
  name: string;
}

class Projects extends Collection<IProject> {
  // This should be the same as the name you've given the CRUD on the backend
  name = "projects";

  // You have ability here to enter additional methods
  getProjectMemberCount(projectId: any) {
    return this.apolloClient.query({
      query: gql`...`,
    });
  }
}
```

No one would stop you to use directly `useQuery`, however this is a more javascript-oriented approach to things, which we believe accelerates development

// TODO: allow mutation names customisations

```tsx title="Usage"
import { Projects } from "your-path/Projects.collection";

const ProjectList = () => {
  const projects = use(Projects);
  const [results, setResults] = useState([]);

  useEffect(() => {
    // Find returns a promise
    projects
      .find(
        {},
        {
          _id: 1,
          name: 1,
        }
      )
      .then(setResults);
  }, []);

  projects.update(
    { _id },
    {
      $set: {
        status: StatusEnum.READY,
      },
    }
  );

  return (
    <ul>
      {results.map((project) => (
        <li>{project.name}</li>
      ))}
    </ul>
  );
};
```

You also have access to the following commands:

```ts
projects.find(
  {
    filters: {
      // Some filter example, these filters are from MongoDB
      type: "active",
    },
    options: {
      // Sorting
      sort: { createdAt: 1 },
      // Pagination
      limit: 10,
      skip: 0,
    },
  },
  {
    // We call this argument the "body" of the request
    // Here you enter what you want to fetch, just a sample
    // We are using json-to-graphql-query package behind the scenes
    _id: 1,
    name: 1,
    owner: {
      firstName: 1,
    },
  }
);

// Returns promise of just one element
projects.findOne({ filters, options }, body);
projects.findOneById(_id, body);

projects
  .insertOne({
    name: "Project 1",
  })
  .then(({ _id }) => {
    // Do something with it
  });
projects
  .updateOne(_id, {
    // MongoDB Update Operations
    $set: {
      name: "Project 1 - Updated",
    },
  })
  .then(({ _id }) => {
    // Here
  });

projects.deleteOne(_id).then(() => {
  // ...
});
```

## Events

You can use the classic `EventManager` to emit events, but if you want to have a component listen to events during its lifespan (until it gets unmounted), you can use the hook: `useListener`.

```tsx title="Emitting Events"
import { useListener, useEventManager } from "@kaviar/x-ui";
const eventManager = useEventManager();
eventManager.emit(new XEvent());

// The built-in hook lets you listen to events while the component is mounted
useListener(XEvent, (e: XEvent) => {
  // lives as long as the component lives
});
```

## Live Data

```ts
import { useCollectionSubscription } from "@kaviar/x-ui";

const MyPage = () => {
  const [posts, isReady] = useCollectionSubscription(PostsCollection, {
    // The nova body
    title: 1,
  });

  // Show the posts if isReady
};
```

## The State Management

There is a simple way to work. We define our state via a class, and we define our api that manipulates the state. We are using `@kaviar/smart` package:

Please read the documentation from [Smart Official Documentation](https://github.com/kaviarjs/smart). It's super easy to understand.

However, this time you will use smart but import it from this package, because we hook it into our dependency injection containers:

```tsx
import { Service, Inject } from "@kaviar/core";
import { Smart, ApolloClient } from "@kaviar/x-ui";

// Smart is now a transient service, each time we invoke .get() from container, we get a new instance
class MyLoader extends Smart {
  constructor(protected readonly apolloClient: ApolloClient) {}

  loadUsers() {
    this.apolloClient
      .query({
        /* ... */
      })
      .then((response) => {
        // Example of setting state
        this.setState({
          users: response.users,
        });
      });
  }
}

const Component = () => {
  const myLoader = useSmart(MyLoader);

  // myLoader.state.users
  // myLoader.loadUsers()
};

const ComponentWrapper = smart(MyLoader, {
  // optional config
})(Compnent);
```
