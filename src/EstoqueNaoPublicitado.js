import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function EstoqueNaoPublicitado() {

  const [imoveis, setImoveis] = useState([]);
  const [busca, setBusca] = useState("");

  const [mostrarNovo, setMostrarNovo] = useState(false);

  const [proprietario, setProprietario] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipologia, setTipologia] = useState("");
  const [zona, setZona] = useState("");
  const [valorPretendido, setValorPretendido] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [imovelSelecionado, setImovelSelecionado] = useState(null);
  const [file, setFile] = useState(null);

  const [ficheiros, setFicheiros] = useState([]);
  const [ficheiroSelecionado, setFicheiroSelecionado] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const [email, setEmail] = useState("");

const [valorVenda, setValorVenda] = useState("");
const [valorM2, setValorM2] = useState("");

const [areaBrutaPrivativa, setAreaBrutaPrivativa] = useState("");
const [areaUtil, setAreaUtil] = useState("");

const [numeroQuartos, setNumeroQuartos] = useState("");
const [casasBanho, setCasasBanho] = useState("");

const [estacionamento, setEstacionamento] = useState(false);

const [precoCondominio, setPrecoCondominio] = useState("");

const [codigoPostal, setCodigoPostal] = useState("");
const [morada, setMorada] = useState("");

const [distrito, setDistrito] = useState("");
const [concelho, setConcelho] = useState("");
const [freguesia, setFreguesia] = useState("");

const [cmi, setCmi] = useState(false);
const [cadernetaPredial, setCadernetaPredial] = useState(false);
const [plantas, setPlantas] = useState(false);
const [certificadoEnergetico, setCertificadoEnergetico] = useState(false);
const [cartaoCidadao, setCartaoCidadao] = useState(false);

const [imovelEdicao, setImovelEdicao] = useState(null);

  //////////////////////////////////////////////////////
  // CARREGAR

  useEffect(() => {
    carregarImoveis();
  }, []);

  async function carregarImoveis() {

    const { data, error } = await supabase
      .from("estoque_nao_publicitado")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }
    console.log("DATA:", data);
    setImoveis(data || []);
  }

  async function carregarFicheiros(imovelId) {

  console.log("IMOVEL ID:", imovelId);

  const { data, error } = await supabase
    .from("imovel_ficheiros")
    .select("*")
    .eq("imovel_id", imovelId)
    .order("created_at", {
      ascending: false
    });

  console.log("FICHEIROS:", data);
  console.log("ERRO:", error);

  setFicheiros(data || []);
}
  //////////////////////////////////////////////////////
  // SALVAR

  async function salvarImovel() {

    const { error } = await supabase
      .from("estoque_nao_publicitado")
      .insert([
        {
          proprietario,
          telefone,
          tipologia,
          zona,
          valor_pretendido: valorPretendido,
          observacoes
        }
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Imóvel guardado!");

    setProprietario("");
    setTelefone("");
    setTipologia("");
    setZona("");
    setValorPretendido("");
    setObservacoes("");

    setMostrarNovo(false);

    carregarImoveis();
  }

  async function apagarFicheiro(ficheiro) {

  if (
    !window.confirm(
      "Deseja apagar este ficheiro?"
    )
  ) {
    return;
  }

  const { error } = await supabase
    .from("imovel_ficheiros")
    .delete()
    .eq("id", ficheiro.id);

  if (error) {
    alert(error.message);
    return;
  }

  carregarFicheiros(
    imovelSelecionado.id
  );
}
  //////////////////////////////////////////////////////
  // FILTRO

  const filtrados = imoveis.filter((i) =>
    i.proprietario?.toLowerCase().includes(busca.toLowerCase())
  );

  //////////////////////////////////////////////////////
  // UI

  async function uploadFicheiro(imovelId) {

  if (!file) return;

  setUploading(true);
  setProgresso(10);

  try {

    const nomeArquivo =
      `${Date.now()}-${file.name}`;

    setProgresso(30);

    const { data, error } =
      await supabase.storage
        .from("crm-imoveis")
        .upload(nomeArquivo, file);

    if (error) throw error;

    setProgresso(70);

    const { data: publicUrl } =
      supabase.storage
        .from("crm-imoveis")
        .getPublicUrl(data.path);

    const { data: insertData, error: insertError } =
    await supabase
        .from("imovel_ficheiros")
        .insert([
        {
            imovel_id: imovelId,
            nome: file.name,
            tipo:
            file.type.includes("pdf")
                ? "pdf"
                : "imagem",
            url: publicUrl.publicUrl
        }
        ])
        .select();

    console.log("INSERT DATA:", insertData);
    console.log("INSERT ERROR:", insertError);

    if (insertError) {
    throw insertError;
    }

    setProgresso(100);

    carregarFicheiros(imovelId);

  } catch (err) {

    alert(err.message);

  } finally {

    setTimeout(() => {
      setUploading(false);
      setProgresso(0);
    }, 500);
  }
}

//////////////////////////////////////////////////////
  // CÁLCULO VALOR M2

useEffect(() => {

  if (
    valorVenda &&
    areaBrutaPrivativa &&
    Number(areaBrutaPrivativa) > 0
  ) {

    setValorM2(
      (
        Number(valorVenda) /
        Number(areaBrutaPrivativa)
      ).toFixed(2)
    );

  }

}, [
  valorVenda,
  areaBrutaPrivativa
]);  

async function downloadFicheiro(f) {

  const response = await fetch(f.url);

  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = f.nome;

  document.body.appendChild(a);

  a.click();

  a.remove();

  window.URL.revokeObjectURL(url);
}

return (
    <div>

      <h2 style={{ marginBottom: "20px" }}>
        🏡 Estoque Não Publicitado
      </h2>

      <div style={barraSuperior}>

        <input
          style={input}
          placeholder="Pesquisar proprietário..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <button
          style={btnNovo}
          onClick={() => setMostrarNovo(!mostrarNovo)}
        >
          ➕ Novo Imóvel
        </button>

      </div>

      {mostrarNovo && (

        <div style={cardNovo}>

          <h3>Novo Imóvel</h3>

          <h4>👤 Proprietário</h4>

          <input
            style={inputFormFull}
            placeholder="Nome do Proprietário"
            value={proprietario}
            onChange={(e) =>
              setProprietario(e.target.value)
            }
          />

          <div style={grid2}>

            <input
              style={inputForm}
              placeholder="Telefone"
              value={telefone}
              onChange={(e) =>
                setTelefone(e.target.value)
              }
            />

            <input
              style={inputForm}
              placeholder="E-mail"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

          </div>

          <textarea
            style={textarea}
            placeholder="Observações"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
          
          <h4>💰 Comercialização</h4>

          <div style={grid3}>

            <input
              style={inputForm}
              placeholder="Valor Venda (€)"
              value={valorVenda}
              onChange={(e) =>
                setValorVenda(e.target.value)
              }
            />

            <input
              style={inputForm}
              placeholder="Condomínio (€)"
              value={precoCondominio}
              onChange={(e) =>
                setPrecoCondominio(
                  e.target.value
                )
              }
            />
         </div>

          <h4>📐 Áreas</h4>

          <div style={grid3}>

            <input
              style={inputForm}
              placeholder="Área Bruta Privativa"
              value={areaBrutaPrivativa}
              onChange={(e) =>
                setAreaBrutaPrivativa(
                  e.target.value
                )
              }
            />

            <input
              style={inputForm}
              placeholder="Área Útil"
              value={areaUtil}
              onChange={(e) =>
                setAreaUtil(e.target.value)
              }
            />

            <input
              style={inputForm}
              placeholder="€/m²"
              value={valorM2}
              readOnly
            />

          </div> 

          <h4>🏡 Características</h4>

          <div style={grid5}>

            <input
              style={inputForm}
              placeholder="Tipologia"
              value={tipologia}
              onChange={(e) =>
                setTipologia(e.target.value)
              }
            />

            <input
              style={inputForm}
              placeholder="Quartos"
              value={numeroQuartos}
              onChange={(e) =>
                setNumeroQuartos(e.target.value)
              }
            />

            <input
              style={inputForm}
              placeholder="Casas de Banho"
              value={casasBanho}
              onChange={(e) =>
                setCasasBanho(e.target.value)
              }
            />

            <input
              style={inputForm}
              placeholder="Zona"
              value={zona}
              onChange={(e) =>
                setZona(e.target.value)
              }
            />

          </div>         

            <h4>📍 Localização</h4>

          <div style={grid2}>

            <input
              style={inputForm}
              placeholder="Código Postal"
              value={codigoPostal}
              onChange={(e) =>
                setCodigoPostal(e.target.value)
              }
            />

            <input
              style={inputForm}
              placeholder="Distrito"
              value={distrito}
              onChange={(e) =>
                setDistrito(e.target.value)
              }
            />

          </div>

          <div style={grid2}>

            <input
              style={inputForm}
              placeholder="Concelho"
              value={concelho}
              onChange={(e) =>
                setConcelho(e.target.value)
              }
            />

            <input
              style={inputForm}
              placeholder="Freguesia"
              value={freguesia}
              onChange={(e) =>
                setFreguesia(e.target.value)
              }
            />

          </div>

          <input
            style={inputFormFull}
            placeholder="Morada"
            value={morada}
            onChange={(e) =>
              setMorada(e.target.value)
            }
          />

          <h4>📋 Documentação</h4>

          <div style={linhaDocumentos}>

            <label style={docCard}>
              <input
                type="checkbox"
                checked={cmi}
                onChange={(e) =>
                  setCmi(e.target.checked)
                }
              />
              CMI
            </label>

            <label style={docCard}>
              <input
                type="checkbox"
                checked={cadernetaPredial}
                onChange={(e) =>
                  setCadernetaPredial(
                    e.target.checked
                  )
                }
              />
              Caderneta Predial
            </label>

            <label style={docCard}>
              <input
                type="checkbox"
                checked={plantas}
                onChange={(e) =>
                  setPlantas(e.target.checked)
                }
              />
              Plantas
            </label>

            <label style={docCard}>
              <input
                type="checkbox"
                checked={certificadoEnergetico}
                onChange={(e) =>
                  setCertificadoEnergetico(
                    e.target.checked
                  )
                }
              />
              Certificado Energético
            </label>

            <label style={docCard}>
              <input
                type="checkbox"
                checked={cartaoCidadao}
                onChange={(e) =>
                  setCartaoCidadao(
                    e.target.checked
                  )
                }
              />
              Cartão de Cidadão
            </label>

            <label style={docCard}>

              <input
                type="checkbox"
                checked={estacionamento}
                onChange={(e) =>
                  setEstacionamento(
                    e.target.checked
                  )
                }
              />

              Estacionamento

            </label>

          </div>

          <div style={acoesForm}>

        <button
            style={btnGuardar}
            onClick={salvarImovel}
        >
            Guardar
        </button>

        <button
            style={btnCancelar}
            onClick={() => {
            setMostrarNovo(false);

            setProprietario("");
            setTelefone("");
            setTipologia("");
            setZona("");
            setValorPretendido("");
            setObservacoes("");
            }}
            >
            ↩️ Cancelar
        </button>

    </div>

  </div>

)}

{imovelSelecionado && (

  <div style={cardDetalhe}>

    <div style={headerCard}>

      <strong>
        {imovelSelecionado.proprietario}
      </strong>

      <button
        style={btnFechar}
        onClick={() => setImovelSelecionado(null)}
        >
        ✖
      </button>

    </div>

    <p>
      <strong>Telefone:</strong>{" "}
      {imovelSelecionado.telefone}
    </p>

    <p>
      <strong>Tipologia:</strong>{" "}
      {imovelSelecionado.tipologia}
    </p>

    <p>
      <strong>Zona:</strong>{" "}
      {imovelSelecionado.zona}
    </p>

    <p>
      <strong>Valor:</strong>{" "}
      {imovelSelecionado.valor_pretendido} €
    </p>

    {imovelSelecionado.observacoes && (
      <div style={obsBox}>
        📝 {imovelSelecionado.observacoes}
      </div>
    )}

    <h3 style={{ marginTop: "20px" }}>
      Upload ( Documentos e Imagens)
    </h3>

    <input
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      onChange={(e) => setFile(e.target.files[0])}
    />

    <button
      style={{
        ...btnGuardar,
        marginTop: "10px"
      }}
      onClick={() =>
        uploadFicheiro(imovelSelecionado.id)
      }
    >
      Upload
    </button>

    {uploading && (

    <div style={uploadBox}>

        <div style={uploadTexto}>
        A carregar ficheiro... {progresso}%
        </div>

        <div style={barraExterna}>

        <div
            style={{
            ...barraInterna,
            width: `${progresso}%`
            }}
        />

        </div>

    </div>
    
    )}
   <hr></hr>
   <div style={galeria}>

    {ficheiros
      .filter(f => f.tipo === "imagem")
      .map((f) => (

        <div
          key={f.id}
          style={thumbCard}
        >

          <div style={thumbContainer}>

            <img
              src={f.url}
              alt={f.nome}
              style={thumb}
              onClick={() =>
                window.open(
                  f.url,
                  "_blank"
                )
              }
            />

            <div style={overlayAcoes}>

              <button
                style={iconeDownload}
                onClick={() => downloadFicheiro(f)}
              >
                ⬇
              </button>

              <button
                style={iconeDelete}
                onClick={() =>
                  apagarFicheiro(f)
                }
              >
                🗑
              </button>

            </div>

          </div>

          <div style={nomeImagem}>
            {f.nome}
          </div>

        </div>

      ))}

  </div>
     {ficheiroSelecionado?.tipo === "pdf" && (

        <div style={previewBox}>

          <iframe
            title="pdf"
            src={ficheiroSelecionado.url}
            width="100%"
            height="700"
          />

        </div>

      )}

   {ficheiroSelecionado?.tipo === "pdf" && (

    <div style={previewBox}>

        <div style={headerPreview}>

        <strong>
            {ficheiroSelecionado.nome}
        </strong>

        <button
            style={btnFechar}
            onClick={() =>
            setFicheiroSelecionado(null)
            }
        >
            ✖
        </button>

        </div>

        <iframe
        title="pdf"
        src={ficheiroSelecionado.url}
        width="100%"
        height="700"
        />

    </div>

    )}
</div>

    )}

     <div style={tableWrapper}>

        <table style={table}>

          <thead>
            <tr>
              <th style={th}>Proprietário</th>
              <th style={th}>Telefone</th>
              <th style={th}>Tipologia</th>
              <th style={th}>Zona</th>
              <th style={th}>Valor</th>
            </tr>
          </thead>

          <tbody>

            {filtrados.map((imovel) => (

              <tr
                key={imovel.id}
                style={{ ...tr, cursor: "pointer" }}
                onClick={() => {

  console.log("IMOVEL CLICADO:", imovel);

  setImovelSelecionado(imovel);

  carregarFicheiros(imovel.id);

}}
              >

                <td style={tdNome}>
                  {imovel.proprietario}
                </td>

                <td style={td}>
                  {imovel.telefone}
                </td>

                <td style={td}>
                  {imovel.tipologia}
                </td>

                <td style={td}>
                  {imovel.zona}
                </td>

                <td style={td}>
                  {imovel.valor_pretendido} €
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>
    </div>
  );
}



//////////////////////////////////////////////////////
// ESTILOS

const barraSuperior = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px"
};

const input = {
  flex: 1,
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db"
};

const inputForm = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box"
};

const textarea = {
  width: "100%",
  height: "100px",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box"
};

const btnNovo = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: "8px",
  cursor: "pointer"
};

const btnGuardar = {
  flex: 1,
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer"
};

const cardNovo = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
};

const tableWrapper = {
  background: "white",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  textAlign: "left",
  padding: "14px",
  background: "#f1f5f9"
};

const tr = {
  borderBottom: "1px solid #e2e8f0"
};

const td = {
  padding: "14px"
};

const tdNome = {
  padding: "14px",
  fontWeight: "600"
};

const cardDetalhe = {
  background: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const headerCard = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "10px"
};

const btnFechar = {
  border: "none",
  background: "transparent",
  cursor: "pointer"
};

const obsBox = {
  marginTop: "10px",
  padding: "10px",
  background: "#fef3c7",
  borderRadius: "8px"
};

const acoesForm = {
  display: "flex",
  gap: "10px",
  marginTop: "10px"
};

const btnCancelar = {
  flex: 1,
  background: "#64748b",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer"
};

const linhaFicheiro = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px",
  borderBottom: "1px solid #e2e8f0"
};

const previewBox = {
  marginTop: "20px",
  padding: "10px",
  background: "#f8fafc",
  borderRadius: "8px"
};

const imagemPreview = {
  width: "100%",
  borderRadius: "10px"
};

const uploadBox = {
  marginTop: "15px"
};

const uploadTexto = {
  marginBottom: "5px",
  fontWeight: "600",
  color: "#334155"
};

const barraExterna = {
  width: "100%",
  height: "12px",
  background: "#e2e8f0",
  borderRadius: "999px",
  overflow: "hidden"
};

const barraInterna = {
  height: "100%",
  background: "#22c55e",
  transition: "0.3s"
}

const galeria = {
  display: "flex",
  flexWrap: "wrap",
  gap: "15px",
  marginTop: "15px"
};

const thumbCard = {
  position: "relative"
};

const thumb = {
  width: "150px",
  height: "100px",
  objectFit: "cover",
  borderRadius: "10px",
  cursor: "pointer",
  border: "1px solid #e2e8f0"
};

const btnDeleteImagem = {
  position: "absolute",
  top: "5px",
  right: "5px",

  background: "#ef4444",
  color: "white",

  border: "none",
  borderRadius: "50%",

  width: "28px",
  height: "28px",

  cursor: "pointer"
};

const headerPreview = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px"
};;

const thumbContainer = {
  position: "relative"
};

const overlayAcoes = {
  position: "absolute",
  top: "6px",
  right: "6px",

  display: "flex",
  gap: "6px"
};

const iconeOverlay = {
  width: "30px",
  height: "30px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  background: "rgba(255,255,255,0.95)",

  borderRadius: "50%",

  textDecoration: "none",

  cursor: "pointer",

  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
};

const iconeDelete = {
  width: "30px",
  height: "30px",

  border: "none",

  background: "rgba(239,68,68,0.95)",

  color: "white",

  borderRadius: "50%",

  cursor: "pointer",

  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
};

const nomeImagem = {
  marginTop: "8px",
  textAlign: "center",
  fontSize: "13px",
  color: "#475569",

  maxWidth: "150px",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const iconeDownload = {
  width: "30px",
  height: "30px",

  border: "none",

  background: "rgba(255,255,255,0.95)",

  borderRadius: "50%",

  cursor: "pointer",

  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "12px"
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "12px",
  marginBottom: "12px"
};

const inputFormFull = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  marginBottom: "12px",
  boxSizing: "border-box"
};

const gridDocs = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill,minmax(220px,1fr))",
  gap: "10px",
  marginTop: "10px"
};

const docCard = {
  display: "flex",
  alignItems: "center",
  gap: "6px",

  padding: "8px 12px",

  background: "#f8fafc",

  border: "1px solid #e2e8f0",

  borderRadius: "8px",

  cursor: "pointer",

  fontSize: "14px",

  whiteSpace: "nowrap"
};

const grid5 = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr 1.5fr 1.5fr",
  gap: "12px",
  marginBottom: "12px",
  alignItems: "center"
};

const linhaDocumentos = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "15px"
};