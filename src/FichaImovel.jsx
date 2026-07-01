import React from "react";
import UploadDocumentos from "./UploadDocumentos";
import GaleriaFotos from "./GaleriaFotos";
import ListaDocumentos from "./ListaDocumentos";
import ChecklistDocumentos from "./ChecklistDocumentos";
import { useTheme } from "./theme/ThemeContext";

export default function FichaImovel(props) {
  const theme = useTheme();
  const {
    imovel,
    ficheiros,
    file,
    setFile,
    uploading,
    progresso,
    onUpload,
    onDownload,
    onDelete,
    onSelectFicheiro,
    ficheiroSelecionado,
    setFicheiroSelecionado,
    setImovelSelecionado,
    cmi,
    setCmi,
    cadernetaPredial,
    setCadernetaPredial,
    plantas,
    setPlantas,
    certificadoEnergetico,
    setCertificadoEnergetico,
    cartaoCidadao,
    setCartaoCidadao,
    estacionamento,
    setEstacionamento,
    onEditar
  } = props;

  if (!imovel) return null;

  return (
    <div style={{ background: theme.colors.surface, padding: 20, borderRadius: 12, marginBottom: 20, boxShadow: theme.shadow.md, border: `1px solid ${theme.colors.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, gap: 10, alignItems: 'center' }}>
        <strong>{imovel.proprietario}</strong>
        <div>
          <button style={{ marginRight: 10, padding: 8, borderRadius: 8, border: `1px solid ${theme.colors.border}`, background: theme.colors.surfaceSoft, color: theme.colors.text, cursor: "pointer" }} onClick={onEditar}>✎ Editar</button>
          <button style={{ border: "none", background: "transparent", cursor: "pointer" }} onClick={() => setImovelSelecionado(null)}>✖</button>
        </div>
      </div>

      <p><strong>Telefone:</strong> {imovel.telefone}</p>
      <p><strong>Tipologia:</strong> {imovel.tipologia}</p>
      <p><strong>Zona:</strong> {imovel.zona}</p>
      <p><strong>Estacionamento:</strong> {imovel.estacionamento ? `${imovel.estacionamento} vaga(s)` : "Sem vaga"}</p>
      <p><strong>Valor:</strong> {imovel.valor_pretendido} €</p>

      {imovel.observacoes && <div style={{ marginTop: 10, padding: 10, background: `${theme.colors.accent}22`, borderRadius: 8, color: theme.colors.text }}>📝 {imovel.observacoes}</div>}

      <h3 style={{ marginTop: 20 }}>Upload ( Documentos e Imagens)</h3>

      <UploadDocumentos file={file} setFile={setFile} onUpload={() => onUpload(imovel.id)} uploading={uploading} progresso={progresso} />

      <hr />

      <GaleriaFotos ficheiros={ficheiros} onDownload={onDownload} onDelete={onDelete} />

      {ficheiroSelecionado?.tipo === "pdf" && (
        <div style={{ marginTop: 20, padding: 10, background: theme.colors.surfaceSoft, borderRadius: 8, border: `1px solid ${theme.colors.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong>{ficheiroSelecionado.nome}</strong>
            <button style={{ border: "none", background: "transparent", cursor: "pointer" }} onClick={() => setFicheiroSelecionado(null)}>✖</button>
          </div>
          <iframe title="pdf" src={ficheiroSelecionado.url} width="100%" height="700" />
        </div>
      )}

      <ListaDocumentos ficheiros={ficheiros} onSelect={onSelectFicheiro} onDownload={onDownload} onDelete={onDelete} />

      <ChecklistDocumentos
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
      />
    </div>
  );
}
