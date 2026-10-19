import {
  buildPlantaUnidadePayload,
  calcularCondicoesPagamentoPorUnidade,
  inferNextFracao,
  mapUnidadeParaFormulario,
  toUnidadePayload,
  validarEmpreendimentoTenant,
  validarFracaoDuplicada,
  validarUnidade
} from './unidadesService';

describe('unidadesService', () => {
  it('valida campos obrigatórios e valores numéricos', () => {
    expect(validarUnidade({ fracao: '', tipologia: '' })).toBe('A fração e a tipologia são obrigatórias.');
    expect(validarUnidade({ fracao: 'A', tipologia: 'T2', area_bruta_privativa: 'abc' })).toBe('As áreas devem ser numéricas e não negativas.');
    expect(validarUnidade({ fracao: 'A', tipologia: 'T2', casas_banho: '-1' })).toBe('As casas de banho devem ser um número inteiro não negativo.');
    expect(validarUnidade({ fracao: 'A', tipologia: 'T2', casas_banho: '1.5' })).toBe('As casas de banho devem ser um número inteiro não negativo.');
    expect(validarUnidade({ fracao: 'A', tipologia: 'T2', lugares_garagem: '13' })).toBe('Os lugares de garagem devem ser um número inteiro entre 0 e 12.');
    expect(validarUnidade({ fracao: 'A', tipologia: 'T2', lugares_garagem: '0' })).toBe('');
  });

  it('constrói payload seguro com tenant e auditoria', () => {
    const payload = toUnidadePayload({
      fracao: 'A',
      tipologia: 'T2',
      area_bruta_privativa: '80',
      area_total: '100',
      area_dependente: '20',
      casas_banho: '2',
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
    expect(payload.casas_banho).toBe(2);
    expect(payload.lugares_garagem).toBe(1);
  });

  it('preserva ND, zero e valores positivos de garagem no payload', () => {
    const base = { fracao: 'A', tipologia: 'T2' };

    expect(toUnidadePayload({ ...base, lugares_garagem: '' }, {}).lugares_garagem).toBeNull();
    expect(toUnidadePayload({ ...base, lugares_garagem: '0' }, {}).lugares_garagem).toBe(0);
    expect(toUnidadePayload({ ...base, lugares_garagem: '12' }, {}).lugares_garagem).toBe(12);
  });

  it('inclui o preço de venda no formulário e no payload da unidade', () => {
    expect(mapUnidadeParaFormulario({ preco_venda: 250000 }).preco_venda).toBe(250000);

    const payload = toUnidadePayload({ fracao: 'A', tipologia: 'T2', preco_venda: '250000,50' }, {
      empresaId: 'company-1',
      empreendimentoId: 'emp-1',
      userProfileId: 'user-1'
    });

    expect(payload.preco_venda).toBe(250000.5);
    expect(payload).not.toHaveProperty('condicoes');
  });

  it('carrega casas de banho e garagem na edição e na duplicação', () => {
    const unidade = { fracao: 'A', tipologia: 'T2', casas_banho: 2, lugares_garagem: 0 };
    const formulario = mapUnidadeParaFormulario(unidade);

    expect(formulario.casas_banho).toBe(2);
    expect(formulario.lugares_garagem).toBe(0);

    const unidadeSemGaragem = mapUnidadeParaFormulario({ ...unidade, lugares_garagem: null });
    expect(unidadeSemGaragem.lugares_garagem).toBe('');
  });

  it('calcula plano misto por fração e identifica excedente', () => {
    const resumo = calcularCondicoesPagamentoPorUnidade({
      precoVenda: 250000,
      condicoes: [
        { nome_etapa: 'Entrada', ordem: 1, tipo_valor: 'fixo', valor: 10000 },
        { nome_etapa: 'CPCV', ordem: 2, tipo_valor: 'percentual', valor: 20 },
        { nome_etapa: 'Reforço', ordem: 3, tipo_valor: 'percentual', valor: 10 },
        { nome_etapa: 'Escritura', ordem: 4, tipo_valor: 'percentual', valor: 70 }
      ]
    });

    expect(resumo.total_calculavel).toBe(260000);
    expect(resumo.saldo).toBe(-10000);
    expect(resumo.excedente).toBe(10000);
    expect(resumo.estado).toBe('Plano excede o preço');
  });

  it('calcula plano misto equilibrado, saldo positivo e arredondamento', () => {
    const equilibrado = calcularCondicoesPagamentoPorUnidade({
      precoVenda: 250000,
      condicoes: [
        { nome_etapa: 'Entrada', ordem: 1, tipo_valor: 'fixo', valor: 10000 },
        { nome_etapa: 'CPCV', ordem: 2, tipo_valor: 'percentual', valor: 20 },
        { nome_etapa: 'Reforço', ordem: 3, tipo_valor: 'percentual', valor: 10 },
        { nome_etapa: 'Escritura', ordem: 4, tipo_valor: 'percentual', valor: 66 }
      ]
    });
    const positivo = calcularCondicoesPagamentoPorUnidade({
      precoVenda: 250000,
      condicoes: [{ nome_etapa: 'Entrada', ordem: 1, tipo_valor: 'fixo', valor: 10000 }]
    });

    expect(equilibrado.total_calculavel).toBe(250000);
    expect(equilibrado.estado).toBe('Plano equilibrado');
    expect(positivo.saldo).toBe(240000);
    expect(positivo.estado).toBe('Saldo por distribuir');
  });

  it('não calcula percentuais sem preço e suporta condições vazias ou só fixas', () => {
    const semPreco = calcularCondicoesPagamentoPorUnidade({
      condicoes: [
        { nome_etapa: 'Entrada', ordem: 1, tipo_valor: 'fixo', valor: 10000 },
        { nome_etapa: 'CPCV', ordem: 2, tipo_valor: 'percentual', valor: 20 }
      ]
    });
    const vazias = calcularCondicoesPagamentoPorUnidade({ precoVenda: 250000, condicoes: [] });
    const fixas = calcularCondicoesPagamentoPorUnidade({
      precoVenda: 250000,
      condicoes: [{ nome_etapa: 'Entrada', ordem: 1, tipo_valor: 'fixo', valor: 10000 }]
    });

    expect(semPreco.etapas[0].montante).toBe(10000);
    expect(semPreco.etapas[1].montante).toBeNull();
    expect(semPreco.estado).toBe('Cálculo incompleto');
    expect(vazias.estado).toBe('Sem condições');
    expect(fixas.total_fixos).toBe(10000);
  });

  it('distingue preço ausente de preço zero e sinaliza o zero', () => {
    const ausente = calcularCondicoesPagamentoPorUnidade({
      precoVenda: '',
      condicoes: [{ nome_etapa: 'CPCV', tipo_valor: 'percentual', valor: 20 }]
    });
    const zero = calcularCondicoesPagamentoPorUnidade({
      precoVenda: 0,
      condicoes: [{ nome_etapa: 'Entrada', tipo_valor: 'fixo', valor: 0 }]
    });

    expect(ausente.preco_venda).toBeNull();
    expect(ausente.preco_zero).toBe(false);
    expect(ausente.estado).toBe('Cálculo incompleto');
    expect(zero.preco_venda).toBe(0);
    expect(zero.preco_zero).toBe(true);
    expect(zero.estado).toBe('Preço de venda zero — validar comercialmente');
  });

  it('sinaliza tipos de condição desconhecidos sem os somar', () => {
    const resumo = calcularCondicoesPagamentoPorUnidade({
      precoVenda: 250000,
      condicoes: [
        { nome_etapa: 'Entrada', tipo_valor: 'fixo', valor: 10000 },
        { nome_etapa: 'Desconhecida', tipo_valor: 'proporcional', valor: 50 }
      ]
    });

    expect(resumo.tem_tipo_invalido).toBe(true);
    expect(resumo.etapas[1].tipo_suportado).toBe(false);
    expect(resumo.etapas[1].montante).toBeNull();
    expect(resumo.total_fixos).toBe(10000);
    expect(resumo.total_percentuais).toBe(0);
    expect(resumo.estado).toBe('Condição inválida');
    expect(resumo.todas_etapas_calculaveis).toBe(false);
  });

  it('rejeita preço inválido e mantém cálculos independentes entre unidades', () => {
    expect(validarUnidade({ fracao: 'A', tipologia: 'T2', preco_venda: '-1' })).toBe('O preço de venda deve ser monetário e não negativo.');

    const unidadeA = calcularCondicoesPagamentoPorUnidade({ precoVenda: 100000, condicoes: [{ nome_etapa: 'CPCV', tipo_valor: 'percentual', valor: 10 }] });
    const unidadeB = calcularCondicoesPagamentoPorUnidade({ precoVenda: 200000, condicoes: [{ nome_etapa: 'CPCV', tipo_valor: 'percentual', valor: 10 }] });

    expect(unidadeA.total_percentuais).toBe(10000);
    expect(unidadeB.total_percentuais).toBe(20000);
    expect(unidadeA.etapas).not.toBe(unidadeB.etapas);
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
