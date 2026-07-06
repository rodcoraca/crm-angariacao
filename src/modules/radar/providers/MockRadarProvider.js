import { RadarProvider } from "./RadarProvider";

const MOCK_OPPORTUNITIES = [
  {
    id: "radar-001",
    titulo: "T3 com varanda e elevador",
    morada: "Rua do Sol 128",
    cidade: "Lisboa",
    tipo: "Apartamento",
    preco: 365000,
    area: 124,
    quartos: 3,
    publicado_em: "2026-07-06T08:15:00.000Z",
    origem: "portal_imobiliario",
    score: 92,
    estado: "novo",
    encontrado_em: "2026-07-06T08:15:00.000Z",
    url: "https://exemplo.pt/anuncio/radar-001",
    coordenadas: { lat: 38.7223, lng: -9.1393 }
  },
  {
    id: "radar-002",
    titulo: "Moradia T4 com jardim",
    morada: "Avenida Atlântica 44",
    cidade: "Cascais",
    tipo: "Moradia",
    preco: 540000,
    area: 210,
    quartos: 4,
    publicado_em: "2026-07-05T19:30:00.000Z",
    origem: "parceria_local",
    score: 85,
    estado: "analisado",
    encontrado_em: "2026-07-05T19:30:00.000Z",
    analisado_em: "2026-07-05T20:10:00.000Z",
    url: "https://exemplo.pt/anuncio/radar-002"
  },
  {
    id: "radar-003",
    titulo: "T2 remodelado no centro",
    morada: "Rua das Flores 77",
    cidade: "Porto",
    tipo: "Apartamento",
    preco: 280000,
    area: 89,
    quartos: 2,
    publicado_em: "2026-07-04T10:05:00.000Z",
    origem: "portal_imobiliario",
    score: 78,
    estado: "importado",
    encontrado_em: "2026-07-04T10:05:00.000Z",
    analisado_em: "2026-07-04T10:40:00.000Z",
    importado_em: "2026-07-04T11:15:00.000Z",
    url: "https://exemplo.pt/anuncio/radar-003",
    coordenadas: { lat: 41.1579, lng: -8.6291 }
  },
  {
    id: "radar-004",
    titulo: "Loja comercial com montra",
    morada: "Praça Central 12",
    cidade: "Braga",
    tipo: "Comercial",
    preco: 198000,
    area: 140,
    quartos: 0,
    publicado_em: "2026-07-03T15:20:00.000Z",
    origem: "classificados",
    score: 71,
    estado: "novo",
    encontrado_em: "2026-07-03T15:20:00.000Z",
    url: "https://exemplo.pt/anuncio/radar-004"
  },
  {
    id: "radar-005",
    titulo: "T1 para investimento",
    morada: "Rua Nova 9",
    cidade: "Setúbal",
    tipo: "Apartamento",
    preco: 165000,
    area: 61,
    quartos: 1,
    publicado_em: "2026-07-02T09:10:00.000Z",
    origem: "classificados",
    score: 64,
    estado: "ignorado",
    encontrado_em: "2026-07-02T09:10:00.000Z",
    ignorado_em: "2026-07-02T10:05:00.000Z",
    url: "https://exemplo.pt/anuncio/radar-005"
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class MockRadarProvider extends RadarProvider {
  async listOpportunities() {
    return clone(MOCK_OPPORTUNITIES);
  }
}
