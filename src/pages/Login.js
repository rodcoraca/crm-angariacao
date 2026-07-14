import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useTheme } from "../theme/ThemeContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import { registrarLogin } from "../modules/audit/services";
import {
  createAuthUserFromAdminFlow,
  loadAuthorizationProfileByAuthUserId,
  loadUserProfileByLoginEmail,
  reconcilePendingActivation,
  requestPasswordReset,
  resolveLoginEmail,
  signInWithPassword,
  signOutAuthSession
} from "../modules/auth/services";
import { notifyError, notifySuccess } from "../components/ui/feedbackBus";

const ACTIVE_SESSION_TENANT_KEY = "osflow_active_session_empresa_id";

export default function Login({ setUser, onLogin, passwordRecoveryMode = false, onPasswordRecoveryComplete = null }) {
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [modoBootstrap, setModoBootstrap] = useState(false);
  const [bootstrapNome, setBootstrapNome] = useState("");
  const [bootstrapApelido, setBootstrapApelido] = useState("Admin");
  const [bootstrapEmail, setBootstrapEmail] = useState("");
  const [bootstrapPassword, setBootstrapPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [novaPassword, setNovaPassword] = useState("");
  const [confirmarNovaPassword, setConfirmarNovaPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(Boolean(passwordRecoveryMode));

  useEffect(() => {
    setRecoveryMode(Boolean(passwordRecoveryMode));
  }, [passwordRecoveryMode]);

  function clearOnboardingClientState() {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem(ACTIVE_SESSION_TENANT_KEY);
    window.localStorage.clear();
    window.sessionStorage.clear();
  }

  function montarUsuarioSessao(authUser, perfil, expiresAt = null) {
    const empresaId = perfil?.empresa_id || authUser.user_metadata?.empresa_id || null;

    return {
      id: authUser.id,
      auth_user_id: authUser.id,
      perfil_id: perfil?.id || null,
      empresa_id: empresaId,
      email: authUser.email,
      expires_at: expiresAt,
      user_metadata: {
        nome: perfil?.nome || authUser.user_metadata?.nome || authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
        apelido: perfil?.apelido || authUser.user_metadata?.apelido || "",
        username: perfil?.username || authUser.user_metadata?.username || authUser.email || "",
        telefone: perfil?.telefone || authUser.user_metadata?.telefone || "",
        perfil: authUser.user_metadata?.perfil || "",
        empresa_id: empresaId,
        permissoes: perfil?.permissoes || {}
      }
    };
  }

  function reportError(error, origem) {
    // Instrumentacao leve para observabilidade sem quebrar o fluxo principal.
    console.error(`[${origem}]`, error);
  }

  function resolveAccountStatus(profile) {
    const status = String(profile?.account_status || "").trim().toLowerCase();
    if (status === "pending_activation" || status === "active" || status === "disabled") {
      return status;
    }

    return profile?.ativo === false ? "disabled" : "active";
  }

  function normalizeErrorText(error) {
    return String(error?.message || error?.error_description || error?.code || "").toLowerCase();
  }

  function isCommunicationError(error) {
    const code = String(error?.code || "").toLowerCase();
    const message = normalizeErrorText(error);

    return (
      code.includes("network") ||
      code.includes("fetch") ||
      code.includes("timeout") ||
      message.includes("failed to fetch") ||
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("timeout")
    );
  }

  function mapSignInErrorMessage(error, { knownUser = false } = {}) {
    const code = String(error?.code || "").toLowerCase();
    const message = normalizeErrorText(error);

    if (isCommunicationError(error)) {
      return "Erro de comunicação com o serviço de autenticação. Tente novamente.";
    }

    if (
      code.includes("session") ||
      code.includes("refresh_token") ||
      code.includes("jwt_expired") ||
      message.includes("session expired") ||
      message.includes("jwt expired") ||
      message.includes("refresh token")
    ) {
      return "Sessão expirada. Faça login novamente.";
    }

    if (
      code.includes("invalid_credentials") ||
      message.includes("invalid login credentials") ||
      message.includes("invalid credentials")
    ) {
      return knownUser ? "Password incorreta." : "Email inexistente.";
    }

    if (code.includes("email_not_confirmed") || message.includes("email not confirmed")) {
      return "Conta ainda não confirmada. Verifique o email de confirmação.";
    }

    return "Erro interno durante a autenticação. Tente novamente.";
  }

  function mapPasswordRecoveryErrorMessage(error) {
    if (isCommunicationError(error)) {
      return "Erro de comunicação ao enviar email de recuperação.";
    }

    return "Não foi possível enviar o email de recuperação.";
  }

  async function bootstrapDisponivel() {
    const { count, error } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    return Number(count || 0) === 0;
  }

  async function login() {
    if (isAuthenticating) return;

    setIsAuthenticating(true);

    try {
      const valor = username.trim();
      if (!valor || !password) {
        notifyError("Introduza o utilizador e a password.");
        return;
      }

      const resolved = await resolveLoginEmail(valor);
      if (resolved?.error) {
        reportError(resolved.error, "Login.resolveLoginEmail");
        notifyError(isCommunicationError(resolved.error)
          ? "Erro de comunicação ao validar o utilizador."
          : "Erro interno ao validar o utilizador.");
        return;
      }

      const emailAutenticacao = resolved?.email || valor;

      const { data: perfilByEmail, error: perfilByEmailError } = await loadUserProfileByLoginEmail(emailAutenticacao);
      if (perfilByEmailError) {
        reportError(perfilByEmailError, "Login.loadUserProfileByLoginEmail");
        notifyError(isCommunicationError(perfilByEmailError)
          ? "Erro de comunicação ao carregar o perfil do utilizador."
          : "Erro interno ao carregar o perfil do utilizador.");
        return;
      }

      if (!perfilByEmail) {
        notifyError("Email inexistente.");
        return;
      }

      if (resolveAccountStatus(perfilByEmail) === "disabled") {
        notifyError("Utilizador inativo. Contacte um administrador.");
        return;
      }

      const { data, error } = await signInWithPassword({
        email: emailAutenticacao,
        password
      });

      const authUser = data?.user || null;
      const authSession = data?.session || null;

      if (error || !authUser) {
        if (error) reportError(error, "Login.signInWithPassword");
        notifyError(mapSignInErrorMessage(error, { knownUser: Boolean(perfilByEmail) }));
        return;
      }

      let { data: perfil, error: perfilError } = await loadAuthorizationProfileByAuthUserId(authUser);
      if (perfilError) {
        reportError(perfilError, "Login.loadAuthorizationProfileByAuthUserId");
        notifyError(isCommunicationError(perfilError)
          ? "Erro de comunicação ao carregar o perfil do utilizador."
          : "Erro interno ao carregar o perfil do utilizador.");
        return;
      }

      if (!perfil) {
        notifyError("Conta autenticada, mas sem perfil associado.");
        await signOutAuthSession();
        return;
      }

      const accountStatus = resolveAccountStatus(perfil);
      if (accountStatus === "disabled") {
        notifyError("Utilizador inativo. Contacte um administrador.");
        await signOutAuthSession();
        return;
      }

      if (accountStatus === "pending_activation") {
        const activationReconciliation = await reconcilePendingActivation(authUser, perfil);
        if (activationReconciliation.error) {
          reportError(activationReconciliation.error, "Login.reconcilePendingActivation");
        } else if (activationReconciliation.data) {
          perfil = activationReconciliation.data;
        }
      }

      const usuarioSessao = montarUsuarioSessao(authUser, perfil, authSession?.expires_at || null);

      try {
        await registrarLogin({
          userId: perfil.id || authUser.id,
          empresaId: perfil.empresa_id || null,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          device: typeof navigator !== "undefined" ? /mobile|android|iphone/i.test(navigator.userAgent || "") ? "mobile" : "desktop" : "unknown",
          modulo: "auth",
          entidade: "usuarios",
          entidadeId: perfil.id || authUser.id,
          metadata: {
            username: perfil.email || authUser.email || null,
            email: perfil.email || authUser.email || null
          }
        });
      } catch (error) {
        reportError(error, "Login.registrarLogin");
      }

      (setUser || onLogin)?.(usuarioSessao);
    } catch (error) {
      reportError(error, "Login.login");
      notifyError(isCommunicationError(error)
        ? "Erro de comunicação com o serviço de autenticação."
        : error?.message || "Erro interno no processo de autenticação.");
      return;
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function criarPrimeiroAdmin() {
    try {
      if (!bootstrapNome || !bootstrapApelido || !bootstrapEmail) {
        notifyError("Preencha nome, apelido e email para criar o administrador.");
        return;
      }

      const podeBootstrap = await bootstrapDisponivel();
      if (!podeBootstrap) {
        setModoBootstrap(false);
        notifyError("Bootstrap inicial indisponível. Utilize o login e a Administração.");
        return;
      }

      const authCreation = await createAuthUserFromAdminFlow({
        email: bootstrapEmail,
        metadata: {
          nome: bootstrapNome,
          apelido: bootstrapApelido,
          username: bootstrapEmail.split("@")[0]
        }
      });

      const authUser = authCreation?.createdUser || null;

      if (authCreation?.error || !authUser) {
        if (authCreation?.error) {
          reportError(authCreation.error, "Login.signUp");
        }
        notifyError(authCreation?.error?.message || "Não foi possível criar utilizador no Supabase Auth.");
        return;
      }

      const { error: perfilError } = await supabase.from("usuarios").insert([{
        auth_user_id: authUser.id,
        nome: bootstrapNome,
        apelido: bootstrapApelido,
        email: bootstrapEmail,
        telefone: "",
        username: bootstrapEmail.split("@")[0],
        permissoes: {
          fluxo: true,
          dashboard: true,
          quente: true,
          morno: true,
          frio: true,
          mensagens: true,
          estoque_np: true,
          usuarios: true,
          logs: true,
        },
        ativo: true,
        account_status: "pending_activation",
        activation_sent_at: new Date().toISOString(),
        activated_at: null,
        created_at: new Date().toISOString(),
      }]);

      if (perfilError) {
        reportError(perfilError, "Login.criarPrimeiroAdmin.insertPerfil");
        notifyError(perfilError.message);
        return;
      }

      notifySuccess("Administrador criado. Convite enviado para definição de password.");
      setModoBootstrap(false);
    } catch (error) {
      reportError(error, "Login.criarPrimeiroAdmin");
      notifyError(error?.message || "Ocorreu um erro inesperado na criação do administrador.");
      return;
    }
  }

  async function atualizarPasswordRecuperacao() {
    if (isUpdatingPassword) return;

    if (!novaPassword || !confirmarNovaPassword) {
      notifyError("Introduza e confirme a nova password.");
      return;
    }

    if (novaPassword !== confirmarNovaPassword) {
      notifyError("As passwords não coincidem.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaPassword });
      if (error) {
        reportError(error, "Login.atualizarPasswordRecuperacao");
        notifyError("Não foi possível definir a nova password.");
        return;
      }

      await supabase.auth.signOut();
      clearOnboardingClientState();
      setUsername("");
      setPassword("");
      setNovaPassword("");
      setConfirmarNovaPassword("");
      setBootstrapPassword("");
      setRecoveryMode(false);
      if (typeof onPasswordRecoveryComplete === "function") {
        onPasswordRecoveryComplete();
      }
      notifySuccess("Password atualizada com sucesso. Faça login.");
    } catch (error) {
      reportError(error, "Login.atualizarPasswordRecuperacao.catch");
      notifyError("Erro interno ao definir nova password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  function getPasswordRecoveryRedirectUrl() {
    if (typeof window === "undefined") return undefined;

    return window.location.origin;
  }

  async function recuperarPassword() {
    if (isRecoveringPassword || isAuthenticating) return;

    setIsRecoveringPassword(true);

    try {
      const valor = username.trim();
      if (!valor) {
        notifyError("Introduza o email ou user name para recuperar a password.");
        return;
      }

      const resolved = await resolveLoginEmail(valor);
      if (resolved?.error) {
        reportError(resolved.error, "Login.requestPasswordReset.resolveLoginEmail");
        notifyError(isCommunicationError(resolved.error)
          ? "Erro de comunicação ao validar o utilizador para recuperação de password."
          : "Erro interno ao validar o utilizador para recuperação de password.");
        return;
      }

      const emailRecuperacao = resolved?.email || valor;
      const { data: perfilByEmail, error: perfilByEmailError } = await loadUserProfileByLoginEmail(emailRecuperacao);
      if (perfilByEmailError) {
        reportError(perfilByEmailError, "Login.requestPasswordReset.loadUserProfileByLoginEmail");
        notifyError(isCommunicationError(perfilByEmailError)
          ? "Erro de comunicação ao validar email para recuperação."
          : "Erro interno ao validar email para recuperação.");
        return;
      }

      if (!perfilByEmail) {
        notifyError("Email inexistente.");
        return;
      }

      const { error } = await requestPasswordReset(emailRecuperacao, getPasswordRecoveryRedirectUrl());
      if (error) {
        reportError(error, "Login.requestPasswordReset");
        notifyError(mapPasswordRecoveryErrorMessage(error));
        return;
      }

      notifySuccess("Email de recuperação enviado.");
    } catch (error) {
      reportError(error, "Login.requestPasswordReset.catch");
      notifyError("Erro interno ao recuperar password.");
    } finally {
      setIsRecoveringPassword(false);
    }
  }

  return (
    <div style={{ ...styles.container, background: theme.colors.brandGradient }}>
      <Card style={styles.card}>
        <div style={{ ...styles.badge, background: `${theme.colors.secondary}14`, color: theme.colors.primary }}>OSFlow</div>
        <h2 style={{ ...styles.title, color: theme.colors.primary }}>Acesso seguro</h2>
        <p style={{ ...styles.subtitle, color: theme.colors.muted }}>Gestão operacional com controlo total</p>

        {recoveryMode ? (
          <>
            <Input
              style={styles.input}
              type="password"
              placeholder="Nova password"
              value={novaPassword}
              disabled={isUpdatingPassword}
              onChange={(e) => setNovaPassword(e.target.value)}
            />
            <Input
              style={styles.input}
              type="password"
              placeholder="Confirmar nova password"
              value={confirmarNovaPassword}
              disabled={isUpdatingPassword}
              onChange={(e) => setConfirmarNovaPassword(e.target.value)}
            />
            <Button
              variant="secondary"
              style={styles.button}
              onClick={atualizarPasswordRecuperacao}
              loading={isUpdatingPassword}
              disabled={isUpdatingPassword}
            >
              Definir nova password
            </Button>
          </>
        ) : !modoBootstrap ? (
          <>
            <Input
              style={styles.input}
              placeholder="Email ou User name"
              value={username}
              disabled={isAuthenticating}
              onChange={(e) => setUsername(e.target.value)}
            />

            <Input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              disabled={isAuthenticating}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button variant="secondary" style={styles.button} onClick={login} loading={isAuthenticating} disabled={isAuthenticating}>
              Entrar
            </Button>

            <Button
              variant="ghost"
              style={styles.secondaryButton}
              disabled={isAuthenticating || isRecoveringPassword}
              loading={isRecoveringPassword}
              onClick={recuperarPassword}
            >
              Recuperar password
            </Button>

            <Button
              variant="ghost"
              style={styles.secondaryButton}
              disabled={isAuthenticating}
              onClick={async () => {
                try {
                  const podeBootstrap = await bootstrapDisponivel();
                  if (!podeBootstrap) {
                    setModoBootstrap(false);
                    notifyError("Bootstrap inicial indisponível. Utilize o login e a Administração.");
                    return;
                  }

                  setModoBootstrap(true);
                } catch (error) {
                  reportError(error, "Login.bootstrapDisponivel");
                  notifyError(isCommunicationError(error)
                    ? "Erro de comunicação ao validar bootstrap inicial."
                    : "Erro interno ao validar bootstrap inicial.");
                }
              }}
            >
              Criar primeiro administrador
            </Button>
          </>
        ) : (
          <>
            <Input
              style={styles.input}
              placeholder="Nome"
              value={bootstrapNome}
              onChange={(e) => setBootstrapNome(e.target.value)}
            />
            <Input
              style={styles.input}
              placeholder="Apelido"
              value={bootstrapApelido}
              onChange={(e) => setBootstrapApelido(e.target.value)}
            />
            <Input
              style={styles.input}
              placeholder="Email"
              value={bootstrapEmail}
              onChange={(e) => setBootstrapEmail(e.target.value)}
            />
            <Input
              style={styles.input}
              type="password"
              placeholder="Password (definida no convite)"
              value={bootstrapPassword}
              onChange={(e) => setBootstrapPassword(e.target.value)}
            />

            <Button variant="primary" style={styles.button} onClick={criarPrimeiroAdmin}>
              Criar administrador
            </Button>
            <Button variant="ghost" style={styles.secondaryButton} onClick={() => setModoBootstrap(false)}>
              Voltar ao login
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "var(--os-page-padding)"
  },

  card: {
    padding: "var(--os-padding)",
    borderRadius: "var(--os-radius-md)",
    width: "360px",
    textAlign: "center"
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: "var(--os-radius-pill)",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "12px"
  },

  title: {
    marginBottom: "5px",
    fontSize: "24px",
    fontWeight: 600
  },

  subtitle: {
    marginBottom: "20px"
  },

  input: {
    width: "100%",
    padding: "var(--os-padding)",
    marginBottom: "15px",
    borderRadius: "var(--os-radius-md)",
    fontSize: "14px",
    outline: "none"
  },

  button: {
    width: "100%",
    padding: "var(--os-padding)",
    borderRadius: "var(--os-radius-md)",
    fontSize: "16px",
    fontWeight: 600
  },

  secondaryButton: {
    width: "100%",
    padding: "var(--os-padding)",
    borderRadius: "var(--os-radius-md)",
    fontSize: "14px",
    marginTop: "10px"
  }
};