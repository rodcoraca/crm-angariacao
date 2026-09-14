import {
  buildPlantaUnidadePayload,
  inferNextFracao,
  toUnidadePayload,
  validarEmpreendimentoTenant,
  validarFracaoDuplicada,
  validarUnidade
} from './unidadesService';

describe('unidadesService', () => {
  it('valida campos obrigatórios e valores numéricos', () => {
    expect(validarUnidade({ fracao: '', tipologia: '' })).toBe('A fração e a tipologia são obrigatórias.');
    expect(validarUnidade({ fracao: 'A', tipologia: 'T2', area_bruta_privativa: 'abc' })).toBe('As áreas devem ser numéricas e não negativas.');
    expect(validarUnidade({ fracao: 'A', tipologia: 'T2', lugares_garagem: '7' })).toBe('A garagem deve estar entre 1 e 6.');
  });

  it('constrói payload seguro com tenant e auditoria', () => {
    const payload = toUnidadePayload({
      fracao: 'A',
      tipologia: 'T2',
      area_bruta_privativa: '80',
      area_total: '100',
      area_dependente: '20',
      varanda: true,
      terraco: false,
      lugares_garagem: '1',
      empreendimento_id: 'emp-1',
      empresa_id: 'company-1'
    }, {
      empresaId: 'company-1',
      empreendimentoId: 'emp-1',
      userProfileId: 'user-1',
      isEditing: false
    });

    expect(payload.empresa_id).toBe('company-1');
    expect(payload.empreendimento_id).toBe('emp-1');
    expect(payload.created_by).toBe('user-1');
    expect(payload.updated_by).toBe('user-1');
    expect(payload.lugares_garagem).toBe(1);
  });

  it('permite mesma fração em empreendimentos diferentes e rejeita duplicidade no mesmo empreendimento', () => {
    expect(validarFracaoDuplicada({
      fracao: 'A',
      empreendimentoId: 'emp-2',
      unidades: [
        { id: 'unidade-1', fracao: 'A', empreendimento_id: 'emp-1' }
      ]
    })).toBe('');

    expect(validarFracaoDuplicada({
      fracao: 'A',
      empreendimentoId: 'emp-1',
      unidades: [
        { id: 'unidade-1', fracao: 'A', empreendimento_id: 'emp-1' },
        { id: 'unidade-2', fracao: 'B', empreendimento_id: 'emp-1' }
      ]
    })).toBe('Já existe uma unidade com esta fração no empreendimento.');

    expect(validarFracaoDuplicada({
      fracao: 'A',
      empreendimentoId: 'emp-1',
      unidadeId: 'unidade-1',
      unidades: [
        { id: 'unidade-1', fracao: 'A', empreendimento_id: 'emp-1' },
        { id: 'unidade-2', fracao: 'A', empreendimento_id: 'emp-1' }
      ]
    })).toBe('Já existe uma unidade com esta fração no empreendimento.');
  });

  it('rejeita empreendimento de outro tenant e aceita dentro do mesmo tenant', () => {
    expect(validarEmpreendimentoTenant({
      empreendimentoId: 'emp-2',
      empresaId: 'company-1',
      empreendimento: { id: 'emp-2', empresa_id: 'company-2' }
    })).toBe('O empreendimento selecionado não pertence à empresa atual.');

    expect(validarEmpreendimentoTenant({
      empreendimentoId: 'emp-2',
      empresaId: 'company-1',
      empreendimento: { id: 'emp-2', empresa_id: 'company-1' }
    })).toBe('');
  });

  it('associa a planta à unidade correta sem copiar para a duplicação', () => {
    const payload = buildPlantaUnidadePayload({
      empresaId: 'company-1',
      unidadeId: 'unidade-1',
      fileName: 'planta.pdf',
      mimeType: 'application/pdf'
    });

    expect(payload.entidade_tipo).toBe('unidade');
    expect(payload.entidade_id).toBe('unidade-1');
    expect(payload.empresa_id).toBe('company-1');
    expect(payload.tipo_documento).toBe('planta');
  });

  it('gera uma fração seguinte quando é segura', () => {
    expect(inferNextFracao('A')).toBe('B');
    expect(inferNextFracao('1A')).toBe('1B');
    expect(inferNextFracao('R/C Esq.')).toBe('');
  });
});
