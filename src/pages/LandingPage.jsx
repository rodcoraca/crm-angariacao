import { useEffect, useMemo, useState } from "react";
import logo from "../assets/logo.png";
import "./LandingPage.css";

const platformHighlights = [
  "CRM Comercial",
  "Cockpit Executivo",
  "Gestão de Imóveis",
  "Gestão Documental",
  "Segurança e Auditoria",
  "Produtividade Operacional",
  "Inteligência Comercial",
];

const featureCards = [
  "CRM Comercial",
  "Cockpit Executivo",
  "Gestão de Imóveis",
  "Gestão Documental",
  "Segurança e Auditoria",
];

const benefits = [
  "Menos tarefas repetitivas",
  "Mais organização",
  "Maior produtividade",
  "Mais controlo",
  "Mais vendas",
];

const technologies = ["React", "Supabase", "Cloud", "Segurança", "Responsividade"];
const dashboardPreviewImage = "";
const valueCards = [
  {
    id: "crm-comercial",
    title: "CRM Comercial",
    description: "Acompanhe cada oportunidade com histórico, contexto e ações comerciais centralizadas.",
    icon: "crm",
  },
  {
    id: "cockpit-executivo",
    title: "Cockpit Executivo",
    description: "Visualize indicadores, prioridades e desempenho operacional com leitura imediata.",
    icon: "dashboard",
  },
  {
    id: "gestao-imoveis",
    title: "Gestão de Imóveis",
    description: "Organize carteira, estado dos imóveis e dados críticos para uma operação eficiente.",
    icon: "building",
  },
  {
    id: "gestao-documental",
    title: "Gestão Documental",
    description: "Centralize documentos e checklist operacional com rastreabilidade e controlo.",
    icon: "crm",
  },
  {
    id: "seguranca-auditoria",
    title: "Segurança e Auditoria",
    description: "Reforce permissões, proteção operacional e histórico de ações para total confiança.",
    icon: "spark",
  },
];

const keywords =
  "CRM imobiliário, software imobiliário, gestão de imóveis, CRM Portugal, CRM para imobiliárias, PropTech, sistema imobiliário, OSFlow";

const initialContactForm = {
  nome: "",
  apelido: "",
  telefone: "",
  email: "",
  tipoCliente: "",
  descricao: "",
  origem: "website",
};

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

function DashboardPreview() {
  return (
    <div className="lp-dashboard-preview">
      {dashboardPreviewImage ? (
        <img src={dashboardPreviewImage} alt="Dashboard Executivo OSFlow" className="lp-dashboard-image" />
      ) : (
        <div className="lp-dashboard-placeholder">
          <div>
            <svg
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="lp-dashboard-icon"
            >
              <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 20H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M12 16V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p className="lp-dashboard-caption">Screenshot da Plataforma</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ValueCardIcon({ icon }) {
  const iconStyle = { width: "22px", height: "22px", color: "#0e4d64" };

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
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState(initialContactForm);
  const [submitAttempted, setSubmitAttempted] = useState(false);

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
    upsertMeta("og:image", "https://osflow.pt/logo512.png", true);

    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", description);
    upsertMeta("twitter:image", "https://osflow.pt/logo512.png");

    upsertLink("canonical", "https://osflow.pt");
  }, []);

  useEffect(() => {
    if (!isContactModalOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsContactModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isContactModalOpen]);

  const requiredErrors = useMemo(() => {
    return {
      nome: !contactForm.nome.trim(),
      apelido: !contactForm.apelido.trim(),
      telefone: !contactForm.telefone.trim(),
      email: !contactForm.email.trim(),
      tipoCliente: !contactForm.tipoCliente.trim(),
    };
  }, [contactForm]);

  const hasRequiredErrors = Object.values(requiredErrors).some(Boolean);

  function updateContactField(field, value) {
    setContactForm((current) => ({ ...current, [field]: value }));
  }

  function closeContactModal() {
    setIsContactModalOpen(false);
    setSubmitAttempted(false);
  }

  function handleContactSubmit(event) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (hasRequiredErrors) return;

    // Interface pronta para integração futura de envio.
    setIsContactModalOpen(false);
  }

  const baseInputStyle = {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid rgba(14, 77, 100, 0.2)",
    background: "#ffffff",
    padding: "11px 12px",
    fontSize: "0.95rem",
    color: "#072634",
  };

  const errorInputStyle = {
    border: "1px solid #f97316",
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
            <span>OSFlow</span>
          </a>

          <nav aria-label="Menu principal" className="lp-nav-links">
            <a
              href="#funcionalidades"
              onClick={(event) => {
                event.preventDefault();
                smoothScrollTo("funcionalidades");
              }}
              className="lp-nav-link"
            >
              Funcionalidades
            </a>
            <a
              href="#como-funciona"
              onClick={(event) => {
                event.preventDefault();
                smoothScrollTo("como-funciona");
              }}
              className="lp-nav-link"
            >
              Como funciona
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
            <a href="/app" className="lp-nav-cta">
              Entrar no CRM
            </a>
          </nav>
        </div>
      </header>

      <header className="lp-hero" id="top">
        <div className="lp-container lp-hero-inner">
          <h1 className="lp-hero-title">A Plataforma Operacional Inteligente para Imobiliárias.</h1>
          <p className="lp-description lp-hero-subtitle">
            Centralize CRM, gestão de imóveis, documentos, produtividade e inteligência comercial numa única plataforma moderna.
          </p>
          <p className="lp-slogan">
            <span>Menos tempo a gerir.</span>
            <span>Mais tempo a vender.</span>
          </p>

          <div className="lp-actions">
            <button
              className="lp-btn lp-btn-primary"
              type="button"
              onClick={() => {
                setIsContactModalOpen(true);
              }}
            >
              Solicitar Demonstração
            </button>
            <a className="lp-btn lp-btn-ghost" href="/app">
              Entrar na Plataforma
            </a>
          </div>
        </div>
      </header>

      <section className="lp-section lp-preview-section" aria-label="Pré-visualização da plataforma OSFlow">
        <div className="lp-container">
          <SectionTitle
            eyebrow="Preview"
            title="Veja a OSFlow em ação"
            subtitle="Uma plataforma desenvolvida para simplificar toda a operação comercial imobiliária."
          />
          <DashboardPreview />
        </div>
      </section>

      <main>
        <section className="lp-section" id="como-funciona">
          <div className="lp-container">
            <SectionTitle
              className="lp-about-title"
              title="O que é a OSFlow"
              subtitle="Uma solução unificada para equipas comerciais imobiliárias operarem com clareza, velocidade e controlo em toda a operação."
            />

            <div className="lp-pill-grid">
              {platformHighlights.map((item) => (
                <span key={item} className="lp-pill">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section" aria-label="Principais capacidades da OSFlow">
          <div className="lp-container">
            <div className="lp-value-grid">
              {valueCards.map((card, index) => {
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

        <section className="lp-section lp-section-soft" id="funcionalidades">
          <div className="lp-container">
            <SectionTitle
              eyebrow="Módulos"
              title="Funcionalidades"
              subtitle="Tudo o que a operação comercial precisa, centralizado numa experiência rápida, segura e consistente."
            />

            <article className="lp-card" style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                <h3 style={{ margin: 0 }}>NOVO · OSFlow Radar</h3>
                <span className="lp-status-pill lp-status-desenvolvimento">Beta</span>
              </div>
              <p style={{ marginBottom: "12px" }}>Encontre oportunidades antes da concorrência.</p>
              <button className="lp-btn lp-btn-ghost" type="button" disabled>
                Brevemente disponível
              </button>
            </article>

            <div className="lp-card-grid">
              {featureCards.map((feature) => (
                <article key={feature} className="lp-card">
                  <h3>{feature}</h3>
                  <p>Projetado para reduzir atrito operacional e manter a equipa focada em conversão.</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container">
            <SectionTitle
              eyebrow="Impacto"
              title="Benefícios"
              subtitle="Ganhos concretos de eficiência, previsibilidade e resultados comerciais."
            />

            <ul className="lp-benefits" aria-label="Benefícios da plataforma OSFlow">
              {benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-section lp-section-soft">
          <div className="lp-container">
            <SectionTitle
              eyebrow="Base Técnica"
              title="Tecnologias"
              subtitle="Arquitetura moderna para garantir desempenho, segurança e escalabilidade contínua."
            />

            <div className="lp-tech-list" role="list">
              {technologies.map((tech) => (
                <span role="listitem" key={tech} className="lp-tech-item">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-cta-wrap">
          <div className="lp-container lp-cta">
            <h2>Tudo o que a sua imobiliária precisa.</h2>
            <p style={{ margin: "0 0 18px", lineHeight: 1.6 }}>Menos ferramentas.<br />Mais controlo.<br />Mais produtividade.</p>
            <button
              className="lp-btn lp-btn-primary"
              type="button"
              onClick={() => {
                setIsContactModalOpen(true);
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
            <span>OSFlow</span>
          </div>

          <div className="lp-footer-legal">
            <p>© 2026 OSFlow</p>
            <p>Todos os direitos reservados.</p>
            <p>By Rodrigo Coraça</p>
          </div>

          <nav aria-label="Links institucionais" className="lp-footer-links">
            <a href="/politica-privacidade">Política de Privacidade</a>
            <a href="/termos">Termos de Utilização</a>
            <a href="/app">Entrar no CRM</a>
            <a href="https://www.linkedin.com/company/osflow" target="_blank" rel="noreferrer">
              LinkedIn (placeholder)
            </a>
            <a href="mailto:comercial@osflow.pt">Email (placeholder)</a>
          </nav>
        </div>
      </footer>

      {isContactModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          className="lp-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeContactModal();
            }
          }}
        >
          <div className="lp-modal-panel">
            <div className="lp-modal-header">
              <h3 id="contact-modal-title">Falar com a equipa</h3>
              <p>
                Partilhe os seus dados para prepararmos um contacto comercial adequado ao seu contexto.
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="lp-modal-form" noValidate>
              <input type="hidden" name="origem" value={contactForm.origem} />

              <div className="lp-modal-grid">
                <label className="lp-field-label">
                  Nome
                  <input
                    type="text"
                    name="nome"
                    required
                    aria-required="true"
                    aria-invalid={submitAttempted && requiredErrors.nome ? "true" : "false"}
                    value={contactForm.nome}
                    onChange={(event) => updateContactField("nome", event.target.value)}
                    className="lp-field-input"
                    style={{
                      ...baseInputStyle,
                      ...(submitAttempted && requiredErrors.nome ? errorInputStyle : {}),
                    }}
                  />
                </label>

                <label className="lp-field-label">
                  Apelido
                  <input
                    type="text"
                    name="apelido"
                    required
                    aria-required="true"
                    aria-invalid={submitAttempted && requiredErrors.apelido ? "true" : "false"}
                    value={contactForm.apelido}
                    onChange={(event) => updateContactField("apelido", event.target.value)}
                    className="lp-field-input"
                    style={{
                      ...baseInputStyle,
                      ...(submitAttempted && requiredErrors.apelido ? errorInputStyle : {}),
                    }}
                  />
                </label>

                <label className="lp-field-label">
                  Telefone
                  <input
                    type="tel"
                    name="telefone"
                    required
                    aria-required="true"
                    aria-invalid={submitAttempted && requiredErrors.telefone ? "true" : "false"}
                    value={contactForm.telefone}
                    onChange={(event) => updateContactField("telefone", event.target.value)}
                    className="lp-field-input"
                    style={{
                      ...baseInputStyle,
                      ...(submitAttempted && requiredErrors.telefone ? errorInputStyle : {}),
                    }}
                  />
                </label>

                <label className="lp-field-label">
                  Email
                  <input
                    type="email"
                    name="email"
                    required
                    aria-required="true"
                    aria-invalid={submitAttempted && requiredErrors.email ? "true" : "false"}
                    value={contactForm.email}
                    onChange={(event) => updateContactField("email", event.target.value)}
                    className="lp-field-input"
                    style={{
                      ...baseInputStyle,
                      ...(submitAttempted && requiredErrors.email ? errorInputStyle : {}),
                    }}
                  />
                </label>
              </div>

              <label className="lp-field-label lp-field-block">
                Tipo de Cliente
                <select
                  name="tipoCliente"
                  required
                  aria-required="true"
                  aria-invalid={submitAttempted && requiredErrors.tipoCliente ? "true" : "false"}
                  value={contactForm.tipoCliente}
                  onChange={(event) => updateContactField("tipoCliente", event.target.value)}
                  className="lp-field-input"
                  style={{
                    ...baseInputStyle,
                    ...(submitAttempted && requiredErrors.tipoCliente ? errorInputStyle : {}),
                  }}
                >
                  <option value="">Selecione uma opção</option>
                  <option value="imobiliaria">Imobiliária</option>
                  <option value="consultor-independente">Consultor Independente</option>
                </select>
              </label>

              <label className="lp-field-label lp-field-block">
                Descrição
                <textarea
                  name="descricao"
                  rows={5}
                  value={contactForm.descricao}
                  onChange={(event) => updateContactField("descricao", event.target.value)}
                  className="lp-field-input"
                  style={{ ...baseInputStyle, resize: "vertical", lineHeight: 1.55 }}
                />
              </label>

              {submitAttempted && hasRequiredErrors ? (
                <p id="lp-form-errors" className="lp-form-error-text">
                  Preencha os campos obrigatórios assinalados para continuar.
                </p>
              ) : null}

              <div className="lp-modal-actions">
                <button
                  type="button"
                  onClick={closeContactModal}
                  className="lp-modal-btn lp-modal-btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" className="lp-modal-btn lp-modal-btn-primary">
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
