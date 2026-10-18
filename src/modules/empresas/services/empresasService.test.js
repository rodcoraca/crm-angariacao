jest.mock("../repositories", () => ({
  createEmpresaRepository: jest.fn(),
  listEmpresasRepository: jest.fn(),
  listLeadsForEmpresaIndicatorsRepository: jest.fn(),
  listProviderLeadsForEmpresaIndicatorsRepository: jest.fn(),
  listUsuariosForEmpresaAssociationRepository: jest.fn(),
  updateEmpresaRepository: jest.fn(),
  associateUsuarioEmpresaRepository: jest.fn()
}));
jest.mock("../../audit/services", () => ({
  registrarCriacao: jest.fn(),
  registrarEdicao: jest.fn()
}));
jest.mock("../../../utils/empresaScope", () => ({
  hasEmpresaId: jest.fn(),
  resolveEmpresaIdFromContext: jest.fn(),
  warnMissingEmpresaId: jest.fn()
}));

import { criarEmpresa, editarEmpresa } from "./empresasService";
import * as mockRepositories from "../repositories";
import * as mockAudit from "../../audit/services";

const currentUser = { id: "user-1", perfil_id: "profile-1" };

function resolveRepository(repository, data = { id: "empresa-1", nome: "OSFlow", slug: "osflow", estado: "ativo" }) {
  repository.mockResolvedValue({ data, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  resolveRepository(mockRepositories.createEmpresaRepository);
  resolveRepository(mockRepositories.updateEmpresaRepository);
  mockAudit.registrarCriacao.mockResolvedValue(undefined);
  mockAudit.registrarEdicao.mockResolvedValue(undefined);
});

describe("empresasService", () => {
  test.each(["ativo", "inativo"])("cria empresa com estado %s", async (estado) => {
    const result = await criarEmpresa({
      form: { nome: "OSFlow", slug: "osflow", estado },
      currentUser
    });

    expect(result.error).toBeNull();
    expect(mockRepositories.createEmpresaRepository).toHaveBeenCalledWith(
      expect.objectContaining({ estado })
    );
  });

  test.each(["ativo", "inativo"])("edita empresa com estado %s", async (estado) => {
    const result = await editarEmpresa({
      empresaId: "empresa-1",
      form: { nome: "OSFlow", slug: "osflow", estado },
      currentUser
    });

    expect(result.error).toBeNull();
    expect(mockRepositories.updateEmpresaRepository).toHaveBeenCalledWith(
      "empresa-1",
      expect.objectContaining({ estado, updated_at: expect.any(String) })
    );
    expect(mockAudit.registrarEdicao).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["ativa", "ativo"],
    ["inativa", "inativo"]
  ])("normaliza estado legado %s para %s na edição", async (estado, estadoCanonico) => {
    await editarEmpresa({
      empresaId: "empresa-1",
      form: { nome: "OSFlow", slug: "osflow", estado },
      currentUser
    });

    expect(mockRepositories.updateEmpresaRepository).toHaveBeenCalledWith(
      "empresa-1",
      expect.objectContaining({ estado: estadoCanonico, updated_at: expect.any(String) })
    );
  });

  test("rejeita estado desconhecido sem chamar o repositório", async () => {
    const result = await editarEmpresa({
      empresaId: "empresa-1",
      form: { nome: "OSFlow", slug: "osflow", estado: "pendente" },
      currentUser
    });

    expect(result.error.message).toBe("Estado inválido.");
    expect(mockRepositories.updateEmpresaRepository).not.toHaveBeenCalled();
  });

  test("rejeita nome vazio com a mensagem existente", async () => {
    const result = await criarEmpresa({
      form: { nome: "", slug: "osflow", estado: "ativo" },
      currentUser
    });

    expect(result.error.message).toBe("Nome da empresa é obrigatório.");
    expect(mockRepositories.createEmpresaRepository).not.toHaveBeenCalled();
  });

  test("rejeita slug vazio após normalização com a mensagem existente", async () => {
    const result = await criarEmpresa({
      form: { nome: "OSFlow", slug: "!!!", estado: "ativo" },
      currentUser
    });

    expect(result.error.message).toBe("Slug da empresa é obrigatório.");
    expect(mockRepositories.createEmpresaRepository).not.toHaveBeenCalled();
  });
});
