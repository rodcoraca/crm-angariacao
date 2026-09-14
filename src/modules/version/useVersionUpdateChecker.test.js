import { act, render } from "@testing-library/react";
import useVersionUpdateChecker, { VERSION_CHECK_INTERVAL_MS } from "./useVersionUpdateChecker";
import { notify } from "../../components/ui/feedbackBus";

jest.mock("../../components/ui/feedbackBus", () => ({
  notify: jest.fn()
}));

function TestComponent() {
  useVersionUpdateChecker();
  return null;
}

function responseFor(version) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ version }) });
}

describe("useVersionUpdateChecker", () => {
  let fetchMock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    notify.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.fetch;
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