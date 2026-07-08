import CadastroImovel from "./CadastroImovel";
import FichaImovel from "./FichaImovel";
import { useEstoqueImoveis } from "./modules/imoveis";
import EmptyState from "./components/ui/EmptyState";

export default function EstoqueNaoPublicitado() {
  const {
    busca,
    moduloAtual,
    form,
    imovelSelecionado,
    file,
    ficheiros,
    ficheiroSelecionado,
    uploading,
    progresso,
    isEditing,
    filtrados,
    setBusca,
    setModuloAtual,
    setField,
    setFile,
    setFicheiroSelecionado,
    setImovelSelecionado,
    abrirNovoCadastro,
    voltarParaLista,
    iniciarEdicaoSelecionado,
    cancelarNovo,
    handleTelefoneChange,
    salvarImovel,
    apagarFicheiro,
    uploadFicheiro,
    downloadFicheiro,
    selecionarImovel
  } = useEstoqueImoveis();

  const {
    proprietario,
    telefone,
    telefoneErro,
    tipologia,
    zona,
    valorPretendido,
    observacoes,
    email,
    valorVenda,
    valorM2,
    areaBrutaPrivativa,
    areaUtil,
    numeroQuartos,
    casasBanho,
    estacionamento,
    precoCondominio,
    codigoPostal,
    morada,
    distrito,
    concelho,
    freguesia,
    cmi,
    cadernetaPredial,
    plantas,
    certificadoEnergetico,
    cartaoCidadao
  } = form;


  return (
    <div style={pageContainer}>
      <div style={pageHeader}>
        <div>
          <h2 style={pageTitle}>🏡 Estoque Não Publicitado</h2>
          <p style={pageSubtitle}>Gestão de imóveis cadastrados fora do portal.</p>
        </div>
        <button
          style={btnNovo}
          onClick={abrirNovoCadastro}
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
            <button style={btnVoltar} onClick={voltarParaLista}>
              ← Voltar para a lista
            </button>
          </div>

          <CadastroImovel
            proprietario={proprietario}
            setProprietario={(valor) => setField("proprietario", valor)}
            telefone={telefone}
            setTelefone={(valor) => setField("telefone", valor)}
            telefoneErro={telefoneErro}
            handleTelefoneChange={handleTelefoneChange}
            email={email}
            setEmail={(valor) => setField("email", valor)}
            observacoes={observacoes}
            setObservacoes={(valor) => setField("observacoes", valor)}
            valorPretendido={valorPretendido}
            setValorPretendido={(valor) => setField("valorPretendido", valor)}
            valorVenda={valorVenda}
            setValorVenda={(valor) => setField("valorVenda", valor)}
            precoCondominio={precoCondominio}
            setPrecoCondominio={(valor) => setField("precoCondominio", valor)}
            areaBrutaPrivativa={areaBrutaPrivativa}
            setAreaBrutaPrivativa={(valor) => setField("areaBrutaPrivativa", valor)}
            areaUtil={areaUtil}
            setAreaUtil={(valor) => setField("areaUtil", valor)}
            valorM2={valorM2}
            tipologia={tipologia}
            setTipologia={(valor) => setField("tipologia", valor)}
            numeroQuartos={numeroQuartos}
            setNumeroQuartos={(valor) => setField("numeroQuartos", valor)}
            casasBanho={casasBanho}
            setCasasBanho={(valor) => setField("casasBanho", valor)}
            zona={zona}
            setZona={(valor) => setField("zona", valor)}
            codigoPostal={codigoPostal}
            setCodigoPostal={(valor) => setField("codigoPostal", valor)}
            distrito={distrito}
            setDistrito={(valor) => setField("distrito", valor)}
            concelho={concelho}
            setConcelho={(valor) => setField("concelho", valor)}
            freguesia={freguesia}
            setFreguesia={(valor) => setField("freguesia", valor)}
            morada={morada}
            setMorada={(valor) => setField("morada", valor)}
            cmi={cmi}
            setCmi={(valor) => setField("cmi", valor)}
            cadernetaPredial={cadernetaPredial}
            setCadernetaPredial={(valor) => setField("cadernetaPredial", valor)}
            plantas={plantas}
            setPlantas={(valor) => setField("plantas", valor)}
            certificadoEnergetico={certificadoEnergetico}
            setCertificadoEnergetico={(valor) => setField("certificadoEnergetico", valor)}
            cartaoCidadao={cartaoCidadao}
            setCartaoCidadao={(valor) => setField("cartaoCidadao", valor)}
            estacionamento={estacionamento}
            setEstacionamento={(valor) => setField("estacionamento", valor)}
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
              setCmi={(valor) => setField("cmi", valor)}
              cadernetaPredial={cadernetaPredial}
              setCadernetaPredial={(valor) => setField("cadernetaPredial", valor)}
              plantas={plantas}
              setPlantas={(valor) => setField("plantas", valor)}
              certificadoEnergetico={certificadoEnergetico}
              setCertificadoEnergetico={(valor) => setField("certificadoEnergetico", valor)}
              cartaoCidadao={cartaoCidadao}
              setCartaoCidadao={(valor) => setField("cartaoCidadao", valor)}
              estacionamento={estacionamento}
              setEstacionamento={(valor) => setField("estacionamento", valor)}
              onEditar={iniciarEdicaoSelecionado}
            />
          )}

          <div style={tableWrapper}>
            {filtrados.length === 0 ? (
              <div style={{ padding: "16px" }}>
                <EmptyState
                  title="Sem imóveis"
                  description="Não existem imóveis para os filtros aplicados."
                />
              </div>
            ) : (
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
                      onClick={() => selecionarImovel(imovel)}
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
            )}
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
  color: "var(--os-color-muted)"
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
  border: "1px solid var(--os-color-border)",
  background: "white",
  cursor: "pointer"
};

const btnSubmenuAtivo = {
  ...btnSubmenu,
  background: "var(--os-status-info-text)",
  color: "white",
  borderColor: "var(--os-status-info-text)"
};

const btnVoltar = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)",
  background: "var(--os-color-surface-soft)",
  color: "var(--os-color-text)",
  cursor: "pointer",
  fontWeight: "600",
  boxShadow: "0 1px 2px rgba(15,23,42,0.05)"
};

const input = {
  flex: 1,
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)"
};

const inputForm = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)",
  boxSizing: "border-box"
};

const textarea = {
  width: "100%",
  height: "100px",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid var(--os-color-border)",
  boxSizing: "border-box"
};

const btnNovo = {
  background: "var(--os-status-info-text)",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: "8px",
  cursor: "pointer"
};

const btnGuardar = {
  flex: 1,
  background: "var(--os-color-secondary)",
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
  background: "var(--os-color-surface-soft)"
};

const tr = {
  borderBottom: "1px solid var(--os-color-border)"
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
  background: "var(--os-status-warning-surface)",
  borderRadius: "8px"
};

const acoesForm = {
  display: "flex",
  gap: "10px",
  marginTop: "10px"
};

const btnCancelar = {
  flex: 1,
  background: "var(--os-color-muted)",
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
  borderBottom: "1px solid var(--os-color-border)"
};

const previewBox = {
  marginTop: "20px",
  padding: "10px",
  background: "var(--os-color-surface-soft)",
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
  color: "var(--os-color-text)"
};

const barraExterna = {
  width: "100%",
  height: "12px",
  background: "var(--os-color-border)",
  borderRadius: "999px",
  overflow: "hidden"
};

const barraInterna = {
  height: "100%",
  background: "var(--os-color-secondary)",
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
  border: "1px solid var(--os-color-border)"
};

const btnDeleteImagem = {
  position: "absolute",
  top: "5px",
  right: "5px",

  background: "var(--os-color-danger)",
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
  color: "var(--os-color-muted)",

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
  border: "1px solid var(--os-color-border)",
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

  background: "var(--os-color-surface-soft)",

  border: "1px solid var(--os-color-border)",

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

