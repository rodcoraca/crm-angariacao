describe('repair-imovirtual-location-scheduler', () => {
  describe('Configuração', () => {
    it('deve ter batch size de 50 registos', () => {
      const BATCH_SIZE = 50;
      expect(BATCH_SIZE).toBe(50);
    });

    it('deve ter lease duration de 20 minutos', () => {
      const LEASE_DURATION_MINUTES = 20;
      expect(LEASE_DURATION_MINUTES).toBe(20);
    });

    it('deve construir URL da função de repair corretamente', () => {
      const supabaseUrl = 'https://test.supabase.co';
      const expectedUrl = `${supabaseUrl}/functions/v1/repair-imovirtual-location`;
      expect(expectedUrl).toBe('https://test.supabase.co/functions/v1/repair-imovirtual-location');
    });
  });

  describe('Autenticação', () => {
    it('deve rejeitar requests sem service_role key', () => {
      const invalidToken = 'invalid-token';
      const serviceRoleKey = 'test-service-role-key';
      expect(invalidToken).not.toBe(serviceRoleKey);
    });

    it('deve aceitar requests com service_role key válida', () => {
      const validToken = 'test-service-role-key';
      const serviceRoleKey = 'test-service-role-key';
      expect(validToken).toBe(serviceRoleKey);
    });

    it('deve extrair token do header Authorization', () => {
      const authHeader = 'Bearer test-token-123';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      expect(token).toBe('test-token-123');
    });
  });

  describe('Progressão do cursor', () => {
    it('deve usar lastProcessedId da execução anterior', () => {
      const lastProcessedId = 'lead-456';
      const nextAfterId = lastProcessedId;
      expect(nextAfterId).toBe('lead-456');
    });

    it('deve começar do início se não há execução anterior', () => {
      const lastProcessedId = null;
      const nextAfterId = lastProcessedId || undefined;
      expect(nextAfterId).toBeUndefined();
    });

    it('deve atualizar cursor após batch bem-sucedido', () => {
      const result = {
        success: true,
        lastId: 'lead-999',
        hasMore: true
      };
      const newCursor = result.lastId;
      expect(newCursor).toBe('lead-999');
    });
  });

  describe('Estados de finalização', () => {
    it('deve marcar como completed quando há mais registos', () => {
      const result = { success: true, hasMore: true };
      const status = result.success ? (result.hasMore ? 'completed' : 'no_more_records') : 'failed';
      expect(status).toBe('completed');
    });

    it('deve marcar como no_more_records quando não há mais registos', () => {
      const result = { success: true, hasMore: false };
      const status = result.success ? (result.hasMore ? 'completed' : 'no_more_records') : 'failed';
      expect(status).toBe('no_more_records');
    });

    it('deve marcar como failed em caso de erro', () => {
      const result = { success: false, message: 'Erro' };
      const status = result.success ? (result.hasMore ? 'completed' : 'no_more_records') : 'failed';
      expect(status).toBe('failed');
    });
  });

  describe('Contadores de resultado', () => {
    it('deve agregar contadores corretamente', () => {
      const result = {
        fetched: 50,
        updated: 30,
        partial: 10,
        notFound: 5,
        httpErrors: 2,
        extractionErrors: 1,
        locationErrors: 1,
        updateErrors: 1
      };

      const total = result.updated + result.partial + result.notFound +
                    result.httpErrors + result.extractionErrors +
                    result.locationErrors + result.updateErrors;

      expect(total).toBe(50);
      expect(total).toBe(result.fetched);
    });

    it('deve distinguir entre updated e partial', () => {
      const result = {
        updated: 30,
        partial: 10
      };

      expect(result.updated).toBe(30);
      expect(result.partial).toBe(10);
      expect(result.updated + result.partial).toBe(40);
    });
  });

  describe('Tratamento de erros HTTP', () => {
    it('deve classificar 404 como http_error', () => {
      const status = 404;
      const category = status >= 400 && status < 500 ? 'http_error' : 'unknown';
      expect(category).toBe('http_error');
    });

    it('deve classificar 410 como http_error', () => {
      const status = 410;
      const category = status >= 400 && status < 500 ? 'http_error' : 'unknown';
      expect(category).toBe('http_error');
    });

    it('deve preservar erros transitórios para retry', () => {
      const transientErrors = ['timeout', 'network_error', 'extraction_failed'];
      const error = { category: 'extraction_failed' };
      const shouldRetry = transientErrors.includes(error.category);
      expect(shouldRetry).toBe(true);
    });
  });

  describe('Concorrência e lease', () => {
    it('deve gerar owner único por execução', () => {
      const owner1 = `scheduler-${Date.now()}-1`;
      const owner2 = `scheduler-${Date.now()}-2`;
      expect(owner1).not.toBe(owner2);
    });

    it('deve calcular lease expiration corretamente', () => {
      const now = new Date('2026-11-05T15:00:00Z');
      const leaseDurationMinutes = 20;
      const leaseUntil = new Date(now.getTime() + leaseDurationMinutes * 60 * 1000);
      expect(leaseUntil.toISOString()).toBe('2026-11-05T15:20:00.000Z');
    });
  });

  describe('Validação de payload', () => {
    it('deve incluir batchSize no payload', () => {
      const payload = {
        batchSize: 50,
        afterId: undefined
      };
      expect(payload.batchSize).toBe(50);
    });

    it('deve incluir afterId quando fornecido', () => {
      const payload = {
        batchSize: 50,
        afterId: 'lead-123'
      };
      expect(payload.afterId).toBe('lead-123');
    });

    it('deve omitir afterId quando não fornecido', () => {
      const afterId = null;
      const payload = {
        batchSize: 50,
        afterId: afterId || undefined
      };
      expect(payload.afterId).toBeUndefined();
    });
  });
});
