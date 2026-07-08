import { useState } from "react";
import { supabase } from "../supabase";
import { useTheme } from "../theme/ThemeContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import { registrarLogin } from "../modules/audit/services";
import {
  createAuthUserFromAdminFlow,
  loadUserProfileByAuthUserId,
  resolveLoginEmail,
  signInWithPassword,
  signOutAuthSession
} from "../modules/auth/services";
import { notifyError, notifySuccess } from "../components/ui/feedbackBus";

export default function Login({ setUser, onLogin }) {
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [modoBootstrap, setModoBootstrap] = useState(false);
  const [bootstrapNome, setBootstrapNome] = useState("");
  const [bootstrapApelido, setBootstrapApelido] = useState("Admin");
  const [bootstrapEmail, setBootstrapEmail] = useState("");
  const [bootstrapPassword, setBootstrapPassword] = useState("");

  function montarUsuarioSessao(authUser, perfil) {
    return {
      id: authUser.id,
      auth_user_id: authUser.id,
      perfil_id: perfil?.id || null,
      email: authUser.email,
      user_metadata: {
        nome: perfil?.nome || authUser.user_metadata?.nome || authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
        apelido: perfil?.apelido || authUser.user_metadata?.apelido || "",
        username: perfil?.username || authUser.user_metadata?.username || authUser.email || "",
        telefone: perfil?.telefone || authUser.user_metadata?.telefone || "",
        perfil: authUser.user_metadata?.perfil || ""
      }
    };
  }

  function reportError(error, origem) {
    // Instrumentacao leve para observabilidade sem quebrar o fluxo principal.
    console.error(`[${origem}]`, error);
  }

  async function login() {
    try {
      const valor = username.trim();
      if (!valor || !password) {
        notifyError("Introduza o utilizador e a password.");
        return;
      }

      const resolved = await resolveLoginEmail(valor);
      const emailAutenticacao = resolved?.email || valor;

      const { data, error } = await signInWithPassword({
        email: emailAutenticacao,
        password
      });

      const authUser = data?.user || null;

      if (error || !authUser) {
        if (error) reportError(error, "Login.signInWithPassword");
        notifyError("Utilizador ou password inválidos.");
        return;
      }

      const { data: perfil, error: perfilError } = await loadUserProfileByAuthUserId(authUser.id);
      if (perfilError) {
        reportError(perfilError, "Login.loadUserProfileByAuthUserId");
        notifyError("Não foi possível carregar o perfil do utilizador.");
        return;
      }

      if (!perfil) {
        notifyError("Conta autenticada, mas sem perfil associado.");
        await signOutAuthSession();
        return;
      }

      const usuarioSessao = montarUsuarioSessao(authUser, perfil);

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
      notifyError(error?.message || "Ocorreu um erro inesperado no processo de autenticação.");
      return;
    }
  }

  async function criarPrimeiroAdmin() {
    try {
      if (!bootstrapNome || !bootstrapApelido || !bootstrapEmail || !bootstrapPassword) {
        notifyError("Preencha nome, apelido, email e password para criar o administrador.");
        return;
      }

      const { data: existentes } = await supabase.from("usuarios").select("id").limit(1);
      if ((existentes || []).length > 0) {
        notifyError("Já existe pelo menos um utilizador registado. Use a área de administração para criar novos.");
        return;
      }

      const authCreation = await createAuthUserFromAdminFlow({
        email: bootstrapEmail,
        password: bootstrapPassword,
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
        created_at: new Date().toISOString(),
      }]);

      if (perfilError) {
        reportError(perfilError, "Login.criarPrimeiroAdmin.insertPerfil");
        notifyError(perfilError.message);
        return;
      }

      notifySuccess("Administrador criado com sucesso. Pode entrar agora.");
      setModoBootstrap(false);
    } catch (error) {
      reportError(error, "Login.criarPrimeiroAdmin");
      notifyError(error?.message || "Ocorreu um erro inesperado na criação do administrador.");
      return;
    }
  }

  return (
    <div style={{ ...styles.container, background: theme.colors.brandGradient }}>
      <Card style={styles.card}>
        <div style={{ ...styles.badge, background: `${theme.colors.secondary}14`, color: theme.colors.primary }}>OSFlow</div>
        <h2 style={{ ...styles.title, color: theme.colors.primary }}>Acesso seguro</h2>
        <p style={{ ...styles.subtitle, color: theme.colors.muted }}>Gestão operacional com controlo total</p>

        {!modoBootstrap ? (
          <>
            <Input
              style={styles.input}
              placeholder="Email ou User name"
              onChange={(e) => setUsername(e.target.value)}
            />

            <Input
              style={styles.input}
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button variant="secondary" style={styles.button} onClick={login}>
              Entrar
            </Button>

            <Button variant="ghost" style={styles.secondaryButton} onClick={() => setModoBootstrap(true)}>
              Criar primeiro administrador
            </Button>
          </>
        ) : (
          <>
            <Input
              style={styles.input}
              placeholder="Nome"
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
              onChange={(e) => setBootstrapEmail(e.target.value)}
            />
            <Input
              style={styles.input}
              type="password"
              placeholder="Password"
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