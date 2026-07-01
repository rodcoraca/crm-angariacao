import { useState } from "react";
import { supabase } from "../supabase";
import { useTheme } from "../theme/ThemeContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";

export default function Login({ setUser, onLogin }) {
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [modoBootstrap, setModoBootstrap] = useState(false);
  const [bootstrapNome, setBootstrapNome] = useState("");
  const [bootstrapEmail, setBootstrapEmail] = useState("");
  const [bootstrapPassword, setBootstrapPassword] = useState("");

  async function login() {
    const valor = username.trim();
    if (!valor || !password) {
      alert("Introduza o utilizador e a password.");
      return;
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .or(`username.eq.${valor},email.eq.${valor}`)
      .maybeSingle();

    if (error || !data) {
      alert("Utilizador ou password inválidos.");
      return;
    }

    if (String(data.password_hash) !== String(password)) {
      alert("Utilizador ou password inválidos.");
      return;
    }

    const usuarioSessao = {
      id: data.id,
      email: data.email,
      user_metadata: {
        nome: data.nome,
        apelido: data.apelido,
        username: data.username,
      },
    };

    (setUser || onLogin)?.(usuarioSessao);
  }

  async function criarPrimeiroAdmin() {
    if (!bootstrapNome || !bootstrapEmail || !bootstrapPassword) {
      alert("Preencha nome, email e password para criar o administrador.");
      return;
    }

    const { data: existentes } = await supabase.from("usuarios").select("id").limit(1);
    if ((existentes || []).length > 0) {
      alert("Já existe pelo menos um utilizador registado. Use o painel de gestão para criar novos.");
      return;
    }

    const { error } = await supabase.from("usuarios").insert([{
      nome: bootstrapNome,
      apelido: "Admin",
      email: bootstrapEmail,
      username: bootstrapEmail.split("@")[0],
      password_hash: bootstrapPassword,
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

    if (error) {
      alert(error.message);
      return;
    }

    alert("Administrador criado com sucesso. Pode entrar agora.");
    setModoBootstrap(false);
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
    padding: "24px"
  },

  card: {
    padding: "40px",
    borderRadius: "16px",
    width: "360px",
    textAlign: "center"
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "12px"
  },

  title: {
    marginBottom: "5px",
    fontSize: "24px"
  },

  subtitle: {
    marginBottom: "20px"
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none"
  },

  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold"
  },

  secondaryButton: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    fontSize: "14px",
    marginTop: "10px"
  }
};