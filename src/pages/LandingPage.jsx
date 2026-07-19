import { useEffect, useMemo, useState } from "react";
import logo from "../assets/logo.png";
import heroImage from "../assets/landing/osflow-hero-real.png";
import crmShot from "../assets/landing/osflow-shot-crm.png";
import imoveisShot from "../assets/landing/osflow-shot-imoveis.png";
import documentosShot from "../assets/landing/osflow-shot-utilizadores.png";
import ecosystemImage from "../assets/landing/osflow-ecosystem.png";
import "./LandingPage.css";

const heroBadgeItems = [
  "CRM",
  "Leads",
  "Imóveis",
  "Documentos",
  "Inteligência Comercial",
];

const heroChecks = [
  "Operação centralizada",
  "Mais produtividade",
  "Mais controlo",
  "Mais negócio",
];

const painPoints = [
  "Informação dispersa",
  "Demasiadas ferramentas",
  "Processos manuais",
  "Falta de controlo",
];

const solutionPoints = [
  "Tudo centralizado",
  "Equipa alinhada",
  "Mais produtividade",
  "Mais vendas",
];

const moduleCards = [
  {
    id: "crm-comercial",
    title: "CRM Comercial",
    description: "Nunca perca uma oportunidade.",
    icon: "crm",
  },
  {
    id: "cockpit-executivo",
    title: "Cockpit Executivo",
    description: "Saiba exatamente o que está a acontecer.",
    icon: "dashboard",
  },
  {
    id: "gestao-imoveis",
    title: "Gestão de Imóveis",
    description: "Toda a carteira centralizada.",
    icon: "building",
  },
  {
    id: "gestao-utilizadores",
    title: "Gestão de Utilizadores",
    description: "Dados organizados e rastreáveis.",
    icon: "crm",
  },
  /*{
    id: "seguranca",
    title: "Segurança",
    description: "Controlo e confiança.",
    icon: "spark",
  },*/
];

const productShots = [
  {
    id: "crm-shot",
    title: "CRM Comercial",
    subtitle: "Pipeline, tarefas e execução comercial num único fluxo.",
    image: crmShot,
  },
  {
    id: "imoveis-shot",
    title: "Gestão de Imóveis",
    subtitle: "Carteira, estado e detalhe operacional com contexto total.",
    image: imoveisShot,
  },
  {
    id: "documentos-shot",
    title: "Gestão Ulizadores",
    subtitle: "Checklist e rastreabilidade documental orientada à operação.",
    image: documentosShot,
  },
];

const impactCards = [
  "Mais produtividade",
  "Mais organização",
  "Mais controlo",
  "Mais vendas",
  "Mais eficiência operacional",
];

const keywords =
  "CRM imobiliário, software imobiliário, gestão de imóveis, CRM Portugal, CRM para imobiliárias, PropTech, sistema imobiliário, OSFlow";

const initialContactForm = {
  nome: "",
  empresa: "",
  telefone: "",
  email: "",
  numeroConsultores: "",
  origem: "website",
};

const APP_URL =
  process.env.NODE_ENV === "production"
    ? "https://app.osflow.pt"
    : "http://localhost:3000";

function upsertMeta(name, content, isProperty = false) {
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let meta = document.head.querySelector(selector);

  if (!meta) {
    meta = document.createElement("meta");
    if (isProperty) {
      meta.setAttribute("property", name);
    } else {
      meta.setAttribute("name", name);
    }
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let link = document.head.querySelector(`link[rel="${rel}"]`);

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
}

function SectionTitle({ eyebrow, title, subtitle, className = "" }) {
  return (
    <div className={`lp-section-title ${className}`.trim()}>
      {eyebrow ? <span className="lp-eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

function ValueCardIcon({ icon }) {
  const iconStyle = { width: "22px", height: "22px", color: "var(--os-color-primary)" };

  if (icon === "building") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={iconStyle}>
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 8H9.01M12 8H12.01M15 8H15.01M9 12H9.01M12 12H12.01M15 12H15.01M11 21V17H13V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={iconStyle}>
        <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 15L10 12L12.5 14.5L17 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "spark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={iconStyle}>
        <path d="M12 3L14.6 8.4L20 11L14.6 13.6L12 19L9.4 13.6L4 11L9.4 8.4L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={iconStyle}>
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 9H17M7 13H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingPage() {
  const [contactForm, setContactForm] = useState(initialContactForm);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  function smoothScrollTo(id) {
    const section = document.getElementById(id);
    if (!section) return;

    const offsetTop = section.getBoundingClientRect().top + window.scrollY - 92;
    window.scrollTo({ top: offsetTop, behavior: "smooth" });
  }

  useEffect(() => {
    const title = "OSFlow | CRM Imobiliário e Sistema Operacional Comercial";
    const description =
      "A OSFlow reúne CRM, gestão de imóveis, documentos, produtividade e inteligência comercial numa plataforma imobiliária moderna para equipas em Portugal.";

    document.title = title;

    upsertMeta("description", description);
    upsertMeta("keywords", keywords);
    upsertMeta("robots", "index, follow");

    upsertMeta("og:type", "website", true);
    upsertMeta("og:site_name", "OSFlow", true);
    upsertMeta("og:title", title, true);
    upsertMeta("og:description", description, true);
    upsertMeta("og:url", "https://osflow.pt", true);
    //upsertMeta("og:image", "https://osflow.pt/logo512.png", true);

    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", description);
    //upsertMeta("twitter:image", "https://osflow.pt/logo512.png");

    upsertLink("canonical", "https://osflow.pt");
  }, []);

  const validationState = useMemo(() => {
    const phoneRegex = /^(?:\+351)?\s?9\d{8}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedPhone = contactForm.telefone.replace(/\s/g, "");
    const numeroConsultores = contactForm.numeroConsultores.trim();
    const numeroConsultoresValido =
      /^\d+$/.test(numeroConsultores) && Number(numeroConsultores) >= 1 && Number(numeroConsultores) <= 9999;

    return {
      nome: contactForm.nome.trim() ? "" : "Introduza o seu nome.",
      empresa: contactForm.empresa.trim() ? "" : "Introduza o nome da empresa.",
      telefone: phoneRegex.test(normalizedPhone) ? "" : "Introduza um número de telefone válido.",
      email: emailRegex.test(contactForm.email.trim()) ? "" : "Introduza um email válido.",
      numeroConsultores: numeroConsultoresValido ? "" : "Introduza um número válido.",
    };
  }, [contactForm]);

  const hasValidationErrors = Object.values(validationState).some(Boolean);
  const hasVisibleValidationErrors = Object.entries(validationState).some(
    ([field, message]) => Boolean(message && (submitAttempted || touchedFields[field]))
  );

  function formatPhoneNumber(value) {
    const hasCountryCode = /^\s*\+351/.test(value);
    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("351")) {
      digits = digits.slice(3);
    }

    digits = digits.slice(0, 9);

    if (!digits) return hasCountryCode ? "+351 " : "";

    const phoneGroups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
    return `+351 ${phoneGroups.join(" ")}`.trim();
  }

  function updateContactField(field, value) {
    const nextValue = field === "telefone" ? formatPhoneNumber(value) : value;
    setTouchedFields((current) => ({ ...current, [field]: true }));
    setContactForm((current) => ({ ...current, [field]: nextValue }));
  }

  function updateConsultoresField(value) {
    setTouchedFields((current) => ({ ...current, numeroConsultores: true }));
    setContactForm((current) => ({ ...current, numeroConsultores: value.replace(/\D/g, "").slice(0, 4) }));
  }

  function getFieldError(field) {
    if (!submitAttempted && !touchedFields[field]) return "";
    return validationState[field];
  }

  function handleContactSubmit(event) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (hasValidationErrors) return;

    setIsSubmittingContact(true);

    // Interface pronta para integração futura de envio.
    window.setTimeout(() => {
      setContactForm(initialContactForm);
      setTouchedFields({});
      setSubmitAttempted(false);
      setIsSubmittingContact(false);
    }, 350);
  }

  const baseInputStyle = {
    width: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(14, 77, 100, 0.2)",
    background: "var(--os-color-surface)",
    padding: "11px 12px",
    fontSize: "16px",
    color: "var(--os-color-text)",
  };

  const errorInputStyle = {
    border: "1px solid var(--os-color-accent)",
    boxShadow: "0 0 0 3px rgba(249, 115, 22, 0.18)",
  };

  return (
    <div className="lp-root">
      <div className="lp-bg lp-bg-top" aria-hidden="true" />
      <div className="lp-bg lp-bg-grid" aria-hidden="true" />

      <header className="lp-nav-wrap">
        <div className="lp-container lp-nav-inner">
          <a
            href="#top"
            onClick={(event) => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="lp-nav-brand"
            aria-label="Voltar ao topo"
          >
            <img src={logo} alt="OSFlow" className="lp-nav-brand-logo" />
          </a>

          <nav aria-label="Menu principal" className="lp-nav-links">
            <a
              href="#modulos"
              onClick={(event) => {
                event.preventDefault();
                smoothScrollTo("modulos");
              }}
              className="lp-nav-link"
            >
              Módulos
            </a>
            <a
              href="#demonstracao"
              onClick={(event) => {
                event.preventDefault();
                smoothScrollTo("demonstracao");
              }}
              className="lp-nav-link"
            >
              Demonstração
            </a>
            <a
              href="#contacto"
              onClick={(event) => {
                event.preventDefault();
                smoothScrollTo("contacto");
              }}
              className="lp-nav-link"
            >
              Contacto
            </a>
            <a href={APP_URL} className="lp-nav-cta">
              Entrar no CRM
            </a>
          </nav>
        </div>
      </header>

      <header className="lp-hero" id="top">
        <div className="lp-container lp-hero-inner">
          <span className="lp-hero-badge">{heroBadgeItems.join(" • ")}</span>
          <h1 className="lp-hero-title">Menos tempo a gerir.<br />Mais tempo a vender.</h1>
          <p className="lp-description lp-hero-subtitle">
            Centralize Leads, CRM, Imóveis, Documentos e Equipas numa única plataforma criada para imobiliárias modernas.
          </p>
          <ul className="lp-hero-checks" aria-label="Vantagens operacionais da OSFlow">
            {heroChecks.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>

          <div className="lp-actions">
            <button
              className="lp-btn lp-btn-primary"
              type="button"
              onClick={() => {
                smoothScrollTo("demonstracao");
              }}
            >
              Solicitar Demonstração
            </button>
            <a className="lp-btn lp-btn-ghost" href={APP_URL}>
              Entrar na Plataforma
            </a>
          </div>

          <div className="lp-hero-image-wrap">
            <img src={heroImage} alt="Vista geral da plataforma OSFlow" className="lp-hero-image" />
          </div>
        </div>
      </header>

      <main>
        <section className="lp-section" id="como-funciona">
          <div className="lp-container lp-dual-problem-solution">
            <SectionTitle
              title="A gestão imobiliária não deveria ser complicada."
              subtitle="A OSFlow foi desenhada para eliminar fricção operacional e criar previsibilidade comercial."
            />

            <div className="lp-problem-grid">
              <article className="lp-card lp-problem-card">
                <h3>Antes</h3>
                <ul>
                  {painPoints.map((item) => (
                    <li key={item}>❌ {item}</li>
                  ))}
                </ul>
              </article>

              <article className="lp-card lp-solution-card">
                <h3>Com OSFlow</h3>
                <ul>
                  {solutionPoints.map((item) => (
                    <li key={item}>✅ {item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="lp-section lp-preview-section" aria-label="Pré-visualização da plataforma OSFlow">
          <div className="lp-container">
            <SectionTitle
              eyebrow="Preview"
              title="Veja a OSFlow em ação."
              subtitle="Screens reais da plataforma para mostrar fluxo, maturidade e consistência operacional."
            />

            <div className="lp-screens-grid">
              {productShots.map((shot, index) => (
                <article key={shot.id} className="lp-screen-card" style={{ "--stagger": `${index * 70}ms` }}>
                  <img src={shot.image} alt={shot.title} className="lp-screen-image" />
                  <div className="lp-screen-content">
                    <h3>{shot.title}</h3>
                    <p>{shot.subtitle}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-section-soft" id="modulos">
          <div className="lp-container">
            <SectionTitle
              eyebrow="Módulos"
              title="Capacidades essenciais para escalar com controlo"
              subtitle="Cada módulo resolve um bloco crítico da operação comercial imobiliária."
            />

            <div className="lp-value-grid">
              {moduleCards.map((card, index) => {
                return (
                  <article key={card.id} className="lp-value-card" style={{ "--stagger": `${index * 70}ms` }}>
                    <div className="lp-value-icon-wrap">
                      <ValueCardIcon icon={card.icon} />
                    </div>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lp-section" aria-label="Ecossistema da plataforma OSFlow">
          <div className="lp-container">
            <SectionTitle
              eyebrow="Ecossistema"
              title="Uma Plataforma. Soluções Ilimitadas."
              subtitle="A operação comercial, documental e analítica ligada num sistema único de decisão."
            />

            <div className="lp-ecosystem-card">
              <img src={ecosystemImage} alt="Ecossistema de módulos integrados da OSFlow" className="lp-ecosystem-image" />
            </div>
          </div>
        </section>

        <section className="lp-section lp-section-soft">
          <div className="lp-container">
            <SectionTitle
              eyebrow="Impacto"
              title="Resultados operacionais visíveis em toda a equipa"
              subtitle="Benefícios estruturados para acelerar execução e aumentar conversão."
            />

            <div className="lp-impact-grid" aria-label="Impacto da plataforma OSFlow">
              {impactCards.map((item) => (
                <article key={item} className="lp-impact-card">
                  <h3>{item}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container">
            <SectionTitle
              eyebrow="Confiança"
              title="Desenvolvido para a realidade do mercado imobiliário português."
              subtitle="Criado por profissionais de imobiliário e tecnologia."
            />
          </div>
        </section>

        <section className="lp-section lp-section-soft" id="demonstracao">
          <div className="lp-container">
            <SectionTitle
              eyebrow="Demonstração"
              title="Peça uma demonstração personalizada"
              subtitle="Partilhe os seus dados para prepararmos uma sessão orientada ao seu contexto comercial."
            />

            <div className="lp-demo-form-wrap">
              <form onSubmit={handleContactSubmit} className="lp-demo-form" noValidate>
                <input type="hidden" name="origem" value={contactForm.origem} />

                <div className="lp-demo-row-1">
                  <label className="lp-field-label">
                    Nome
                    <input
                      type="text"
                      name="nome"
                      required
                      aria-required="true"
                      aria-invalid={getFieldError("nome") ? "true" : "false"}
                      value={contactForm.nome}
                      onChange={(event) => updateContactField("nome", event.target.value)}
                      placeholder="Nome Apelido"
                      className="lp-field-input"
                      style={{
                        ...baseInputStyle,
                        ...(getFieldError("nome") ? errorInputStyle : {}),
                      }}
                    />
                    {getFieldError("nome") ? <span className="lp-field-error">{getFieldError("nome")}</span> : null}
                  </label>

                  <label className="lp-field-label">
                    Empresa
                    <input
                      type="text"
                      name="empresa"
                      required
                      aria-required="true"
                      aria-invalid={getFieldError("empresa") ? "true" : "false"}
                      value={contactForm.empresa}
                      onChange={(event) => updateContactField("empresa", event.target.value)}
                      placeholder="Nome da Empresa"
                      className="lp-field-input"
                      style={{
                        ...baseInputStyle,
                        ...(getFieldError("empresa") ? errorInputStyle : {}),
                      }}
                    />
                    {getFieldError("empresa") ? <span className="lp-field-error">{getFieldError("empresa")}</span> : null}
                  </label>
                </div>

                <div className="lp-demo-row-2">
                  <label className="lp-field-label">
                    Telefone
                    <input
                      type="tel"
                      name="telefone"
                      required
                      aria-required="true"
                      aria-invalid={getFieldError("telefone") ? "true" : "false"}
                      value={contactForm.telefone}
                      onChange={(event) => updateContactField("telefone", event.target.value)}
                      placeholder="+351 912 345 678"
                      className="lp-field-input"
                      style={{
                        ...baseInputStyle,
                        ...(getFieldError("telefone") ? errorInputStyle : {}),
                      }}
                    />
                    {getFieldError("telefone") ? <span className="lp-field-error">{getFieldError("telefone")}</span> : null}
                  </label>

                  <label className="lp-field-label">
                    Email
                    <input
                      type="email"
                      name="email"
                      required
                      aria-required="true"
                      aria-invalid={getFieldError("email") ? "true" : "false"}
                      value={contactForm.email}
                      onChange={(event) => updateContactField("email", event.target.value)}
                      placeholder="geral@empresa.pt"
                      className="lp-field-input"
                      style={{
                        ...baseInputStyle,
                        ...(getFieldError("email") ? errorInputStyle : {}),
                      }}
                    />
                    {getFieldError("email") ? <span className="lp-field-error">{getFieldError("email")}</span> : null}
                  </label>

                  <label className="lp-field-label">
                    Nº Consultores
                    <input
                      type="number"
                      name="numeroConsultores"
                      required
                      aria-required="true"
                      min="1"
                      max="9999"
                      step="1"
                      inputMode="numeric"
                      aria-invalid={getFieldError("numeroConsultores") ? "true" : "false"}
                      value={contactForm.numeroConsultores}
                      onChange={(event) => updateConsultoresField(event.target.value)}
                      placeholder="15"
                      className="lp-field-input"
                      style={{
                        ...baseInputStyle,
                        ...(getFieldError("numeroConsultores") ? errorInputStyle : {}),
                      }}
                    />
                    {getFieldError("numeroConsultores") ? <span className="lp-field-error">{getFieldError("numeroConsultores")}</span> : null}
                  </label>
                </div>

                {hasVisibleValidationErrors ? (
                  <p id="lp-form-errors" className="lp-form-error-text">
                    Preencha os campos obrigatórios assinalados para continuar.
                  </p>
                ) : null}

                <div className="lp-demo-actions">
                  <button type="submit" className="lp-btn lp-btn-primary" disabled={hasVisibleValidationErrors || isSubmittingContact}>
                    {isSubmittingContact ? "Enviar..." : "Solicitar Demonstração"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="lp-section lp-cta-wrap">
          <div className="lp-container lp-cta">
            <h2>Transforme a gestão da sua imobiliária.</h2>
            <p style={{ margin: "0 0 18px", lineHeight: 1.6 }}>Menos ferramentas.<br />Mais controlo.<br />Mais negócio.</p>
            <button
              className="lp-btn lp-btn-primary"
              type="button"
              onClick={() => {
                smoothScrollTo("demonstracao");
              }}
            >
              Solicitar Demonstração
            </button>
          </div>
        </section>
      </main>

      <footer className="lp-footer" id="contacto">
        <div className="lp-container lp-footer-inner">
          <div className="lp-brand lp-brand-footer">
            <img src={logo} alt="OSFlow" />
          </div>

          <div className="lp-footer-legal">
            <p>© 2026 OSFlow</p>
            <p>Todos os direitos reservados.</p>
            <p>By Rodrigo Coraça</p>
          </div>

          <nav aria-label="Links institucionais" className="lp-footer-links">
            <a href="/politica-privacidade">Política de Privacidade</a>
            <a href="/termos">Termos de Utilização</a>
            <a href={APP_URL}>Entrar no CRM</a>
            <a href="https://www.linkedin.com/company/osflow" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href="mailto:comercial@osflow.pt">comercial@osflow.pt</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

