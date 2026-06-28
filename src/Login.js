import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ setUser, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      (setUser || onLogin)?.(data.user);
    }
  }

  return (
    <div style={styles.container}>

      <div style={styles.card}>
        <h2 style={styles.title}>CRM Angariação</h2>
        <p style={styles.subtitle}>Acesso de agentes</p>

        <input
          style={styles.input}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
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
  }
};