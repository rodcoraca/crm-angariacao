import React from "react";
import { useTheme } from "./theme/ThemeContext";
import Card from "./components/Card";
import Input from "./Input";
import Button from "./components/Button";

export default function CadastroImovel(props) {
  const theme = useTheme();
  const {
    proprietario,
    setProprietario,
    telefone,
    setTelefone,
    telefoneErro,
    handleTelefoneChange,
    email,
    setEmail,
    observacoes,
    setObservacoes,
    valorPretendido,
    setValorPretendido,
    valorVenda,
    setValorVenda,
    precoCondominio,
    setPrecoCondominio,
    areaBrutaPrivativa,
    setAreaBrutaPrivativa,
    areaUtil,
    setAreaUtil,
    valorM2,
    tipologia,
    setTipologia,
    numeroQuartos,
    setNumeroQuartos,
    casasBanho,
    setCasasBanho,
    zona,
    setZona,
    codigoPostal,
    setCodigoPostal,
    distrito,
    setDistrito,
    concelho,
    setConcelho,
    freguesia,
    setFreguesia,
    morada,
    setMorada,
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
    isEditing,
    salvarImovel,
    cancelar
  } = props;

  const styles = {
    card: {
      display: "grid",
      gap: theme.spacing.lg,
      background: theme.colors.surface,
      color: theme.colors.text,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      boxShadow: theme.shadow.md
    },
    title: {
      margin: 0,
      fontSize: "1.35rem",
      color: theme.colors.text
    },
    sectionTitle: {
      margin: 0,
      marginBottom: theme.spacing.sm,
      fontSize: "1rem",
      color: theme.colors.text
    },
    sectionContent: {
      display: "grid",
      gap: theme.spacing.md
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: theme.spacing.md
    },
    grid3: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: theme.spacing.md
    },
    grid5: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr 1fr 1.5fr 1.5fr",
      gap: theme.spacing.md,
      alignItems: "center"
    },
    checkboxRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    checkboxLabel: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.xs,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      background: theme.colors.surfaceSoft,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.md,
      cursor: "pointer"
    },
    textarea: {
      minHeight: "120px"
    },
    buttonRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: "0.95rem"
    },
    select: {
      width: "100%",
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${theme.colors.border}`,
      background: theme.colors.inputBackground,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.fontSize,
      boxSizing: "border-box"
    }
  };

  return (
    <Card style={styles.card}>
      <div>
        <h3 style={styles.title}>Novo Imóvel</h3>
      </div>

      <section>
        <h4 style={styles.sectionTitle}>👤 Proprietário</h4>
        <div style={styles.sectionContent}>
          <Input placeholder="Nome do Proprietário" value={proprietario} onChange={(e) => setProprietario(e.target.value)} />
          <div style={styles.grid2}>
            <div>
              <Input
                placeholder="Telefone"
                value={telefone}
                onChange={(e) => handleTelefoneChange(e.target.value)}
                maxLength={12}
                inputMode="numeric"
              />
              {telefoneErro && <div style={styles.errorText}>{telefoneErro}</div>}
            </div>

            <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Input
            as="textarea"
            style={styles.textarea}
            placeholder="Observações"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>
      </section>

      <section>
        <h4 style={styles.sectionTitle}>💰 Comercialização</h4>
        <div style={styles.grid3}>
          <Input placeholder="Valor Pretendido (€)" value={valorPretendido} onChange={(e) => setValorPretendido(e.target.value)} />
          <Input placeholder="Valor Venda (€)" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} />
          <Input placeholder="Condomínio (€)" value={precoCondominio} onChange={(e) => setPrecoCondominio(e.target.value)} />
        </div>
      </section>

      <section>
        <h4 style={styles.sectionTitle}>📐 Áreas</h4>
        <div style={styles.grid3}>
          <Input placeholder="Área Bruta Privativa" value={areaBrutaPrivativa} onChange={(e) => setAreaBrutaPrivativa(e.target.value)} />
          <Input placeholder="Área Útil" value={areaUtil} onChange={(e) => setAreaUtil(e.target.value)} />
          <Input placeholder="Valor / m²" value={valorM2} onChange={() => {}} disabled />
        </div>
      </section>

      <section>
        <h4 style={styles.sectionTitle}>🏡 Características</h4>
        <div style={styles.grid5}>
          <Input placeholder="Tipologia" value={tipologia} onChange={(e) => setTipologia(e.target.value)} />
          <Input placeholder="Quartos" value={numeroQuartos} onChange={(e) => setNumeroQuartos(e.target.value)} />
          <Input placeholder="Casas de Banho" value={casasBanho} onChange={(e) => setCasasBanho(e.target.value)} />
          <Input placeholder="Zona" value={zona} onChange={(e) => setZona(e.target.value)} />
          <select style={styles.select} value={estacionamento} onChange={(e) => setEstacionamento(e.target.value)}>
            <option value="">Sem vaga</option>
            <option value="1">1 vaga</option>
            <option value="2">2 vagas</option>
            <option value="3">3 vagas</option>
            <option value="4">4 vagas</option>
          </select>
        </div>
      </section>

      <section>
        <h4 style={styles.sectionTitle}>📍 Localização</h4>
        <div style={styles.sectionContent}>
          <div style={styles.grid2}>
            <Input placeholder="Código Postal" value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} />
            <Input placeholder="Distrito" value={distrito} onChange={(e) => setDistrito(e.target.value)} />
          </div>
          <div style={styles.grid2}>
            <Input placeholder="Concelho" value={concelho} onChange={(e) => setConcelho(e.target.value)} />
            <Input placeholder="Freguesia" value={freguesia} onChange={(e) => setFreguesia(e.target.value)} />
          </div>
          <Input placeholder="Morada" value={morada} onChange={(e) => setMorada(e.target.value)} />
        </div>
      </section>

      <section>
        <h4 style={styles.sectionTitle}>📋 Documentação</h4>
        <div style={styles.checkboxRow}>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={cmi} onChange={(e) => setCmi(e.target.checked)} />
            CMI
          </label>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={cadernetaPredial} onChange={(e) => setCadernetaPredial(e.target.checked)} />
            Caderneta Predial
          </label>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={plantas} onChange={(e) => setPlantas(e.target.checked)} />
            Plantas
          </label>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={certificadoEnergetico} onChange={(e) => setCertificadoEnergetico(e.target.checked)} />
            Certificado Energético
          </label>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={cartaoCidadao} onChange={(e) => setCartaoCidadao(e.target.checked)} />
            Cartão de Cidadão
          </label>
        </div>
      </section>

      <div style={styles.buttonRow}>
        <Button color="success" onClick={salvarImovel}>
          {isEditing ? "Atualizar" : "Guardar"}
        </Button>
        <Button color="light" onClick={cancelar}>
          ↩️ Cancelar
        </Button>
      </div>
    </Card>
  );
}
