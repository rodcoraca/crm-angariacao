import { temAcesso, modulosDisponiveis } from './usuarios';

describe('utilitários de acesso', () => {
  it('permite acesso quando o módulo está ativo', () => {
    const usuario = {
      permissoes: {
        'crm.view': true,
        'dashboard.view': false,
      },
    };

    expect(temAcesso(usuario, 'crm.view')).toBe(true);
    expect(temAcesso(usuario, 'dashboard.view')).toBe(false);
  });

  it('devolve a lista de módulos suportados', () => {
    expect(modulosDisponiveis()).toEqual(
      expect.arrayContaining(['crm.view', 'dashboard.view', 'messages.view', 'inventory.view', 'users.view', 'logs.view'])
    );
  });
});
