import ProviderSchedulerService
  from "../src/providers/services/ProviderSchedulerService.js";

async function run() {

  const result =
    await ProviderSchedulerService
      .runPendingProviders();

  console.log(result);
}

run();