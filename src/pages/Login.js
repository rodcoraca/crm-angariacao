import { useState } from "react";
import { supabase } from "../supabase";

export default function Login({ setUser, onLogin }) {
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
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>CRM Angariação</h2>
        <p style={styles.subtitle}>Acesso de agentes</p>

        {!modoBootstrap ? (
          <>
            <input
              style={styles.input}
              placeholder="Email ou User name"
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <button style={styles.button} onClick={login}>
              Entrar
            </button>

            <button style={styles.secondaryButton} onClick={() => setModoBootstrap(true)}>
              Criar primeiro administrador
            </button>
          </>
        ) : (
          <>
            <input
              style={styles.input}
              placeholder="Nome"
              onChange={(e) => setBootstrapNome(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Email"
              onChange={(e) => setBootstrapEmail(e.target.value)}
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              onChange={(e) => setBootstrapPassword(e.target.value)}
            />

            <button style={styles.button} onClick={criarPrimeiroAdmin}>
              Criar administrador
            </button>
            <button style={styles.secondaryButton} onClick={() => setModoBootstrap(false)}>
              Voltar ao login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    background: "linear-gradient(135deg, #1e293b, #3b82f6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  card: {
    background: "white",
    padding: "40px",
    borderRadius: "12px",
    width: "350px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    textAlign: "center"
  },

  title: {
    marginBottom: "5px"
  },

  subtitle: {
    marginBottom: "20px",
    color: "#666"
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px"
  },

  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer"
  },

  secondaryButton: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "white",
    color: "#334155",
    fontSize: "14px",
    marginTop: "10px",
    cursor: "pointer"
  }
};