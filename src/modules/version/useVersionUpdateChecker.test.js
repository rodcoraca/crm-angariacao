import { act, render } from "@testing-library/react";
import useVersionUpdateChecker, { VERSION_CHECK_INTERVAL_MS } from "./useVersionUpdateChecker";
import { clearPersistentToast, notify } from "../../components/ui/feedbackBus";

jest.mock("../../components/ui/feedbackBus", () => ({
  notify: jest.fn(),
  clearPersistentToast: jest.fn()
}));

function TestComponent() {
  useVersionUpdateChecker();
  return null;
}

function responseFor(version) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ version }) });
}

function setLoadedVersion(version) {
  document.head.innerHTML = version
    ? `<meta name="osflow-version" content="${version}" />`
    : "";
}

describe("useVersionUpdateChecker", () => {
  let fetchMock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    window.localStorage.clear();
    setLoadedVersion(null);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    notify.mockClear();
    clearPersistentToast.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.fetch;
    setLoadedVersion(null);
  });

  test("regista a versão inicial e ignora a mesma versão", async () => {
    fetchMock.mockResolvedValue(responseFor("one"));
    render(<TestComponent />);
    await act(async () => {});
    await act(async () => { jest.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(notify).not.toHaveBeenCalled();
  });

  test("notifica uma única vez quando a versão muda", async () => {
    fetchMock.mockResolvedValueOnce(responseFor("one")).mockResolvedValue(responseFor("two"));
    render(<TestComponent />);
    await act(async () => {});
    await act(async () => { jest.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS); });
    await act(async () => { jest.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS); });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      message: "Está disponível uma nova versão do OSFlow.",
      actionLabel: "Atualizar",
      onAction: expect.any(Function)
    }));
  });

  test("preserva o aviso persistente após recarregar antes de concluir a atualização", async () => {
    setLoadedVersion("one");
    window.localStorage.setItem("osflow:pending-update-version", "two");
    fetchMock.mockResolvedValue(responseFor("two"));

    render(<TestComponent />);
    await act(async () => {});

    expect(notify).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("osflow:pending-update-version")).toBe("two");
    expect(clearPersistentToast).not.toHaveBeenCalled();
  });

  test("confirma a atualização quando a versão carregada coincide com a pendente", async () => {
    setLoadedVersion("two");
    window.localStorage.setItem("osflow:pending-update-version", "two");
    fetchMock.mockResolvedValue(responseFor("two"));

    render(<TestComponent />);
    await act(async () => {});

    expect(window.localStorage.getItem("osflow:pending-update-version")).toBeNull();
    expect(clearPersistentToast).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });

  test("mantém o aviso e atualiza a pendente quando uma versão posterior é publicada", async () => {
    setLoadedVersion("two");
    window.localStorage.setItem("osflow:pending-update-version", "two");
    fetchMock.mockResolvedValue(responseFor("three"));

    render(<TestComponent />);
    await act(async () => {});

    expect(window.localStorage.getItem("osflow:pending-update-version")).toBe("three");
    expect(clearPersistentToast).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test("sem meta, não confirma a pendente e atualiza-a para uma versão posterior", async () => {
    window.localStorage.setItem("osflow:pending-update-version", "two");
    fetchMock.mockResolvedValue(responseFor("three"));

    render(<TestComponent />);
    await act(async () => {});

    expect(window.localStorage.getItem("osflow:pending-update-version")).toBe("three");
    expect(clearPersistentToast).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test("sem meta, não duplica o aviso enquanto a versão publicada não muda", async () => {
    window.localStorage.setItem("osflow:pending-update-version", "two");
    fetchMock.mockResolvedValue(responseFor("two"));

    render(<TestComponent />);
    await act(async () => {});
    await act(async () => { jest.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS); });

    expect(window.localStorage.getItem("osflow:pending-update-version")).toBe("two");
    expect(clearPersistentToast).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test("ignora erros de rede e evita requests concorrentes", async () => {
    let resolveRequest;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<TestComponent />);
    await act(async () => { jest.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveRequest({ ok: false });
    await act(async () => {});
    expect(notify).not.toHaveBeenCalled();
  });

  test("pausa com a aba oculta e retoma quando fica visível", async () => {
    fetchMock.mockResolvedValue(responseFor("one"));
    render(<TestComponent />);
    await act(async () => {});
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    await act(async () => { jest.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS); });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("a ação Atualizar recarrega apenas quando chamada", async () => {
    fetchMock.mockResolvedValueOnce(responseFor("one")).mockResolvedValue(responseFor("two"));
    const reload = jest.fn();
    const originalLocation = window.location;
    delete window.location;
    window.location = { reload };

    render(<TestComponent />);
    await act(async () => {});
    expect(reload).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS); });
    expect(reload).not.toHaveBeenCalled();
    notify.mock.calls[0][0].onAction();
    expect(reload).toHaveBeenCalledTimes(1);

    window.location = originalLocation;
  });
});
