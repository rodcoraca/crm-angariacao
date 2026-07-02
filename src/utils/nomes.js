export function formatarNomeApresentacao(nomeCompleto) {
  if (!nomeCompleto) return "";

  let base = String(nomeCompleto).trim().replace(/\s+/g, " ");

  if (!base) return "";

  // Fallback amigavel quando o valor for email.
  if (base.includes("@") && !base.includes(" ")) {
    base = base.split("@")[0].replace(/[._-]+/g, " ").trim();
  }

  const partes = base.split(" ").filter(Boolean);

  if (partes.length === 0) return "";
  if (partes.length === 1) return capitalizarPalavra(partes[0]);

  return `${capitalizarPalavra(partes[0])} ${capitalizarPalavra(partes[partes.length - 1])}`;
}

function capitalizarPalavra(palavra) {
  if (!palavra) return "";
  const normalizada = palavra.toLocaleLowerCase("pt-PT");
  return normalizada.charAt(0).toLocaleUpperCase("pt-PT") + normalizada.slice(1);
}
