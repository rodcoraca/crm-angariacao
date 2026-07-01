import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { normalizarTelefone, validarTelefone } from "./telefone";
import CadastroImovel from "./CadastroImovel";
import FichaImovel from "./FichaImovel";

export default function EstoqueNaoPublicitado() {

  const [imoveis, setImoveis] = useState([]);
  const [busca, setBusca] = useState("");
  const [moduloAtual, setModuloAtual] = useState("lista");

  const [proprietario, setProprietario] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneErro, setTelefoneErro] = useState("");
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

  const [estacionamento, setEstacionamento] = useState("");

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

  const isEditing = Boolean(imovelEdicao);

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

  function carregarImovelParaEdicao(imovel) {
    setImovelEdicao(imovel);
    setProprietario(imovel.proprietario || "");
    const telefoneNormalizado = normalizarTelefone(imovel.telefone || "");
    setTelefone(telefoneNormalizado);
    setTelefoneErro(
      telefoneNormalizado && !validarTelefone(telefoneNormalizado)
        ? "Informe o telefone com 12 dígitos (indicativo + 9 dígitos)."
        : ""
    );
    setTipologia(imovel.tipologia || "");
    setZona(imovel.zona || "");
    setValorPretendido(imovel.valor_pretendido || "");
    setValorVenda(imovel.valor_venda || "");
    setValorM2(imovel.valor_m2 || "");
    setAreaBrutaPrivativa(imovel.area_bruta_privativa || "");
    setAreaUtil(imovel.area_util || "");
    setNumeroQuartos(imovel.numero_quartos || "");
    setCasasBanho(imovel.casas_banho || "");
    setPrecoCondominio(imovel.preco_condominio || "");
    setEmail(imovel.email || "");
    setCodigoPostal(imovel.codigo_postal || "");
    setMorada(imovel.morada || "");
    setDistrito(imovel.distrito || "");
    setConcelho(imovel.concelho || "");
    setFreguesia(imovel.freguesia || "");
    setObservacoes(imovel.observacoes || "");
    const estacionamentoValue =
      imovel.estacionamento === false || imovel.estacionamento === null || imovel.estacionamento === undefined
        ? ""
        : String(imovel.estacionamento);
    setEstacionamento(estacionamentoValue);
    setCmi(Boolean(imovel.cmi));
    setCadernetaPredial(Boolean(imovel.caderneta_predial));
    setPlantas(Boolean(imovel.plantas));
    setCertificadoEnergetico(Boolean(imovel.certificado_energetico));
    setCartaoCidadao(Boolean(imovel.cartao_cidadao));
  }

  function resetFormulario() {
    setImovelEdicao(null);
    setProprietario("");
    setTelefone("");
    setTelefoneErro("");
    setTipologia("");
    setZona("");
    setValorPretendido("");
    setValorVenda("");
    setValorM2("");
    setAreaBrutaPrivativa("");
    setAreaUtil("");
    setNumeroQuartos("");
    setCasasBanho("");
    setPrecoCondominio("");
    setEmail("");
    setCodigoPostal("");
    setMorada("");
    setDistrito("");
    setConcelho("");
    setFreguesia("");
    setObservacoes("");
    setEstacionamento("");
    setCmi(false);
    setCadernetaPredial(false);
    setPlantas(false);
    setCertificadoEnergetico(false);
    setCartaoCidadao(false);
  }

  // Helper: convert empty or non-numeric values to null for numeric DB columns
  function toNumberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  function cancelarNovo() {
    setModuloAtual("lista");
    resetFormulario();
  }

  function handleTelefoneChange(valor) {
    const telefoneNormalizado = normalizarTelefone(valor);
    setTelefone(telefoneNormalizado);

    if (!telefoneNormalizado) {
      setTelefoneErro("");
      return;
    }

    setTelefoneErro(
      validarTelefone(telefoneNormalizado)
        ? ""
        : "Informe o telefone com 12 dígitos (indicativo + 9 dígitos)."
    );
  }
  //////////////////////////////////////////////////////
  // SALVAR

  async function salvarImovel() {
    const telefoneNormalizado = normalizarTelefone(telefone);
    if (!validarTelefone(telefoneNormalizado)) {
      setTelefoneErro("Informe o telefone com 12 dígitos (indicativo + 9 dígitos).\n");
      alert("Informe o telefone com 12 dígitos (indicativo + 9 dígitos).\n");
      return;
    }

    const payload = {
      proprietario,
      telefone: telefoneNormalizado,
      tipologia,
      zona,
      valor_pretendido: toNumberOrNull(valorPretendido),
      valor_venda: toNumberOrNull(valorVenda),
      valor_m2: toNumberOrNull(valorM2),
      area_bruta_privativa: toNumberOrNull(areaBrutaPrivativa),
      area_util: toNumberOrNull(areaUtil),
      numero_quartos: toNumberOrNull(numeroQuartos),
      casas_banho: toNumberOrNull(casasBanho),
      preco_condominio: toNumberOrNull(precoCondominio),
      email: email || null,
      codigo_postal: codigoPostal || null,
      morada: morada || null,
      distrito: distrito || null,
      concelho: concelho || null,
      freguesia: freguesia || null,
      observacoes: observacoes || null,
      estacionamento: toNumberOrNull(estacionamento),
      cmi,
      caderneta_predial: cadernetaPredial,
      plantas,
      certificado_energetico: certificadoEnergetico,
      cartao_cidadao: cartaoCidadao
    };

    let error = null;

    if (isEditing && imovelEdicao) {
      const response = await supabase
        .from("estoque_nao_publicitado")
        .update(payload)
        .eq("id", imovelEdicao.id);
      error = response.error;
    } else {
      const response = await supabase
        .from("estoque_nao_publicitado")
        .insert([payload]);
      error = response.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    alert(isEditing ? "Imóvel atualizado!" : "Imóvel guardado!");

    resetFormulario();

    setModuloAtual("lista");
    setImovelSelecionado(null);

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
    <div style={pageContainer}>
      <div style={pageHeader}>
        <div>
          <h2 style={pageTitle}>🏡 Estoque Não Publicitado</h2>
          <p style={pageSubtitle}>Gestão de imóveis cadastrados fora do portal.</p>
        </div>
        <button
          style={btnNovo}
          onClick={() => {
            resetFormulario();
            setModuloAtual("cadastro");
          }}
        >
          + Novo imóvel
        </button>
      </div>

      <div style={submenuEstoque}>
        <button
          style={moduloAtual === "lista" ? btnSubmenuAtivo : btnSubmenu}
          onClick={() => setModuloAtual("lista")}
        >
          📋 Lista
        </button>

        <button
          style={moduloAtual === "cadastro" ? btnSubmenuAtivo : btnSubmenu}
          onClick={() => setModuloAtual("cadastro")}
        >
          ➕ Novo cadastro
        </button>
      </div>

      {moduloAtual === "cadastro" ? (
        <div>
          <div style={barraSuperior}>
            <button style={btnVoltar} onClick={() => setModuloAtual("lista")}>
              ← Voltar para a lista
            </button>
          </div>

          <CadastroImovel
            proprietario={proprietario}
            setProprietario={setProprietario}
            telefone={telefone}
            setTelefone={setTelefone}
            telefoneErro={telefoneErro}
            handleTelefoneChange={handleTelefoneChange}
            email={email}
            setEmail={setEmail}
            observacoes={observacoes}
            setObservacoes={setObservacoes}
            valorPretendido={valorPretendido}
            setValorPretendido={setValorPretendido}
            valorVenda={valorVenda}
            setValorVenda={setValorVenda}
            precoCondominio={precoCondominio}
            setPrecoCondominio={setPrecoCondominio}
            areaBrutaPrivativa={areaBrutaPrivativa}
            setAreaBrutaPrivativa={setAreaBrutaPrivativa}
            areaUtil={areaUtil}
            setAreaUtil={setAreaUtil}
            valorM2={valorM2}
            tipologia={tipologia}
            setTipologia={setTipologia}
            numeroQuartos={numeroQuartos}
            setNumeroQuartos={setNumeroQuartos}
            casasBanho={casasBanho}
            setCasasBanho={setCasasBanho}
            zona={zona}
            setZona={setZona}
            codigoPostal={codigoPostal}
            setCodigoPostal={setCodigoPostal}
            distrito={distrito}
            setDistrito={setDistrito}
            concelho={concelho}
            setConcelho={setConcelho}
            freguesia={freguesia}
            setFreguesia={setFreguesia}
            morada={morada}
            setMorada={setMorada}
            cmi={cmi}
            setCmi={setCmi}
            cadernetaPredial={cadernetaPredial}
            setCadernetaPredial={setCadernetaPredial}
            plantas={plantas}
            setPlantas={setPlantas}
            certificadoEnergetico={certificadoEnergetico}
            setCertificadoEnergetico={setCertificadoEnergetico}
            cartaoCidadao={cartaoCidadao}
            setCartaoCidadao={setCartaoCidadao}
            estacionamento={estacionamento}
            setEstacionamento={setEstacionamento}
            isEditing={isEditing}
            salvarImovel={salvarImovel}
            cancelar={cancelarNovo}
          />
        </div>
      ) : (
        <div>
          <div style={barraSuperior}>
            <input
              style={input}
              placeholder="Pesquisar proprietário..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {imovelSelecionado && (
            <FichaImovel
              imovel={imovelSelecionado}
              ficheiros={ficheiros}
              file={file}
              setFile={setFile}
              uploading={uploading}
              progresso={progresso}
              onUpload={uploadFicheiro}
              onDownload={downloadFicheiro}
              onDelete={apagarFicheiro}
              onSelectFicheiro={(f) => setFicheiroSelecionado(f)}
              ficheiroSelecionado={ficheiroSelecionado}
              setFicheiroSelecionado={setFicheiroSelecionado}
              setImovelSelecionado={setImovelSelecionado}
              cmi={cmi}
              setCmi={setCmi}
              cadernetaPredial={cadernetaPredial}
              setCadernetaPredial={setCadernetaPredial}
              plantas={plantas}
              setPlantas={setPlantas}
              certificadoEnergetico={certificadoEnergetico}
              setCertificadoEnergetico={setCertificadoEnergetico}
              cartaoCidadao={cartaoCidadao}
              setCartaoCidadao={setCartaoCidadao}
              estacionamento={estacionamento}
              setEstacionamento={setEstacionamento}
              onEditar={() => {
                carregarImovelParaEdicao(imovelSelecionado);
                setModuloAtual("cadastro");
              }}
            />
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
                      setImovelSelecionado(imovel);
                      carregarFicheiros(imovel.id);
                    }}
                  >
                    <td style={tdNome}>{imovel.proprietario}</td>
                    <td style={td}>{imovel.telefone}</td>
                    <td style={td}>{imovel.tipologia}</td>
                    <td style={td}>{imovel.zona}</td>
                    <td style={td}>{imovel.valor_pretendido} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}



//////////////////////////////////////////////////////
// ESTILOS

const pageContainer = {
  display: "flex",
  flexDirection: "column",
  gap: "16px"
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap"
};

const pageTitle = {
  margin: 0,
  fontSize: "1.6rem"
};

const pageSubtitle = {
  margin: "4px 0 0",
  color: "#64748b"
};

const barraSuperior = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px"
};

const submenuEstoque = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px"
};

const btnSubmenu = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  background: "white",
  cursor: "pointer"
};

const btnSubmenuAtivo = {
  ...btnSubmenu,
  background: "#2563eb",
  color: "white",
  borderColor: "#2563eb"
};

const btnVoltar = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: "600",
  boxShadow: "0 1px 2px rgba(15,23,42,0.05)"
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