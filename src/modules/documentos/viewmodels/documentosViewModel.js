export function mapDocumentosParaLista(documentos) {
  return (documentos || []).map((item) => ({
    ...item,
    nome: item?.nome || "",
    categoria: item?.categoria || "",
    descricao: item?.descricao || "",
    arquivo_url: item?.arquivo_url || "",
    arquivo_nome: item?.arquivo_nome || ""
  }));
}
