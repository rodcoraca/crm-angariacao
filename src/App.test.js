import { render, screen } from '@testing-library/react';
import App from './App';
import { buildCurrentUserWithEmpresa } from './utils/empresaScope';

test('renders the OSFlow login surface', () => {
  render(<App />);
  expect(screen.getByText(/Acesso seguro/i)).toBeTruthy();
});

test('preserves empresa_id from perfil when user context is missing it', () => {
  const currentUser = {
    id: 'auth-1',
    user_metadata: { nome: 'Ana' }
  };

  const perfil = {
    id: 'perfil-1',
    empresa_id: 'empresa-123'
  };

  const merged = buildCurrentUserWithEmpresa(currentUser, perfil);

  expect(merged.empresa_id).toBe('empresa-123');
  expect(merged.user_metadata.empresa_id).toBe('empresa-123');
  expect(merged.perfil.empresa_id).toBe('empresa-123');
});
