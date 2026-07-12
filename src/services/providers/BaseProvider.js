/**
 * Interface padrão para todos os Providers de sincronização.
 * Cada novo provider (OLX, Idealista, etc.) deve implementar esta estrutura.
 */
export class BaseProvider {
  constructor(code) {
    this.code = code;
  }

  /**
   * Executa a lógica de sincronização específica do provider.
   * Deve retornar um objeto com o resultado.
   */
  async sync() {
    throw new Error("Método sync() deve ser implementado pelo provider");
  }
}
