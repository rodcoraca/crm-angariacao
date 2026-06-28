import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Documentos() {

  const [documentos, setDocumentos] = useState([]);
  const [file, setFile] = useState(null);

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");

  const [documentoSelecionado, setDocumentoSelecionado] =
    useState(null);

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

    const nomeArquivo =
      `${Date.now()}-${file.name}`;

    const { data, error } =
      await supabase.storage
        .from("crm-documentos")
        .upload(nomeArquivo, file);

    if (error) {
      alert(error.message);
      return;
    }

    const { data: publicUrl } =
      supabase.storage
        .from("crm-documentos")
        .getPublicUrl(data.path);

    const { error: erroInsert } =
      await supabase
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

    if (
      !window.confirm(
        "Deseja apagar este documento?"
      )
    ) {
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

      <h2>
        📁 Biblioteca de Documentos
      </h2>

      <div style={cardUpload}>

        <input
          style={input}
          placeholder="Nome"
          value={nome}
          onChange={(e) =>
            setNome(e.target.value)
          }
        />

        <input
          style={input}
          placeholder="Categoria"
          value={categoria}
          onChange={(e) =>
            setCategoria(e.target.value)
          }
        />

        <textarea
          style={textarea}
          placeholder="Descrição"
          value={descricao}
          onChange={(e) =>
            setDescricao(e.target.value)
          }
        />

        <input
          type="file"
          accept=".pdf"
          onChange={(e) =>
            setFile(e.target.files[0])
          }
        />

        <button
          style={btnUpload}
          onClick={uploadDocumento}
        >
          📤 Enviar PDF
        </button>

      </div>

      {documentoSelecionado && (

        <div style={previewCard}>

          <div style={headerPreview}>

            <strong>
              {documentoSelecionado.nome}
            </strong>

            <button
              onClick={() =>
                setDocumentoSelecionado(null)
              }
            >
              ✖
            </button>

          </div>

          <iframe
            title="pdf"
            src={
              documentoSelecionado.arquivo_url
            }
            width="100%"
            height="700"
          />

        </div>

      )}

      <div style={lista}>

        {documentos.map((doc) => (

          <div
            key={doc.id}
            style={cardDocumento}
          >

            <div>

              <strong>
                {doc.nome}
              </strong>

              <div>
                {doc.categoria}
              </div>

            </div>

            <div style={acoes}>

              <button
                style={btnAcao}
                onClick={() =>
                  setDocumentoSelecionado(doc)
                }
              >
                👁 Ver
              </button>

              <a
                href={doc.arquivo_url}
                download
                target="_blank"
                rel="noreferrer"
              >
                <button style={btnAcao}>
                  ⬇ Download
                </button>
              </a>

              <button
                style={btnDelete}
                onClick={() =>
                  apagarDocumento(doc)
                }
              >
                🗑
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}

//////////////////////////////////////////////////////
// ESTILOS

const cardUpload = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
};

const input = {
  padding: "10px"
};

const textarea = {
  padding: "10px",
  height: "80px"
};

const btnUpload = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer"
};

const lista = {
  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const cardDocumento = {
  background: "white",
  padding: "15px",
  borderRadius: "10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 3px 8px rgba(0,0,0,0.05)"
};

const acoes = {
  display: "flex",
  gap: "8px"
};

const btnAcao = {
  padding: "8px 12px",
  cursor: "pointer"
};

const btnDelete = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer"
};

const previewCard = {
  background: "white",
  padding: "20px",
  marginBottom: "20px",
  borderRadius: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
};

const headerPreview = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "10px"
};