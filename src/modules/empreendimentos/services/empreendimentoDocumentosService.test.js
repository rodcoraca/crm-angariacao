import {
  buildEmpreendimentoDocumentoPayload,
  validarEmpreendimentoDocumentoCategoria,
  validarEmpreendimentoDocumentoTenant
} from './empreendimentoDocumentosService';

describe('empreendimentoDocumentosService', () => {
  it('aceita apenas categorias válidas para documentos do empreendimento', () => {
    expect(validarEmpreendimentoDocumentoCategoria('brochura')).toBe(true);
    expect(validarEmpreendimentoDocumentoCategoria('planta')).toBe(true);
    expect(validarEmpreendimentoDocumentoCategoria('mapa_acabamentos')).toBe(true);
    expect(validarEmpreendimentoDocumentoCategoria('mapa_unidades')).toBe(true);
    expect(validarEmpreendimentoDocumentoCategoria('tabela_precos')).toBe(true);
    expect(validarEmpreendimentoDocumentoCategoria('documento_adicional')).toBe(true);
    expect(validarEmpreendimentoDocumentoCategoria('categoria_invalida')).toBe(false);
  });

  it('constroi payload seguro com associação ao empreendimento correto', () => {
    const payload = buildEmpreendimentoDocumentoPayload({
      empresaId: 'company-1',
      empreendimentoId: 'emp-1',
      categoria: 'brochura',
      fileName: 'brochura.pdf',
      mimeType: 'application/pdf',
      publicUrl: 'https://cdn.example.com/brochura.pdf'
    });

    expect(payload.empresa_id).toBe('company-1');
    expect(payload.entidade_tipo).toBe('empreendimento');
    expect(payload.entidade_id).toBe('emp-1');
    expect(payload.tipo_documento).toBe('brochura');
    expect(payload.nome).toBe('brochura.pdf');
    expect(payload.url).toBe('https://cdn.example.com/brochura.pdf');
  });

  it('rejeita ficheiro de outro tenant ou associação incorreta', () => {
    expect(validarEmpreendimentoDocumentoTenant({
      empresaId: 'company-1',
      empreendimentoId: 'emp-1',
      empreendimento: { id: 'emp-1', empresa_id: 'company-2' },
      ficheiro: { empresa_id: 'company-1', entidade_id: 'emp-1', entidade_tipo: 'empreendimento' }
    })).toBe('O empreendimento selecionado não pertence à empresa atual.');

    expect(validarEmpreendimentoDocumentoTenant({
      empresaId: 'company-1',
      empreendimentoId: 'emp-1',
      empreendimento: { id: 'emp-1', empresa_id: 'company-1' },
      ficheiro: { empresa_id: 'company-1', entidade_id: 'emp-2', entidade_tipo: 'empreendimento' }
    })).toBe('O documento selecionado não corresponde ao empreendimento atual.');

    expect(validarEmpreendimentoDocumentoTenant({
      empresaId: 'company-1',
      empreendimentoId: 'emp-1',
      empreendimento: { id: 'emp-1', empresa_id: 'company-1' },
      ficheiro: { empresa_id: 'company-1', entidade_id: 'emp-1', entidade_tipo: 'empreendimento' }
    })).toBe('');
  });
});
