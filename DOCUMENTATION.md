This bundle is a set of tools allowing you to do beautiful frontends. Using the X-Framework.

## Install

You can easily create it by running `x`, choose `microservice`, and select `frontend`.

```bash
npm i @kaviar/x-ui @apollo/client
npm i react react-dom react-router-dom
```

## Setup

We begin by defining our kernel, and our initial bundle

```tsx title="kernel.ts"
import { Kernel } from "@kaviar/core";
import { XUIBundle } from "@kaviar/x-ui";
import { UIAppBundle } from "{...}/UIAppBundle";

// All UI bundles need to be prefixed with UI
// All X-way bundles have the first prefix X
export const kernel = new Kernel({
  bundles: [
    new XUIBundle({
      graphql: {
        // ApolloClient Options
        // https://www.apollographql.com/docs/react/api/core/ApolloClient/#ApolloClientOptions
        uri: process.env.REACT_APP_GRAPHQL_URI,
      },
    }),
    new UIAppBundle(),
  ],
});
```

Now create a sample `UIAppBundle`, and we ask it to load the routes.

```ts
import { Bundle } from "@kaviar/core";

export class UIAppBundle extends Bundle {}
```

And now we can finally render.

```tsx
import { kernel } from "./kernel";
import { XUIProvider } from "@kaviar/x-ui";
import React from "react";
import ReactDOM from "react-dom";

ReactDOM.render(
  <XUIProvider kernel={kernel} />,
  document.getElementById("root")
);
```

## Routing

We add routes through the `XRouter`. Routes are added programatically. Behind the scenes we use `react-router-dom` .

```tsx
import { Bundle } from "@kaviar/core";

export class UIAppBundle extends Bundle {
  async init() {
    const router = this.get<XRouter>(XRouter);

    router.add({
      HOME: {
        path: "/",
        component: () => <h1>Hello world!</h1>,
        // All other properties from react-router-dom can be added here
      },
    });
  }
}
```

Our strong recommendation is to never rely on strings for routes, this is why we'll add them in a route map and use it like this:

```ts title="routes.ts"
export const HOME = {
  path: "/",
  component: () => <h1>Hello world!</h1>,
};

export const USER_VIEW = {
  path: "/users/:_id",
  // Route parameters are injected in the component's props
  component: ({ _id }) => <h1>Hello user {_id}!</h1>,
};

export const SEARCH = {
  path: "/search",
  // Query variables (/search?q=something), are all injected inside `queryVariables` property
  component: ({ queryVariables }) => (
    <h1>You are searching {queryVariables.q}</h1>
  ),
};
```

And now simply add them in your bundle like this:

```ts
import * as Routes from "./routes";

// The function from the Bundle
async function init() {
  const router = this.get<XRouter>(XRouter);

  router.add(Routes);
}
```

Using the link and generating it:

```tsx
import { useRouter } from "@kaviar/x-ui";
import * as Routes from "{path}/routes.ts";
import { Link } from "react-router-dom";

function Component() {
  // router.path gets you the path
  // router.go also pushes it to history

  const router = useRouter();
  return (
    <div>
      <Link to={router.path(HOME)}>Home Link</Link>
      <button onClick={() => router.go(HOME)}>Take me home</button>
      <Link to={router.path(USER_VIEW, { params: { _id: "123" } })}>
        Parameter Login
      </Link>
      <Link to={router.path(SEARCH, { query: { q: "value" } })}>Home Link</Link>
    </div>
  );
}
```

## Dependency Injection

We have succcesfully blended D.I. with React. The concept is easy, you control your container inside the `prepare()` or `init()` phase of a bundle, you use it inside React. The right container is properly passed because everything is wrapped in `<XUIProvider />`.

```ts
import { useContainer, useRouter, use } from "@kaviar/x-ui";

class A {}

function Component() {
  const container = useContainer();
  // You fetch the singleton instance of A
  const a = use(A);
  // Just like we used router above
  const router = useRouter();
}
```

## GraphQL

We use `@apollo/client` so in theory, all you have to do is just use it. You can [follow the official guideline here](https://www.apollographql.com/docs/react/api/react/hooks/), they will work outside the box without changing anything.

```tsx
import { ApolloClient } from "@kaviar/x-ui";

function Component() {
  // Note, that we implement our own ApolloClient which extends the base one, so we can properly create the links and everything
  const apolloClient = use(ApolloClient);
}
```

## Collections

Collections are an interface to your remote database via `GraphQL` as long as the remote queries and mutations respect a specific interface. That interface you get it in a snap when you create a `GraphQL CRUD` from the cli command `x`.

```ts
import { Collection } from "@kaviar/x-ui";
import { Post } from "./Post.model";

export class Post {
  _id: any;
  title: string;
  isApproved: boolean;
}

export class PostsCollection extends Collection<Post> {
  getName() {
    // This is the endpoint name of the crud
    // Queries: postsFind, postsFindOne, postsCount
    // Mutations: postsInsertOne, postsUpdateOne, postsDeleteOne
    return "posts";
  }
}
```

### Queries

Below, we'll have a simple example how to use the posts collection to find data.

```tsx
function Component() {
  const postsCollection = use(PostsCollection);

  const [posts, setPosts] = useState([]);

  useEffect(() => {
    postsCollection
      .find(
        {},
        {
          // We specify which fields to use
          _id: 1,
          title: 1,
        }
      )
      .then((posts) => setPosts(posts));
  });

  // Render them somehow
}
```

Queries support both MongoDB filters and options:

```ts
postsCollection.find(
  {
    filters: {
      isApproved: true,
    },
    options: {
      sort: {
        createdAt: -1,
      },
    },
  },
  {
    _id: 1,
    title: 1,
  }
);
// The request can span-out on many lines, sometimes it's good to define them outside a component
```

We also support relational data, if relations are defined with `Nova` in the backend:

```ts
postsCollection.find(
  {},
  {
    _id: 1,
    title: 1,
    author: {
      name: 1,
    },
  }
);
```

We also support filtering the subset of relations:

```ts
// This sideBody will get merged on the backend, and is sent via options field.
const sideBody = {
  comments: {
    // This will only fetch the last 5 comments
    $: {
      options: {
        sort: { createdAt: -1 },
        limit: 5,
      },
    },
  },
};

postsCollection.find(
  {
    sideBody,
  },
  {
    _id: 1,
    title: 1,
    comments: {
      name: 1,
    },
  }
);
```

Relational sorting means that you're sorting your current set, by a relation's field. For example you're listing all employees, and you want them sorted by company's name:

```ts
employeesCollection.find(
  {
    options: {
      sort: {
        "company.name": 1,
      },
    },
  },
  {
    name: 1,
    company: {
      name: 1,
    },
  }
);
```

You can also find a single document with filters or by \_id:

```ts
let post;
post = postsCollection.findOne({ _id: postId }, { title: 1 });
// Equivallence
post = postsCollection.findOneById(postId, { title: 1 });
```

Counting documents is also easy:

```ts
postsCollection.count(filters).then((count) => {});
```

### Mutations

We have made the decision to not allow multi document updates or insertions due to security concerns. This is why we can only insert a single document, update document by \_id, and remove it also by \_id:

```ts
postsCollection
  .insertOne({
    title: 1,
    userId: "USER_ID",
  })
  .then(({ _id }) => {
    // Do something with the newly created _id
  });

postsCollection
  .updateOne(postId, {
    $set: {
      title: "New Title",
    },
  })
  .then(() => {
    // Do something after updating it
  });

postsCollection.deleteOne(postId).then(() => {
  // Do something after deleting it
});
```

### Extensions

Why not put all related logic for fetching data for that collection inside it?

```ts
class PostsCollection extends Collection<Post> {
  findAllApprovedPosts() {
    // You have access to apolloClient inside it
    // this.apolloClient.query()
  }
}
```

## Integration with Smart

Smart is a very small library that does state management by using `useState()` from React and `useContext()` allowing you to easily split logic out of your components.

The difference here is that `Smart` from this package, allows you to work with the D.I. container:

```ts
import { Smart, useSmart, newSmart } from "@kaviar/x-ui";

class MySmart extends Smart<any, any> {
  @Inject()
  eventManager: EventManager;
}

function Component() {
  const [mySmart, Provider] = newSmart(MySmart);

  // mySmart has been instantiated by the container, seemlessly
}
```

## Lists

We have created a `Smart` that allows you to easily work with lists:

```ts title="PostListSmart.ts"
import { ListSmart } from "@kaviar/x-ui";
import React from "react";
import { Post, PostsCollection } from "../../collections";

const PostsListContext = React.createContext(null);
export class PostsListSmart extends ListSmart<Post> {
  collectionClass = PostsCollection;

  body = {
    // You have all the benefits of the Nova body we've seen in Collections
    // If you have a custom prop-based body you can pass it via config when doing `newSmart()`
    _id: 1,
    title: 1,
    user: {
      name: 1,
    },
  };

  static getContext() {
    return PostsListContext;
  }
}
```

Now we can use it in our components:

```ts
function Component() {
  const [api, Provider] = newSmart(PostsList, {
    perPage: 5, // optional pagination
    filters: {}, // initial filters that can't be overriden
    sort: {
      createdAt: -1,
    },
  });
}
```

Now you can access `api.state` from within `Component` or via `api = useSmart(PostsList)` in deeply nested children:

```ts
// This is how the state looks like:
export type ListState<T = any> = {
  isLoading: boolean;
  isError: boolean;
  isCountLoading: boolean;
  isCountError: boolean;
  documents: T[];
  filters: MongoFilterQuery<T>;
  options: IQueryOptions<T>;
  currentPage: number;
  perPage: null | number;
  totalCount: number;
  errorMessage: string;
  countErrorMessage: string;
};
```

So you have acces to nice things now you will most likely play with:

```ts
api.setFilters({
  title: new RegExp("{value from a search field}", "i"),
});

api.updateSort({
  title: 1, // After let's say he clicks a table
});
```

## Guardian

:::caution
To be documented
:::

You now have the complete toolbelt to have smart authentication, works without any effort with X-Framework Server.

See how it has been implemented [in the boilerplate](https://github.com/kaviarjs/x-boilerplate/tree/main/microservices/ui/src/bundles/UIAppBundle/pages/Authentication)

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

It's easy as:

```ts
import { useCollectionSubscription } from "@kaviar/x-ui";

const MyLivePage = () => {
  const [posts, isReady] = useCollectionSubscription(PostsCollection, {
    // The full specced body
    $: {
      filters: {},
      options: {}
    }
    title: 1,
  });

  // Render the posts if isReady
  //
};
```

You can also hook into the events, via the 3rd argument, options:

```ts
useCollectionSubscription(collectionClass, body, {
  onReady() {
    // Do something when all data has been initially loaded
  },
  onChanged(document, changeSet, previousDocument) {
    // Do something when something about the subscription changes
  },
  onRemoved(document) {
    // Do something when document is removed
  },
  onAdded(document) {
    // Do something when document is added
  },
});
```
