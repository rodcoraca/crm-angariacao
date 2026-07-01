import { temAcesso, modulosDisponiveis } from './usuarios';

describe('utilitários de acesso', () => {
  it('permite acesso quando o módulo está ativo', () => {
    const usuario = {
      permissoes: {
        fluxo: true,
        dashboard: false,
      },
    };

    expect(temAcesso(usuario, 'fluxo')).toBe(true);
    expect(temAcesso(usuario, 'dashboard')).toBe(false);
  });

  it('devolve a lista de módulos suportados', () => {
    expect(modulosDisponiveis()).toEqual(
      expect.arrayContaining(['fluxo', 'dashboard', 'mensagens', 'estoque_np', 'usuarios', 'logs'])
    );
  });
});
