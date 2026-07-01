import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useTheme } from "./theme/ThemeContext";
import Button from "./components/Button";
import Input from "./Input";
import Card from "./components/Card";

export default function Documentos() {
  const theme = useTheme();

  const [documentos, setDocumentos] = useState([]);
  const [file, setFile] = useState(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);

  const styles = {
    cardUpload: {
      background: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      marginBottom: theme.spacing.lg,
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.sm,
      boxShadow: theme.shadow.md
    },
    input: {
      width: "100%",
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.border}`,
      padding: theme.spacing.sm,
      background: theme.colors.inputBackground,
      color: theme.colors.text,
      fontSize: theme.typography.fontSize,
      boxSizing: "border-box"
    },
    textarea: {
      width: "100%",
      minHeight: "120px",
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.border}`,
      padding: theme.spacing.sm,
      background: theme.colors.inputBackground,
      color: theme.colors.text,
      fontSize: theme.typography.fontSize,
      boxSizing: "border-box",
      resize: "vertical"
    },
    fileInput: {
      marginTop: theme.spacing.sm
    },
    btnUpload: {
      alignSelf: "flex-start"
    },
    lista: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing.sm
    },
    cardDocumento: {
      background: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: theme.shadow.sm
    },
    acoes: {
      display: "flex",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    btnAcao: {
      padding: "8px 12px",
      minWidth: "90px"
    },
    btnDelete: {
      minWidth: "90px"
    },
    previewCard: {
      background: theme.colors.surface,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadow.md
    },
    headerPreview: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm
    }
  };

  useEffect(() => {
    carregarDocumentos();
  }, []);

  async function carregarDocumentos() {
    const { data } = await supabase
      .from("documentos")
      .select("*")
      .order("created_at", { ascending: false });

    setDocumentos(data || []);
  }

  async function uploadDocumento() {
    if (!file) {
      alert("Selecione um PDF");
      return;
    }

    const nomeArquivo = `${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("crm-documentos")
      .upload(nomeArquivo, file);

    if (error) {
      alert(error.message);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("crm-documentos")
      .getPublicUrl(data.path);

    const { error: erroInsert } = await supabase
      .from("documentos")
      .insert([
        {
          nome,
          categoria,
          descricao,
          arquivo_url: publicUrl.publicUrl,
          arquivo_nome: file.name
        }
      ]);

    if (erroInsert) {
      alert(erroInsert.message);
      return;
    }

    alert("Documento enviado!");
    setNome("");
    setCategoria("");
    setDescricao("");
    setFile(null);
    carregarDocumentos();
  }

  async function apagarDocumento(doc) {
    if (!window.confirm("Deseja apagar este documento?")) {
      return;
    }

    await supabase
      .from("documentos")
      .delete()
      .eq("id", doc.id);

    carregarDocumentos();
  }

  return (
    <div>
      <h2>📁 Biblioteca de Documentos</h2>

      <Card style={styles.cardUpload}>
        <Input
          placeholder="Nome"
          style={styles.input}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <Input
          placeholder="Categoria"
          style={styles.input}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        />

        <Input
          as="textarea"
          placeholder="Descrição"
          style={styles.textarea}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <input
          type="file"
          accept=".pdf"
          style={styles.fileInput}
          onChange={(e) => setFile(e.target.files[0])}
        />

        <Button style={styles.btnUpload} onClick={uploadDocumento}>
          📤 Enviar PDF
        </Button>
      </Card>

      {documentoSelecionado && (
        <Card style={styles.previewCard}>
          <div style={styles.headerPreview}>
            <strong>{documentoSelecionado.nome}</strong>
            <Button color="light" onClick={() => setDocumentoSelecionado(null)}>
              ✖
            </Button>
          </div>

          <iframe
            title="pdf"
            src={documentoSelecionado.arquivo_url}
            width="100%"
            height="700"
          />
        </Card>
      )}

      <div style={styles.lista}>
        {documentos.map((doc) => (
          <Card key={doc.id} style={styles.cardDocumento}>
            <div>
              <strong>{doc.nome}</strong>
              <div>{doc.categoria}</div>
            </div>

            <div style={styles.acoes}>
              <Button color="light" style={styles.btnAcao} onClick={() => setDocumentoSelecionado(doc)}>
                📁 Ver
              </Button>

              <a href={doc.arquivo_url} download target="_blank" rel="noreferrer">
                <Button color="light" style={styles.btnAcao}>
                  ⬇️ Download
                </Button>
              </a>

              <Button color="danger" style={styles.btnDelete} onClick={() => apagarDocumento(doc)}>
                ❌
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
