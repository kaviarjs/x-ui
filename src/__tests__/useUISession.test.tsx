import { act, renderHook, RenderResult } from "@testing-library/react-hooks";
import * as React from "react";
import { ContainerContext } from "..";
import { useUISession } from "../react/hooks";
import {
  IUISessionHandler,
  IUISessionStore,
  UISession,
} from "../react/services/UISession.service";
import { getLocalStorageState } from "../react/services/utils/UISession.utils";
import { container, sessionDefaults } from "./ecosystem";

const containerContextProvider = ({ children }) => {
  return (
    <ContainerContext.Provider value={container}>
      {children}
    </ContainerContext.Provider>
  );
};

const getSessionHook = () => {
  const { result } = renderHook(useUISession, {
    wrapper: containerContextProvider,
  });

  return result;
};

const getFieldHook = <T extends keyof IUISessionStore>(
  sessionHook: RenderResult<UISession>,
  fieldName: T
) => {
  const { result } = renderHook(() => sessionHook.current.get(fieldName));

  return result;
};

describe("useUISession", () => {
  test("sessionDefaults", () => {
    const sessionHook = getSessionHook();

    const { localStorageKey: _, ...defaultState } = sessionDefaults;

    expect(sessionHook.current.state).toStrictEqual(defaultState);
  });

  test("set and get", async () => {
    const sessionHook = getSessionHook();

    const lastAuthenticationDate = new Date();

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationDate",
          lastAuthenticationDate
        )
    );

    const fieldHook = getFieldHook(sessionHook, "lastAuthenticationDate");

    expect(fieldHook.current).toStrictEqual(lastAuthenticationDate);
  });

  test("onSet and onSetRemove", async () => {
    const sessionHook = getSessionHook();

    const lastAuthenticationDate = new Date();

    let handlerIsCalled = false;

    const handler: IUISessionHandler = async () => {
      handlerIsCalled = !handlerIsCalled;
    };

    act(() => sessionHook.current.onSet("lastAuthenticationDate", handler));

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationDate",
          lastAuthenticationDate
        )
    );

    expect(handlerIsCalled).toStrictEqual(true);

    act(() => sessionHook.current.onSetRemove(handler));

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationDate",
          lastAuthenticationDate
        )
    );

    expect(handlerIsCalled).toStrictEqual(true);
  });

  test("persistance - simple set", async () => {
    const sessionHook = getSessionHook();

    const lastAuthenticationDate = new Date();

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationDate",
          lastAuthenticationDate,
          { persist: true }
        )
    );

    const localStorageState = getLocalStorageState(
      sessionDefaults.localStorageKey
    );

    expect(localStorageState.lastAuthenticationDate).toEqual(
      lastAuthenticationDate
    );
  });

  test("persistance - set with handler", async () => {
    const sessionHook = getSessionHook();

    let handlerIsCalled = false;

    const handler: IUISessionHandler = async () => {
      handlerIsCalled = !handlerIsCalled;
    };

    const newAuthenticationDate = new Date();

    act(() => sessionHook.current.onSet("lastAuthenticationDate", handler));

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationDate",
          newAuthenticationDate,
          {
            persist: true,
          }
        )
    );

    const localStorageState = getLocalStorageState(
      sessionDefaults.localStorageKey
    );

    expect(handlerIsCalled).toStrictEqual(true);
    expect(localStorageState.lastAuthenticationDate).toStrictEqual(
      newAuthenticationDate
    );
  });

  test("uses existing values from localStorage, and defaults for rest", () => {
    const sessionHook = getSessionHook();

    const localStorageState = getLocalStorageState(
      sessionDefaults.localStorageKey
    );

    const localStorageStateKeys = Object.keys(localStorageState);

    const { localStorageKey: _, ...defaultState } = sessionDefaults;

    for (const key of Object.keys(defaultState)) {
      const value = sessionHook.current.state[key];
      if (localStorageStateKeys.includes(key)) {
        expect(value).toStrictEqual(localStorageState[key]);
      } else {
        expect(value).toStrictEqual(sessionDefaults[key]);
      }
    }
  });

  test("value and previousValue", async () => {
    const sessionHook = getSessionHook();

    const previousValue = new Date("04-01-2000 00:00:00");
    const newValue = new Date("05-01-2000 00:00:00");

    await act(
      async () =>
        await sessionHook.current.set("lastAuthenticationDate", previousValue)
    );

    const handler: IUISessionHandler = async (e) => {
      expect(e.data.previousValue).toBe(previousValue);
      expect(e.data.value).toBe(newValue);
    };

    act(() => sessionHook.current.onSet("lastAuthenticationDate", handler));

    await act(
      async () =>
        await sessionHook.current.set("lastAuthenticationDate", newValue)
    );
  });
});
