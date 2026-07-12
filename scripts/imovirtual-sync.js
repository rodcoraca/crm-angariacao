const { ImovirtualProvider } = require('../src/providers/ImovirtualProvider');
const { salvarLeadFluxo } = require('../src/modules/leads/services/leadsService');

async function runSync() {
  console.log("Iniciando sincronização Node...");
  
  const provider = new ImovirtualProvider({ enableLogs: true });
  
  try {
    const result = await provider.sync();
    console.log("Sincronização concluída:", result);
  } catch (error) {
    console.error("Erro na sincronização:", error);
    process.exit(1);
  }
}

runSync();
