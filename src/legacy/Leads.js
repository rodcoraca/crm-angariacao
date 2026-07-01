import { useEffect, useState } from "react";
import LeadsPorTipo from "./LeadsPorTipo";

export default function Leads() {

  const [tipo, setTipo] = useState("quente");

  useEffect(() => {
    const tipoGuardado = localStorage.getItem("tipoSelecionado");

    if (tipoGuardado) {
      setTipo(tipoGuardado);
      localStorage.removeItem("tipoSelecionado");
    }
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <LeadsPorTipo tipo={tipo} />
    </div>
  );
}