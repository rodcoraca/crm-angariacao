import { normalizarTelefone, validarTelefone, telefonesCoincidem } from './telefone';

describe('helpers de telefone', () => {
  it('normaliza entradas para 12 dígitos numéricos', () => {
    expect(normalizarTelefone('(35) 99999-1234')).toBe('35999991234');
    expect(normalizarTelefone('351 99999 1234')).toBe('351999991234');
    expect(normalizarTelefone('351999991234')).toBe('351999991234');
  });

  it('aceita apenas números com 12 dígitos', () => {
    expect(validarTelefone('351999991234')).toBe(true);
    expect(validarTelefone('35999991234')).toBe(false);
    expect(validarTelefone('3519999912345')).toBe(false);
    expect(validarTelefone('abc')).toBe(false);
  });

  it('compara telefones mesmo quando um deles vem com máscara ou formato antigo', () => {
    expect(telefonesCoincidem('351999991234', '351 99999 1234')).toBe(true);
    expect(telefonesCoincidem('351999991234', '+351 99999 1234')).toBe(true);
    expect(telefonesCoincidem('351999991234', '999991234')).toBe(false);
  });
});
