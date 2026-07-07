export const COPILOTO_ESTADOS_CLIENTE = Object.freeze([
  { key: "receptivo", label: "😊 Receptivo" },
  { key: "indeciso", label: "🤔 Indeciso" },
  { key: "neutro", label: "😐 Neutro" },
  { key: "com_pressa", label: "⏳ Com pressa" },
  { key: "desconfiado", label: "😒 Desconfiado" },
  { key: "outra_imobiliaria", label: "🏢 Já trabalha com outra imobiliária" },
  { key: "questiona_comissao", label: "💰 Questiona comissão" },
  { key: "sem_interesse", label: "❌ Sem interesse" }
]);

const ETAPAS_COPILOTO = Object.freeze([
  { key: "primeira_abordagem", label: "Primeira abordagem" },
  { key: "criar_empatia", label: "Criar empatia" },
  { key: "descobrir_necessidade", label: "Descobrir necessidade" },
  { key: "quebrar_objecoes", label: "Quebrar objeções" },
  { key: "agendar_visita", label: "Agendar visita" },
  { key: "encerrar_contacto", label: "Encerrar contacto" },
  { key: "proximo_passo", label: "Próximo passo" }
]);

const BASE_ETAPAS = Object.freeze({
  primeira_abordagem: {
    objetivo: "Abrir a conversa com permissão, empatia e clareza.",
    perguntas: [
      "Tenho 2 minutos para confirmar se este é um bom momento?",
      "Podemos alinhar rapidamente o contexto da venda?"
    ],
    sinais: "Tom disponível, respostas curtas mas colaborativas e ausência de resistência inicial."
  },
  criar_empatia: {
    objetivo: "Construir confiança sem pressão comercial.",
    perguntas: [
      "Como está a ser a experiência de venda até agora?",
      "Qual é a sua maior preocupação neste momento?"
    ],
    sinais: "Cliente partilha contexto pessoal e começa a detalhar o cenário."
  },
  descobrir_necessidade: {
    objetivo: "Identificar motivação, prazo e critérios de decisão.",
    perguntas: [
      "Que resultado considera ideal para esta venda?",
      "Existe um prazo que gostaria de cumprir?"
    ],
    sinais: "Cliente verbaliza objetivos concretos e limites de tempo ou negociação."
  },
  quebrar_objecoes: {
    objetivo: "Reduzir bloqueios mantendo o diálogo produtivo.",
    perguntas: [
      "Qual é a principal reserva para avançarmos?",
      "O que precisa de acontecer para se sentir seguro?"
    ],
    sinais: "Objeção explícita, mas cliente ainda responde e considera alternativas."
  },
  agendar_visita: {
    objetivo: "Converter intenção em compromisso prático.",
    perguntas: [
      "Que dia desta semana funciona melhor para si?",
      "Quem deve estar presente para validarmos tudo no local?"
    ],
    sinais: "Cliente discute agenda, logística e disponibilidade de forma concreta."
  },
  encerrar_contacto: {
    objetivo: "Fechar a chamada com alinhamento e segurança.",
    perguntas: [
      "Posso confirmar consigo o que ficou acordado?",
      "Quer que envie o resumo do combinado por mensagem?"
    ],
    sinais: "Cliente confirma próximos passos e mantém tom estável no fecho."
  },
  proximo_passo: {
    objetivo: "Garantir continuidade objetiva sem perder relacionamento.",
    perguntas: [
      "Qual o melhor canal para seguirmos este processo?",
      "Em que horário prefere o próximo contacto?"
    ],
    sinais: "Cliente confirma canal e janela de contacto para continuidade."
  }
});

const REGRAS_POR_ETAPA_ESTADO = Object.freeze({
  primeira_abordagem: {
    receptivo: {
      estrategia: "Mantenha abertura positiva e confirme rapidamente intenção de colaboração.",
      perguntas: ["Prefere que seja direto ao ponto da venda?"],
      evitar: "Alongar introdução sem necessidade.",
      criterioAvanco: "Cliente autoriza continuidade e mantém disponibilidade.",
      criterioFimElegante: "Se perder disponibilidade, agradecer e remarcar sem insistir.",
      proximaDecisao: "avancar",
      proximaEtapa: "criar_empatia"
    },
    indeciso: {
      estrategia: "Valide a dúvida e proponha apenas um próximo micro-passo.",
      perguntas: ["Faz sentido alinharmos apenas o essencial agora?"],
      evitar: "Pedir compromisso total nesta fase.",
      criterioAvanco: "Cliente aceita continuar de forma curta.",
      criterioFimElegante: "Se mantiver hesitação, terminar cordialmente e abrir retorno futuro.",
      proximaDecisao: "avancar",
      proximaEtapa: "criar_empatia"
    },
    neutro: {
      estrategia: "Adote tom consultivo e faça uma transição objetiva para contexto.",
      perguntas: ["Posso fazer duas perguntas para entender o cenário atual?"],
      evitar: "Assumir urgência sem confirmação.",
      criterioAvanco: "Cliente responde com mínimo de detalhe.",
      criterioFimElegante: "Sem abertura após tentativas curtas, fechar com respeito.",
      proximaDecisao: "avancar",
      proximaEtapa: "criar_empatia"
    },
    com_pressa: {
      estrategia: "Comprima discurso e proponha continuidade com horário definido.",
      perguntas: ["Quer que alinhemos 1 ponto agora e combinemos o restante?"],
      evitar: "Exploração extensa do histórico.",
      criterioAvanco: "Cliente escolhe manter conversa breve agora.",
      criterioFimElegante: "Se sem tempo real, encerrar cordialmente e agendar retorno.",
      proximaDecisao: "avancar",
      proximaEtapa: "criar_empatia"
    },
    desconfiado: {
      estrategia: "Reforce transparência desde o início e enquadre claramente o propósito.",
      perguntas: ["Prefere que explique primeiro como trabalhamos este processo?"],
      evitar: "Promessas de resultado imediato.",
      criterioAvanco: "Cliente aceita ouvir método de trabalho.",
      criterioFimElegante: "Se resistência persistente, encerrar sem confronto.",
      proximaDecisao: "avancar",
      proximaEtapa: "criar_empatia"
    },
    outra_imobiliaria: {
      estrategia: "Reconheça o contexto e posicione-se como alternativa complementar.",
      perguntas: ["Quer comparar abordagens de forma objetiva e sem compromisso?"],
      evitar: "Desqualificar a outra equipa.",
      criterioAvanco: "Cliente aceita ouvir diferencial operacional.",
      criterioFimElegante: "Sem abertura para comparação, agradecer e manter porta aberta.",
      proximaDecisao: "avancar",
      proximaEtapa: "criar_empatia"
    },
    questiona_comissao: {
      estrategia: "Enquadre valor e processo antes de discutir percentuais.",
      perguntas: ["Posso explicar primeiro o que está incluído no acompanhamento?"],
      evitar: "Entrar em negociação numérica imediata.",
      criterioAvanco: "Cliente aceita ouvir proposta de valor.",
      criterioFimElegante: "Se foco exclusivo em comissão sem abertura, encerrar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "criar_empatia"
    },
    sem_interesse: {
      estrategia: "Respeite a decisão e preserve relacionamento futuro.",
      perguntas: ["Quer que deixe um contacto caso mude de contexto?"],
      evitar: "Insistência após recusa clara.",
      criterioAvanco: "Nao aplicável.",
      criterioFimElegante: "Agradecer o tempo e disponibilizar apoio futuro sem pressão.",
      proximaDecisao: "encerrar",
      encerramento: "Perfeito, agradeço a sua franqueza e o seu tempo. Se no futuro fizer sentido retomar, fico totalmente disponível para ajudar."
    }
  },
  criar_empatia: {
    receptivo: {
      estrategia: "Aprofunde contexto pessoal e objetivo de venda com escuta ativa.",
      perguntas: ["Qual seria para si um processo de venda ideal?"],
      evitar: "Acelerar para proposta sem entender contexto.",
      criterioAvanco: "Cliente partilha motivação principal.",
      criterioFimElegante: "Se desconectar da conversa, encerrar com cordialidade.",
      proximaDecisao: "avancar",
      proximaEtapa: "descobrir_necessidade"
    },
    indeciso: {
      estrategia: "Valide incertezas e normalize dúvidas antes de avançar.",
      perguntas: ["O que o deixaria mais confortável para dar o próximo passo?"],
      evitar: "Tratar dúvidas como objeção final.",
      criterioAvanco: "Cliente identifica uma condição de conforto.",
      criterioFimElegante: "Sem avanço após clarificação, terminar com respeito.",
      proximaDecisao: "avancar",
      proximaEtapa: "descobrir_necessidade"
    },
    neutro: {
      estrategia: "Mantenha conversa funcional, sem dramatizar urgência.",
      perguntas: ["Qual é hoje o ponto mais importante para si neste tema?"],
      evitar: "Excesso de energia comercial.",
      criterioAvanco: "Cliente prioriza um tema específico.",
      criterioFimElegante: "Se neutralidade fechar o diálogo, encerrar sem pressão.",
      proximaDecisao: "avancar",
      proximaEtapa: "descobrir_necessidade"
    },
    com_pressa: {
      estrategia: "Priorize uma pergunta-chave e proponha continuidade objetiva.",
      perguntas: ["Qual é o único ponto que quer resolver primeiro?"],
      evitar: "Checklist extensa de qualificação.",
      criterioAvanco: "Cliente define prioridade imediata.",
      criterioFimElegante: "Sem tempo para continuar, combinar retorno e terminar.",
      proximaDecisao: "avancar",
      proximaEtapa: "descobrir_necessidade"
    },
    desconfiado: {
      estrategia: "Trabalhe credibilidade com factos e expectativas realistas.",
      perguntas: ["Que experiência anterior o deixou mais reticente?"],
      evitar: "Defender-se em excesso.",
      criterioAvanco: "Cliente explica origem da desconfiança.",
      criterioFimElegante: "Se não houver espaço relacional, encerrar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "descobrir_necessidade"
    },
    outra_imobiliaria: {
      estrategia: "Assuma postura colaborativa e diferencie execução, não discurso.",
      perguntas: ["Que parte do apoio atual considera insuficiente?"],
      evitar: "Confronto competitivo.",
      criterioAvanco: "Cliente reconhece espaço de melhoria.",
      criterioFimElegante: "Sem espaço de comparação, agradecer e fechar.",
      proximaDecisao: "avancar",
      proximaEtapa: "descobrir_necessidade"
    },
    questiona_comissao: {
      estrategia: "Conecte honorários com esforço, risco e previsibilidade do processo.",
      perguntas: ["Posso mostrar onde o acompanhamento reduz fricção e tempo?"],
      evitar: "Desconto como resposta imediata.",
      criterioAvanco: "Cliente aceita discutir valor entregue.",
      criterioFimElegante: "Se rejeitar enquadramento de valor, encerrar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "descobrir_necessidade"
    },
    sem_interesse: {
      estrategia: "Feche com elegância e deixe canal aberto para futuro.",
      perguntas: ["Quer que fique disponível caso mude de ideia?"],
      evitar: "Reabrir proposta após recusa clara.",
      criterioAvanco: "Nao aplicável.",
      criterioFimElegante: "Agradecer, reforçar disponibilidade futura e encerrar.",
      proximaDecisao: "encerrar",
      encerramento: "Compreendo perfeitamente. Obrigado pela transparência; fico ao dispor se no futuro fizer sentido retomar esta conversa."
    }
  },
  descobrir_necessidade: {
    receptivo: {
      estrategia: "Estruture necessidades por prioridade e prazo de decisão.",
      perguntas: ["Entre prazo, valor e previsibilidade, o que pesa mais para si?"],
      evitar: "Assumir critérios sem confirmação.",
      criterioAvanco: "Cliente define critério principal de decisão.",
      criterioFimElegante: "Se objetivo ficar indefinido e sem interesse em clarificar, encerrar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "quebrar_objecoes"
    },
    indeciso: {
      estrategia: "Use cenários simples para ajudar decisão sem pressão.",
      perguntas: ["Qual cenário o deixaria mais confortável para avançar?"],
      evitar: "Complexidade excessiva em opções.",
      criterioAvanco: "Cliente escolhe um cenário preferencial.",
      criterioFimElegante: "Sem escolha após simplificação, encerrar com respeito.",
      proximaDecisao: "avancar",
      proximaEtapa: "quebrar_objecoes"
    },
    neutro: {
      estrategia: "Transforme conversa em critérios mensuráveis.",
      perguntas: ["Que resultado mínimo justificaria avançar?"],
      evitar: "Ficar em generalidades.",
      criterioAvanco: "Cliente explicita mínimo aceitável.",
      criterioFimElegante: "Sem critério objetivo, fechar mantendo relação.",
      proximaDecisao: "avancar",
      proximaEtapa: "quebrar_objecoes"
    },
    com_pressa: {
      estrategia: "Capture apenas necessidade central e prazo imediato.",
      perguntas: ["Qual a decisão mais urgente para hoje?"],
      evitar: "Mapeamento completo nesta fase.",
      criterioAvanco: "Cliente confirma urgência e decisão crítica.",
      criterioFimElegante: "Sem janela de decisão, encerrar com proposta de retorno.",
      proximaDecisao: "avancar",
      proximaEtapa: "quebrar_objecoes"
    },
    desconfiado: {
      estrategia: "Valide critérios e mostre como serão respeitados no processo.",
      perguntas: ["Que condição precisa estar garantida para confiar no processo?"],
      evitar: "Minimizar receios.",
      criterioAvanco: "Cliente define condição de segurança.",
      criterioFimElegante: "Sem confiança mínima, encerrar com postura profissional.",
      proximaDecisao: "avancar",
      proximaEtapa: "quebrar_objecoes"
    },
    outra_imobiliaria: {
      estrategia: "Explore lacunas atuais sem invalidar trabalho existente.",
      perguntas: ["O que gostaria de ver diferente na condução da venda?"],
      evitar: "Disputa de mérito.",
      criterioAvanco: "Cliente identifica lacuna concreta.",
      criterioFimElegante: "Sem lacuna percebida, agradecer e encerrar.",
      proximaDecisao: "avancar",
      proximaEtapa: "quebrar_objecoes"
    },
    questiona_comissao: {
      estrategia: "Relacione objetivo do cliente com retorno operacional do serviço.",
      perguntas: ["Que resultado justificaria o investimento no acompanhamento?"],
      evitar: "Focar apenas no custo.",
      criterioAvanco: "Cliente reconhece relação entre suporte e resultado.",
      criterioFimElegante: "Sem abertura para valor, encerrar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "quebrar_objecoes"
    },
    sem_interesse: {
      estrategia: "Encerrar com respeito e disponibilidade futura.",
      perguntas: ["Posso manter contacto para uma oportunidade futura?"],
      evitar: "Persistência argumentativa.",
      criterioAvanco: "Nao aplicável.",
      criterioFimElegante: "Agradecer a conversa e terminar de forma cordial.",
      proximaDecisao: "encerrar",
      encerramento: "Agradeço a clareza. Fico disponível se no futuro precisar de apoio; será um prazer ajudar quando for o momento certo."
    }
  },
  quebrar_objecoes: {
    receptivo: {
      estrategia: "Confirme objeção residual e transforme em ação concreta.",
      perguntas: ["Existe algum ponto pendente antes de avançarmos?"],
      evitar: "Reabrir objeções já resolvidas.",
      criterioAvanco: "Sem objeções relevantes pendentes.",
      criterioFimElegante: "Se surgir bloqueio definitivo, fechar sem pressão.",
      proximaDecisao: "avancar",
      proximaEtapa: "agendar_visita"
    },
    indeciso: {
      estrategia: "Responder uma objeção de cada vez com clareza curta.",
      perguntas: ["Qual objeção devo tratar primeiro consigo?"],
      evitar: "Empilhar argumentos.",
      criterioAvanco: "Cliente reduz resistência principal.",
      criterioFimElegante: "Se objeção permanecer inegociável, encerrar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "agendar_visita"
    },
    neutro: {
      estrategia: "Teste aderência com proposta objetiva e reversível.",
      perguntas: ["Faz sentido avançarmos para um passo simples de validação?"],
      evitar: "Pressionar decisão final.",
      criterioAvanco: "Cliente aceita passo de validação.",
      criterioFimElegante: "Sem adesão a passo simples, encerrar com respeito.",
      proximaDecisao: "avancar",
      proximaEtapa: "agendar_visita"
    },
    com_pressa: {
      estrategia: "Trate apenas objeção crítica para manter fluidez.",
      perguntas: ["Qual é o único ponto que precisa resolver agora?"],
      evitar: "Debate completo de todas as objeções.",
      criterioAvanco: "Objeção crítica resolvida.",
      criterioFimElegante: "Sem tempo para resolver ponto crítico, encerrar e remeter retorno.",
      proximaDecisao: "avancar",
      proximaEtapa: "agendar_visita"
    },
    desconfiado: {
      estrategia: "Use prova de método, não promessa de resultado.",
      perguntas: ["Que evidência o ajudaria a ficar confortável?"],
      evitar: "Garantias absolutas.",
      criterioAvanco: "Cliente aceita avançar com condição validável.",
      criterioFimElegante: "Sem confiança mínima após clarificação, encerrar com elegância.",
      proximaDecisao: "avancar",
      proximaEtapa: "agendar_visita"
    },
    outra_imobiliaria: {
      estrategia: "Mostre complementaridade e ganho específico para o cliente.",
      perguntas: ["Que melhoria concreta justificaria experimentar outra abordagem?"],
      evitar: "Comparação destrutiva entre equipas.",
      criterioAvanco: "Cliente aceita testar diferencial concreto.",
      criterioFimElegante: "Sem abertura para teste, encerrar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "agendar_visita"
    },
    questiona_comissao: {
      estrategia: "Volte ao valor percebido e risco evitado no processo.",
      perguntas: ["Quer focar no resultado líquido esperado para decidir com segurança?"],
      evitar: "Negociar honorários por impulso.",
      criterioAvanco: "Cliente aceita discutir valor antes de preço.",
      criterioFimElegante: "Sem abertura para racional de valor, encerrar sem insistir.",
      proximaDecisao: "avancar",
      proximaEtapa: "agendar_visita"
    },
    sem_interesse: {
      estrategia: "Fechar de forma cordial, preservando confiança futura.",
      perguntas: ["Posso enviar um contacto para quando for oportuno?"],
      evitar: "Nova tentativa persuasiva após recusa.",
      criterioAvanco: "Nao aplicável.",
      criterioFimElegante: "Agradecer e concluir com respeito.",
      proximaDecisao: "encerrar",
      encerramento: "Agradeço o seu tempo e a honestidade. Fico disponível para apoiar sempre que fizer sentido no futuro."
    }
  },
  agendar_visita: {
    receptivo: {
      estrategia: "Propor duas opções objetivas e confirmar compromisso.",
      perguntas: ["Entre quarta às 18h e sábado às 11h, qual prefere?"],
      evitar: "Deixar visita sem data.",
      criterioAvanco: "Data e participantes confirmados.",
      criterioFimElegante: "Se agenda inviável neste momento, encerrar e retomar depois.",
      proximaDecisao: "avancar",
      proximaEtapa: "encerrar_contacto"
    },
    indeciso: {
      estrategia: "Reduzir risco percebido da visita com agenda flexível.",
      perguntas: ["Prefere uma visita curta apenas para validação inicial?"],
      evitar: "Forçar compromisso longo.",
      criterioAvanco: "Cliente aceita formato de visita mínima.",
      criterioFimElegante: "Sem disponibilidade para visita, terminar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "encerrar_contacto"
    },
    neutro: {
      estrategia: "Conectar visita ao benefício direto para decisão.",
      perguntas: ["A visita ajudaria a decidir com mais segurança?"],
      evitar: "Agendar sem propósito claro.",
      criterioAvanco: "Cliente reconhece utilidade prática da visita.",
      criterioFimElegante: "Sem utilidade percebida, encerrar com cordialidade.",
      proximaDecisao: "avancar",
      proximaEtapa: "encerrar_contacto"
    },
    com_pressa: {
      estrategia: "Oferecer janela curta e objetiva.",
      perguntas: ["Quer bloquear apenas 20 minutos para validação rápida?"],
      evitar: "Proposta de visita extensa.",
      criterioAvanco: "Cliente aceita janela curta.",
      criterioFimElegante: "Sem tempo disponível, fechar e remeter novo contacto.",
      proximaDecisao: "avancar",
      proximaEtapa: "encerrar_contacto"
    },
    desconfiado: {
      estrategia: "Reforçar controlo do cliente sobre a visita e próximos passos.",
      perguntas: ["Quer definir previamente o que será avaliado na visita?"],
      evitar: "Criar sensação de compromisso irreversível.",
      criterioAvanco: "Cliente aceita visita com critérios definidos.",
      criterioFimElegante: "Sem confiança para visita, encerrar de forma cordial.",
      proximaDecisao: "avancar",
      proximaEtapa: "encerrar_contacto"
    },
    outra_imobiliaria: {
      estrategia: "Posicionar visita como comparação técnica e sem conflito.",
      perguntas: ["Quer usar a visita para comparar abordagens com dados objetivos?"],
      evitar: "Exigir exclusividade nesta fase.",
      criterioAvanco: "Cliente aceita visita de benchmark.",
      criterioFimElegante: "Sem interesse em comparar, finalizar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "encerrar_contacto"
    },
    questiona_comissao: {
      estrategia: "Mostrar que visita ajuda a clarificar valor antes de negociar condições.",
      perguntas: ["Podemos validar no local o plano para maximizar resultado líquido?"],
      evitar: "Debater apenas preço sem contexto.",
      criterioAvanco: "Cliente aceita visita para clarificação de valor.",
      criterioFimElegante: "Sem abertura para validação, encerrar respeitosamente.",
      proximaDecisao: "avancar",
      proximaEtapa: "encerrar_contacto"
    },
    sem_interesse: {
      estrategia: "Interromper proposta de visita e encerrar cordialmente.",
      perguntas: ["Quer que mantenha o contacto para outra fase?"],
      evitar: "Pressionar agendamento após recusa.",
      criterioAvanco: "Nao aplicável.",
      criterioFimElegante: "Agradecer e encerrar sem insistência.",
      proximaDecisao: "encerrar",
      encerramento: "Entendido. Obrigado pelo seu tempo; fico disponível caso no futuro queira retomar o tema com tranquilidade."
    }
  },
  encerrar_contacto: {
    receptivo: {
      estrategia: "Consolidar acordos e reforçar confiança no próximo passo.",
      perguntas: ["Posso resumir o que ficou combinado para validar consigo?"],
      evitar: "Encerrar sem confirmação mútua.",
      criterioAvanco: "Cliente confirma resumo sem pendências.",
      criterioFimElegante: "Se surgir impedimento final, fechar com proposta de retomada.",
      proximaDecisao: "avancar",
      proximaEtapa: "proximo_passo"
    },
    indeciso: {
      estrategia: "Fechar com um compromisso mínimo e claro.",
      perguntas: ["Qual pequeno compromisso se sente confortável em assumir hoje?"],
      evitar: "Exigir definição completa no fecho.",
      criterioAvanco: "Cliente aceita compromisso mínimo.",
      criterioFimElegante: "Sem compromisso possível, encerrar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "proximo_passo"
    },
    neutro: {
      estrategia: "Formalizar próximo contacto com objetividade.",
      perguntas: ["Podemos fixar já o próximo ponto de contacto?"],
      evitar: "Fecho aberto sem data/canal.",
      criterioAvanco: "Canal e momento de continuidade definidos.",
      criterioFimElegante: "Sem disponibilidade para continuidade, encerrar com respeito.",
      proximaDecisao: "avancar",
      proximaEtapa: "proximo_passo"
    },
    com_pressa: {
      estrategia: "Concluir em 30 segundos com confirmação essencial.",
      perguntas: ["Confirmo apenas o próximo contacto para não perdermos o timing?"],
      evitar: "Adicionar novos tópicos no fecho.",
      criterioAvanco: "Confirmação rápida obtida.",
      criterioFimElegante: "Sem tempo para confirmar, terminar cordialmente.",
      proximaDecisao: "avancar",
      proximaEtapa: "proximo_passo"
    },
    desconfiado: {
      estrategia: "Reforçar previsibilidade do que acontece a seguir.",
      perguntas: ["Quer que detalhe exatamente o próximo passo antes de terminarmos?"],
      evitar: "Ambiguidade no follow-up.",
      criterioAvanco: "Cliente entende e aceita sequência.",
      criterioFimElegante: "Se desconforto persistir, encerrar com abertura futura.",
      proximaDecisao: "avancar",
      proximaEtapa: "proximo_passo"
    },
    outra_imobiliaria: {
      estrategia: "Fechar com postura profissional e sem confrontação.",
      perguntas: ["Quer manter contacto aberto para eventual reavaliação futura?"],
      evitar: "Pressionar mudança imediata.",
      criterioAvanco: "Cliente aceita contacto aberto.",
      criterioFimElegante: "Sem abertura, agradecer e encerrar elegantemente.",
      proximaDecisao: "avancar",
      proximaEtapa: "proximo_passo"
    },
    questiona_comissao: {
      estrategia: "Encerrar com racional objetivo de valor e próximos critérios.",
      perguntas: ["Quer que no próximo contacto foquemos apenas no cenário líquido?"],
      evitar: "Concluir sem alinhar critério financeiro.",
      criterioAvanco: "Cliente concorda com critério de decisão.",
      criterioFimElegante: "Sem alinhamento financeiro possível, encerrar com respeito.",
      proximaDecisao: "avancar",
      proximaEtapa: "proximo_passo"
    },
    sem_interesse: {
      estrategia: "Encerrar de forma limpa e cordial.",
      perguntas: ["Agradeço o tempo. Posso manter o meu contacto consigo?"],
      evitar: "Nova tentativa de reversão no fecho.",
      criterioAvanco: "Nao aplicável.",
      criterioFimElegante: "Agradecer, respeitar decisão e finalizar.",
      proximaDecisao: "encerrar",
      encerramento: "Muito obrigado pela conversa e pela clareza. Respeito totalmente a sua decisão e fico ao dispor para qualquer necessidade futura."
    }
  },
  proximo_passo: {
    receptivo: {
      estrategia: "Definir ação final com dono, canal e prazo.",
      perguntas: ["Confirmamos então o próximo contacto para [canal/horário]?"],
      evitar: "Fechar sem responsabilidade atribuída.",
      criterioAvanco: "Responsável e prazo confirmados.",
      criterioFimElegante: "Se não confirmar, encerrar deixando canal aberto.",
      proximaDecisao: "encerrar",
      encerramento: "Excelente, ficou tudo alinhado. Agradeço o seu tempo e seguimos conforme combinado."
    },
    indeciso: {
      estrategia: "Encerrar com passo mínimo e sem pressão.",
      perguntas: ["Quer que fiquemos apenas com um ponto de contacto de segurança?"],
      evitar: "Forçar compromisso extenso.",
      criterioAvanco: "Cliente aceita passo mínimo.",
      criterioFimElegante: "Sem aceite, concluir com cordialidade.",
      proximaDecisao: "encerrar",
      encerramento: "Sem problema. Obrigado pelo tempo e pela abertura; fico disponível quando for o momento certo para retomar."
    },
    neutro: {
      estrategia: "Concluir com clareza objetiva e relacionamento preservado.",
      perguntas: ["Posso confirmar o melhor canal para eventual continuidade?"],
      evitar: "Encerrar sem referência futura.",
      criterioAvanco: "Canal futuro validado.",
      criterioFimElegante: "Sem canal validado, encerrar com elegância.",
      proximaDecisao: "encerrar",
      encerramento: "Obrigado pela conversa de hoje. Fico ao dispor para apoiar quando for oportuno para si."
    },
    com_pressa: {
      estrategia: "Finalizar rapidamente com uma única confirmação útil.",
      perguntas: ["Confirmo apenas o melhor horário para voltar a falar?"],
      evitar: "Introduzir novos temas no encerramento.",
      criterioAvanco: "Cliente confirma horário/canal.",
      criterioFimElegante: "Sem tempo para confirmar, encerrar de forma cordial.",
      proximaDecisao: "encerrar",
      encerramento: "Perfeito, não vou tomar mais tempo. Obrigado e fico disponível para falarmos no momento mais conveniente."
    },
    desconfiado: {
      estrategia: "Fechar com total transparência e autonomia do cliente.",
      perguntas: ["Quer que deixe por escrito apenas o próximo passo, sem compromisso?"],
      evitar: "Forçar decisão de confiança.",
      criterioAvanco: "Cliente aceita contato objetivo futuro.",
      criterioFimElegante: "Sem confiança para continuidade, encerrar respeitosamente.",
      proximaDecisao: "encerrar",
      encerramento: "Agradeço a sinceridade e o seu tempo. Fico disponível para retomar quando se sentir confortável."
    },
    outra_imobiliaria: {
      estrategia: "Concluir com respeito ao contexto atual do cliente.",
      perguntas: ["Posso ficar como contacto alternativo para futuras necessidades?"],
      evitar: "Insistir em mudança imediata.",
      criterioAvanco: "Cliente aceita canal alternativo.",
      criterioFimElegante: "Sem interesse em canal alternativo, encerrar cordialmente.",
      proximaDecisao: "encerrar",
      encerramento: "Obrigado pela conversa e pela transparência. Respeito o seu contexto atual e fico disponível se precisar no futuro."
    },
    questiona_comissao: {
      estrategia: "Fechar com critério racional para eventual retorno.",
      perguntas: ["Quer que, num próximo contacto, foquemos apenas cenário líquido e decisão?"],
      evitar: "Encerrar em tensão negocial.",
      criterioAvanco: "Cliente aceita critério de retorno.",
      criterioFimElegante: "Sem base comum, encerrar sem pressão.",
      proximaDecisao: "encerrar",
      encerramento: "Obrigado pelo tempo e pela objetividade. Quando quiser reavaliar com foco no resultado líquido, fico totalmente disponível."
    },
    sem_interesse: {
      estrategia: "Encerrar imediatamente de forma cordial e humana.",
      perguntas: ["Posso apenas agradecer e deixar o meu contacto?"],
      evitar: "Qualquer tentativa de insistência.",
      criterioAvanco: "Nao aplicável.",
      criterioFimElegante: "Encerrar com respeito e abertura futura.",
      proximaDecisao: "encerrar",
      encerramento: "Compreendo e agradeço o seu tempo. Desejo-lhe o maior sucesso e fico disponível para ajudar no futuro, se fizer sentido."
    }
  }
});

function obterIndiceSeguro(stepIndex) {
  return Math.min(Math.max(0, stepIndex), ETAPAS_COPILOTO.length - 1);
}

function obterEtapaAtual(stepIndex) {
  return ETAPAS_COPILOTO[obterIndiceSeguro(stepIndex)];
}

export function criarEstadoInicialCopiloto() {
  return {
    fase: "prompt",
    stepIndex: 0,
    estadoConversa: ""
  };
}

export function obterEtapaCopilotoPorIndice(stepIndex) {
  const etapa = obterEtapaAtual(stepIndex);
  const base = BASE_ETAPAS[etapa.key];

  return {
    etapa: {
      key: etapa.key,
      objetivo: base.objetivo,
      perguntas: base.perguntas,
      sinais: base.sinais,
      estados: COPILOTO_ESTADOS_CLIENTE
    },
    stepIndex: obterIndiceSeguro(stepIndex),
    total: ETAPAS_COPILOTO.length
  };
}

export function processarRespostaCopiloto({ stepIndex, estadoKey, ultimoEstado }) {
  const etapa = obterEtapaAtual(stepIndex);
  const regraEtapa = REGRAS_POR_ETAPA_ESTADO[etapa.key] || {};
  const regra = regraEtapa[estadoKey] || regraEtapa.neutro;

  if (!regra) {
    return {
      fase: "strategy",
      stepIndex: obterIndiceSeguro(stepIndex),
      estadoConversa: estadoKey,
      estrategia: "",
      perguntas: [],
      sinais: "",
      evitar: "",
      criterioAvanco: "",
      criterioFimElegante: "",
      encerramento: "",
      finalizar: false,
      nextStepIndex: obterIndiceSeguro(stepIndex)
    };
  }

  const estrategiaComContexto = ultimoEstado && ultimoEstado !== estadoKey
    ? `${regra.estrategia} Ajuste o tom para refletir a mudança de postura do cliente.`
    : regra.estrategia;

  const nextStepIndex = regra.proximaDecisao === "avancar"
    ? Math.min(obterIndiceSeguro(stepIndex) + 1, ETAPAS_COPILOTO.length - 1)
    : obterIndiceSeguro(stepIndex);

  return {
    fase: "strategy",
    stepIndex: obterIndiceSeguro(stepIndex),
    estadoConversa: estadoKey,
    estrategia: estrategiaComContexto,
    perguntas: regra.perguntas,
    sinais: BASE_ETAPAS[etapa.key].sinais,
    evitar: regra.evitar,
    criterioAvanco: regra.criterioAvanco,
    criterioFimElegante: regra.criterioFimElegante,
    encerramento: regra.encerramento || "",
    finalizar: regra.proximaDecisao === "encerrar",
    nextStepIndex
  };
}

export function avancarCopiloto(nextStepIndex) {
  return {
    ...criarEstadoInicialCopiloto(),
    stepIndex: obterIndiceSeguro(nextStepIndex)
  };
}

export function voltarUmPassoCopiloto(stepIndex) {
  return avancarCopiloto(Math.max(0, stepIndex - 1));
}
