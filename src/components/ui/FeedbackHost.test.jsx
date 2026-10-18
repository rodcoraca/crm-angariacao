import { act, fireEvent, render, screen } from "@testing-library/react";
import FeedbackHost from "./FeedbackHost";
import { clearPersistentToast, getPersistentToasts, notify } from "./feedbackBus";

jest.mock("../../theme/ThemeContext", () => ({
  useTheme: () => ({
    spacing: { md: 8, xs: 4, sm: 4 },
    borderRadius: { sm: 4 },
    colors: { muted: "#666", text: "#111" },
    typography: { body: { fontSize: 14, lineHeight: 1.4 } }
  })
}));

jest.mock("./Button", () => ({ children, onClick }) => <button onClick={onClick}>{children}</button>);
jest.mock("./Modal", () => () => null);
jest.mock("./Toast", () => ({ message, actionLabel, onAction, onClose }) => (
  <div role="status">
    <span>{message}</span>
    {actionLabel && onAction ? <button onClick={onAction}>{actionLabel}</button> : null}
    {onClose ? <button aria-label="Fechar notificacao" onClick={onClose}>x</button> : null}
  </div>
));

afterEach(() => {
  getPersistentToasts().forEach((toast) => clearPersistentToast(toast.persistentId));
});

test("fecha apenas o aviso persistente correspondente e não o reapresenta ao remontar", () => {
  notify({ message: "Atualização disponível", persistent: true, persistentId: "update" });
  notify({ message: "Sincronização pendente", persistent: true, persistentId: "sync" });
  const firstRender = render(<FeedbackHost />);
  act(() => {
    notify({ message: "Operação concluída" });
  });
  expect(screen.getByText("Atualização disponível")).toBeTruthy();
  expect(screen.getByText("Sincronização pendente")).toBeTruthy();
  expect(screen.getByText("Operação concluída")).toBeTruthy();

  act(() => {
    clearPersistentToast("update");
  });
  expect(screen.queryByText("Atualização disponível")).toBeNull();
  expect(screen.getByText("Sincronização pendente")).toBeTruthy();
  expect(screen.getByText("Operação concluída")).toBeTruthy();

  firstRender.unmount();
  render(<FeedbackHost />);
  expect(screen.queryByText("Atualização disponível")).toBeNull();
  expect(screen.getByText("Sincronização pendente")).toBeTruthy();
});

test("mantém o funcionamento normal das notificações não persistentes", () => {
  render(<FeedbackHost />);

  act(() => {
    notify({ message: "Operação concluída" });
  });

  expect(screen.getByText("Operação concluída")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fechar notificacao" }));
  expect(screen.queryByText("Operação concluída")).toBeNull();
});
