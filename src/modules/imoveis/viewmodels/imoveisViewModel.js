export function filtrarImoveisPorProprietario(imoveis, busca) {
  const termo = (busca || "").toLowerCase();
  return (imoveis || []).filter((imovel) =>
    imovel.proprietario?.toLowerCase().includes(termo)
  );
}
