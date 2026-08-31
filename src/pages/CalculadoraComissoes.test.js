import {
  calcularPercentual,
  calcularNegociacaoValor,
  calcularMinimoVendedorPorPreco,
  calcularMinimoVendedorPorComissao,
} from './CalculadoraComissoes';

describe('Calculadora de Comissões', () => {
  test('cenário 1 calcula corretamente com IVA acrescido', () => {
    const result = calcularPercentual({
      venda: 1000,
      percentual: 10,
      iva: 23,
      modoIva: 'acresce',
    });

    expect(result.comissaoSemIva).toBeCloseTo(100, 2);
    expect(result.iva).toBeCloseTo(23, 2);
    expect(result.comissaoComIva).toBeCloseTo(123, 2);
    expect(result.liquidoVendedor).toBeCloseTo(877, 2);
  });

  test('cenário 2 calcula corretamente com comissão negociada incluindo IVA', () => {
    const result = calcularNegociacaoValor({
      valorVendaOriginal: 1000,
      percentualOriginal: 8,
      novoValorVenda: 1200,
      novaComissao: 90,
      comissaoIncluiIva: true,
      iva: 23,
    });

    expect(result.comissaoSemIva).toBeCloseTo(73.17, 2);
    expect(result.iva).toBeCloseTo(16.83, 2);
    expect(result.comissaoComIva).toBeCloseTo(90, 2);
    expect(result.percentualEfetivo).toBeCloseTo(6.10, 2);
    expect(result.comissaoPelaPercentualOriginal).toBeCloseTo(96, 2);
    expect(result.reducaoAdicional).toBeCloseTo(22.83, 2);
    expect(result.liquidoVendedor).toBeCloseTo(1110, 2);
  });

  test('cenário 3 calcula corretamente pelo preço', () => {
    const result = calcularMinimoVendedorPorPreco({
      minimoVendedor: 900,
      valorVenda: 1200,
      iva: 23,
    });

    expect(result.comissaoComIva).toBeCloseTo(300, 2);
    expect(result.comissaoSemIva).toBeCloseTo(243.90, 2);
    expect(result.iva).toBeCloseTo(56.10, 2);
    expect(result.percentualEfetivo).toBeCloseTo(20.33, 2);
  });

  test('cenário 3 calcula corretamente pela comissão pretendida', () => {
    const result = calcularMinimoVendedorPorComissao({
      minimoVendedor: 900,
      comissaoPretendida: 100,
      iva: 23,
    });

    expect(result.iva).toBeCloseTo(23, 2);
    expect(result.comissaoComIva).toBeCloseTo(123, 2);
    expect(result.valorVendaNecessario).toBeCloseTo(1023, 2);
  });
});
