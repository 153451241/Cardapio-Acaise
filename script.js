
/*
  ==========================================================
  SCRIPT.JS (VERSÃO FINAL 6.0 - BOTÃO GPS ADICIONADO)
  - Sem Firebase, com Worker/Pusher
  - Com Mapa/Pino (Leaflet)
  - Lógica do "Monte seu Açaí" MANTIDA
  - Bug do DOMContentLoaded CORRIGIDO
  - Lógica de busca (Rua > Bairro) CORRIGIDA
  - ADICIONADO botão "Usar minha localização atual"
  ==========================================================
*/
// ==========================================================
// ESTADO GLOBAL (ATUALIZADO PARA NUVEM ☁️)
// ==========================================================
// 👇 URL do seu Worker (Se mudar o worker, mude aqui também)
const API_BASE_URL = "https://api-pedidos-novo-cliente.gabrielsoarestte.workers.dev";

const sacola = []; // { name, price, obs }
let produtoAtual = null;
let precoBase = 0;
let nomeCliente = "Cliente"; // Padrão


// Agora estas listas começam vazias e são preenchidas pela nuvem ao abrir o site
let itensPausados = [];
let adicionaisPausados = [];

window.taxaCalculada = false; // "Trava" do botão de confirmar


// ==========================================================
// DECLARAÇÃO DE ELEMENTOS (BLOCO CORRIGIDO)
// ==========================================================
let listaSacola,
  totalSacola,
  modal,
  modalClose,
  modalImg,
  modalTitle,
  modalDesc,
  modalPrice,
  modalObs,
  modalAdd,
  inputRetirada,
  infoRetirada,
  revisao,
  revisaoClose,
  btnRevisar,
  revisaoLista,
  revSubtotal,
  revTaxa,
  revTotal,
  inputEndereco,
  inputTaxa,
  revisaoConfirmar,
  btnFlutuante,
  btnCarrinhoNovo,
  btnModerador,
  btnGerenciarAdicionais,
  painelAdicionais,
  listaAdicionais,
  popupTroco,
  resumoTroco,
  btnConfirmarTroco,
  modalNome,
  inputNome,
  btnConfirmarNome,
  modalSucesso,
  modalFloatPrice,  // <-- Com vírgula
  btnConfirmarPino; // <-- Termina com ponto e vírgula

// ==========================================================
// FUNÇÕES AUXILIARES (Utils)
// ==========================================================

const brl = (n) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

function updateModalState(isOpening) {
  document.body.classList.toggle("modal-open", isOpening);
  if (btnCarrinhoNovo) {
    if (isOpening) {
      btnCarrinhoNovo.style.display = "none";
    } else {
      btnCarrinhoNovo.style.display = "";
      atualizarCarrinhoNovo();
    }
  }
}

function fecharModal(ref) {
  if (!ref) return;
  ref.setAttribute("aria-hidden", "true");
  updateModalState(false);
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
}

function showConfirmPopup() {
  const popup = document.createElement("div");
  popup.className = "confirm-popup";
  popup.textContent = "✅ Adicionado à sacola!";
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.classList.add("visible");
  }, 10);
  setTimeout(() => {
    popup.classList.remove("visible");
    setTimeout(() => popup.remove(), 300);
  }, 1500);
}

// ==========================================================
// FUNÇÕES PRINCIPAIS (Lógica do Cardápio)
// ==========================================================

function atualizarBotaoFlutuante() {
  if (!btnFlutuante) return;
  const contador = document.getElementById("count-itens");
  const valorItens = document.getElementById("valor-itens");
  if (!contador || !valorItens) return;
  const qtd = sacola.length;
  const total = sacola.reduce((acc, it) => acc + it.price, 0);
  if (qtd > 0) {
    btnFlutuante.style.removeProperty("display");
    btnFlutuante.classList.remove("hidden");
    contador.textContent = String(qtd);
    valorItens.textContent = brl(total);
    btnFlutuante.onclick = () => {
      if (sacola.length === 0) return;
      preencherRevisao();
      revisao.setAttribute("aria-hidden", "false");
      updateModalState(true);
    };
  } else {
    btnFlutuante.classList.add("hidden");
    btnFlutuante.style.removeProperty("display");
  }
}

function atualizarCarrinhoNovo() {
  if (!btnCarrinhoNovo) return;
  const count = document.getElementById("novoCount");
  const totalEl = document.getElementById("novoTotal");
  if (!count || !totalEl) return;

  const qtd = sacola.length;
  const total = sacola.reduce((acc, it) => acc + it.price, 0);

  const modalAberto =
    (modal && modal.getAttribute("aria-hidden") === "false") ||
    (revisao && revisao.getAttribute("aria-hidden") === "false") ||
    (modalNome && modalNome.style.display === "flex") ||
    (modalSucesso && modalSucesso.style.display === "flex") ||
    (document.getElementById("modal-acai-builder") &&
      document
        .getElementById("modal-acai-builder")
        .classList.contains("aberto")) ||
    (document.getElementById("map-modal-container") &&
      document
        .getElementById("map-modal-container")
        .classList.contains("aberto"));

  if (qtd > 0 && !modalAberto) {
    btnCarrinhoNovo.classList.remove("hidden");
    count.textContent = qtd;
    totalEl.textContent = brl(total);
  } else {
    btnCarrinhoNovo.classList.add("hidden");
  }
}

function aplicarLimiteInicial(limite) {
    // console.warn("Função antiga chamada, ignorando...");
    // A lógica real agora está dentro de configurarToppingsDinamicos
}

function atualizarSacola() {
  if (!listaSacola || !totalSacola) return;
  listaSacola.innerHTML = "";
  let total = 0;
  sacola.forEach((it, idx) => {
    total += it.price;
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="li-info">
${it.name}
${it.obs ? `<br/><small style="opacity:.8">obs: ${it.obs}</small>` : ""}
      </div>
      <span style="font-weight: 500; margin: 0 10px;">${brl(it.price)}</span>
      <button class="btn-remove" data-idx="${idx}">Remover</button>
    `;
    listaSacola.appendChild(li);
  });
  totalSacola.innerHTML = `<strong>Total:</strong> ${brl(total)}`;
  atualizarBotaoFlutuante();
  atualizarCarrinhoNovo();
  if (
    sacola.length === 0 &&
    revisao &&
    revisao.getAttribute("aria-hidden") === "false"
  ) {
    fecharModal(revisao);
  }
}

window.atualizarTotalComTaxa = function () {
  if (!revSubtotal || !inputTaxa || !revTotal || !revTaxa) return;
  const subtotal =
    parseFloat(
      revSubtotal.textContent.replace("R$", "").replace(",", ".").trim()
    ) || 0;
  const taxa = parseFloat(inputTaxa.value) || 0;
  const total = subtotal + taxa;
  revTotal.innerText = brl(total);
  revTaxa.innerText = brl(taxa);
};

window.atualizarBotaoWhatsApp = function () {
  if (!revisaoConfirmar || !inputEndereco) return;
  const tipoRadio = document.querySelector('input[name="tipoEntrega"]:checked');
  const tipo = tipoRadio ? tipoRadio.value : "entrega";

  let botaoDesabilitado = true;
  if (tipo === "entrega") {
    const ruaInput = document.getElementById("rua");
    const rua = ruaInput ? ruaInput.value.trim() : "";
    botaoDesabilitado = !window.taxaCalculada || !rua;
  } else {
    botaoDesabilitado = false;
  }

  revisaoConfirmar.disabled = botaoDesabilitado;
  revisaoConfirmar.style.opacity = botaoDesabilitado ? 0.5 : 1;
};

function preencherRevisao() {
  if (!revisaoLista || !revSubtotal) return;
  revisaoLista.innerHTML = "";
  let subtotal = 0;
  sacola.forEach((it, idx) => {
    subtotal += it.price;
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="li-info">
${it.name}
${it.obs ? `<br/><small style="opacity:.8">obs: ${it.obs}</small>` : ""}
      </div>
      <span style="font-weight: 500; margin: 0 10px;">${brl(it.price)}</span>
      <button class="btn-remove" data-idx="${idx}">Remover</button>
    `;
    revisaoLista.appendChild(li);
  });
  revSubtotal.textContent = brl(subtotal);
  window.atualizarTotalComTaxa();
  window.atualizarBotaoWhatsApp();
}

function abrirModalProduto(el) {
  // A linha errada que estava aqui foi REMOVIDA
  if (!modal || !modalImg || !modalTitle || !modalDesc || !modalObs || !modalPrice) return;

  const name = el.dataset.name;
  const price = parseFloat(el.dataset.price);
  const desc = el.dataset.desc || "";
  const img = el.dataset.img || "";

  produtoAtual = el;
  precoBase = price;

  modalImg.src = img;
  modalImg.alt = name;
  modalTitle.textContent = name;
  modalDesc.textContent = desc;
  modalObs.value = "";

  const modalOpcoes = document.getElementById("modalOpcoes");
  if (!modalOpcoes) return;
  modalOpcoes.innerHTML = "";

  // --- FUNÇÃO INTERNA DE ATUALIZAR PREÇO ---
  function atualizarPrecoModal() {
    let total = precoBase;

    // 1. Soma Radios (Tamanho ou Molho Grátis)
    modal.querySelectorAll('.opcoes-modal input[type="radio"]:checked').forEach(radio => {
        total += parseFloat(radio.dataset.extra || 0);
    });

    // 2. Soma extras de quantidade (+/-)
    modal.querySelectorAll(".opcoes-modal .extra").forEach((ex) => {
      const input = ex.querySelector("input");
      const qtdEl = ex.querySelector(".qtd");
      if (qtdEl && input) {
          total += (parseInt(qtdEl.textContent) || 0) * parseFloat(input.dataset.extra || 0);
      }
    });

    // 3. Soma Checkboxes PAGOS (ignora os .free-check)
    modal.querySelectorAll('.opcoes-modal input[type="checkbox"]:not(.free-check):checked').forEach(chk => {
         total += parseFloat(chk.dataset.extra || 0);
    });

    // ATUALIZA OS PREÇOS (O escondido e o flutuante)
    modalPrice.textContent = brl(total);
    // 👇 CORRIGIDO: Usa a variável certa (precoTotalFlutuante) que busca o ID certo (modalFloatPrice)
   if (modalFloatPrice) modalFloatPrice.textContent = brl(total);
  }

  // --- CLONA E PREPARA AS OPÇÕES ---
  const blocoOpcoes = el.querySelector(".opcoes-produto");
  if (blocoOpcoes) {
    const clone = blocoOpcoes.cloneNode(true);
    clone.classList.remove("opcoes-produto");
    clone.classList.add("opcoes-modal");
    modalOpcoes.appendChild(clone);

    // Listener para Radios e Checkboxes Pagos
    clone.querySelectorAll('input[type="radio"], input[type="checkbox"]:not(.free-check)').forEach(i => {
        i.addEventListener("change", atualizarPrecoModal);
    });

// O CÓDIGO ANTERIOR À LÓGICA DE LIMITE DEVE VIR AQUI.
// Assumindo que 'clone' é a div do item (<div class="item" ...>) no modal.

// -------------------------------------------------------------
// VARIÁVEIS DE ESCOPO
// -------------------------------------------------------------

const freeGroup = clone.querySelector('.free-topping-group');
const freeChecks = freeGroup ? freeGroup.querySelectorAll('.free-check') : [];

// Função para ler o limite ATUALIZADO (lê o atributo data-limit do HTML)
const getLimite = () => {
    return freeGroup ? parseInt(freeGroup.dataset.limit || 4) : 4; 
};

// ** FUNÇÃO CRÍTICA **: Aplica o limite. Aceita 'limiteForcado' para garantir o valor correto.
const aplicarLimiteInicial = (limiteForcado) => {
    if (!freeGroup) return;

    // Se um limite forçado for passado (pelo Bloco 1), usa ele. Se não, lê o data-limit atual.
    const limite = limiteForcado || getLimite(); 
    const marcados = freeGroup.querySelectorAll('.free-check:checked').length;
    
    freeChecks.forEach(el => {
        if (marcados >= limite && !el.checked) {
            el.disabled = true;
        } else {
            el.disabled = false;
        }
    });
};


// -------------------------------------------------------------
// BLOCO 1: LÓGICA DE TAMANHO PARA MUDAR O LIMITE (data-limit) E RESETAR
// -------------------------------------------------------------

const sizeRadios = clone.querySelectorAll(
    'input[name="tamanho_artesanal"], input[name="tamanho_mel"], input[name="tamanho_cupuacai"]'
);

if (sizeRadios.length > 0 && freeGroup) {
    
    // Função para atualizar o data-limit, o título e, o mais importante, RESETAR os checks.
    const atualizarLimiteEChecks = (event) => {
        let novoLimite = 2; // Limite padrão
        let tituloVisual = '🤩 Escolha até 2 Grátis (3 Para de 700ml)'; // Título padrão
        
        // Verifica o tamanho selecionado.
        const tamanho = event.target.value; 

        if (tamanho === "700ml") {
            novoLimite = 3; // Limite sobe para 3
            tituloVisual = '🤩 Escolha até 3 Grátis';
        }
        
        // 1. ATUALIZA O ATRIBUTO data-limit
        freeGroup.setAttribute('data-limit', novoLimite);
        
        // 2. CORREÇÃO DO BUG: Reseta todos os checkboxes
        freeChecks.forEach(chk => {
            chk.checked = false;
            chk.disabled = false;
        });

        // 3. ATUALIZA O TÍTULO VISUAL
        const tituloH4 = freeGroup.previousElementSibling; 
        if (tituloH4 && tituloH4.tagName === 'H4') {
             tituloH4.textContent = tituloVisual;
        }

        // 4. CHAMA A FUNÇÃO DE LIMITE PASSANDO O VALOR DIRETO (GARANTIA DE 3)
        // Isso garante que o limite de 3 seja aplicado imediatamente.
        aplicarLimiteInicial(novoLimite); 
        
        atualizarPrecoModal(); 
    };
    
    // Adiciona o listener de evento para os rádios de tamanho
    sizeRadios.forEach(radio => {
        radio.addEventListener('change', atualizarLimiteEChecks);
    });

    // Chama a função para o rádio checked inicial (300ml)
    const initialRadio = clone.querySelector('input[name="tamanho_artesanal"]:checked');
    if (initialRadio) {
        // Simula o evento inicial para aplicar o limite de 2 ao abrir o modal
        atualizarLimiteEChecks({target: initialRadio});
    }
}


// -------------------------------------------------------------
// BLOCO 2: LÓGICA DE LIMITE (USANDO AS FUNÇÕES DO ESCOPO)
// -------------------------------------------------------------

if (freeGroup) {
    
    freeChecks.forEach(chk => {
        chk.addEventListener('change', () => {
            // No evento de mudança do checkbox, chamamos sem forçar, e ele lê o data-limit atual
            // A lógica de trava/liberação é re-aplicada.
            aplicarLimiteInicial(); 
            atualizarPrecoModal(); 
        });
    });

    // Se o Bloco 1 não foi chamado (ou para qualquer caso de fallback), chamamos aqui.
    // Remover a chamada aqui pode causar erro se o Bloco 1 não rodar.
    // aplicarLimiteInicial(); 

}

    // Configura os botões de + e -
    clone.querySelectorAll(".qtd-control").forEach((ctrl) => {
      const menos = ctrl.querySelector(".menos");
      const mais = ctrl.querySelector(".mais");
      const qtdEl = ctrl.querySelector(".qtd");
      if (menos && mais && qtdEl) {
        menos.addEventListener("click", (e) => {
          e.stopPropagation();
          let val = parseInt(qtdEl.textContent);
          if (val > 0) {
            qtdEl.textContent = val - 1;
            atualizarPrecoModal();
          }
        });
        mais.addEventListener("click", (e) => {
          e.stopPropagation();
          let val = parseInt(qtdEl.textContent);
          qtdEl.textContent = val + 1;
          atualizarPrecoModal();
        });
      }
    });
  }

  // FORÇA A SELEÇÃO DO PRIMEIRO RADIO (Tamanho, Molho, etc)
  const primeiroRadio = modalOpcoes.querySelector('input[type="radio"]');
  if (primeiroRadio) primeiroRadio.checked = true;

  // Finaliza a abertura do modal
  atualizarPrecoModal(); // Calcula o preço inicial (com o 1º radio marcado)
  modal.setAttribute("aria-hidden", "false");
  updateModalState(true);
}

// ==========================================================
// 🔥 FUNÇÃO ENVIARPEDIDO (VERSÃO CLOUDFLARE WORKER) 🔥
// ==========================================================
async function enviarPedido() {
  const codigoPedido = gerarCodigoPedido(nomeCliente);
  if (sacola.length === 0) return alert("Sua sacola está vazia!");

  window.atualizarBotaoWhatsApp();
  if (revisaoConfirmar && revisaoConfirmar.disabled) {
    return alert(
      "Por favor, confirme o endereço no mapa e preencha a Rua/Número."
    );
  }

  const tipoRadio = document.querySelector('input[name="tipoEntrega"]:checked');
  const tipoEntrega = tipoRadio ? tipoRadio.value : "entrega";
  const taxa = inputTaxa ? parseFloat(inputTaxa.value || "0") : 0;

  let enderecoFinal = "Retirada no local";
  if (tipoEntrega === "entrega") {
    const bairroInput = document.getElementById("endereco");
    const ruaInput = document.getElementById("rua");
    const complementoInput = document.getElementById("complemento");

    const bairro = bairroInput ? bairroInput.value.trim() : "";
    const rua = ruaInput ? ruaInput.value.trim() : "";
    const complemento = complementoInput ? complementoInput.value.trim() : "";

    if (!bairro || !rua) {
      alert(
        "Para entrega, por favor preencha os campos 'Bairro' e 'Rua e Número'."
      );
      return;
    }
    enderecoFinal = `${rua}, ${bairro}`;
    if (complemento) {
      enderecoFinal += `, ${complemento}`;
    }
  }

  const subtotal = sacola.reduce((acc, it) => acc + it.price, 0);
  const totalFinal = subtotal + (isNaN(taxa) ? 0 : taxa);
  const pagRadio = document.querySelector('input[name="pagamento"]:checked');
  const formaPagamento = pagRadio ? pagRadio.value : "Cartão";
  let obsPagamento = "";

  if (formaPagamento === "Dinheiro") {
    obsPagamento = resumoTroco ? resumoTroco.textContent.trim() : "";
    if (!obsPagamento) {
      return alert(
        "Se o pagamento é em dinheiro, por favor, informe o valor para troco."
      );
    }
  }

  const pedido = {
    codigo: codigoPedido,
    nomeCliente: nomeCliente,
    endereco: enderecoFinal,
    itens: sacola,
    subtotal,
    taxa,
    total: totalFinal,
    pagamento: formaPagamento,
    obsPagamento: obsPagamento || null,
    status: "pendente",
    data: new Date().toISOString(),
  };

  if (revisaoConfirmar) {
    revisaoConfirmar.disabled = true;
    revisaoConfirmar.textContent = "Enviando...";
  }

  try {
    // ⚠️ COLE A URL DO SEU WORKER AQUI ⚠️
    const workerUrl = "https://api-pedidos-novo-cliente.gabrielsoarestte.workers.dev"; // 👈 SUA URL AQUI

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pedido),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Erro ao contatar a loja.");
    }

    console.log("Pedido enviado para o Worker:", result.message);

    // --- INÍCIO DA MUDANÇA ---
    // Gera o link e abre o WhatsApp em uma nova aba
    const linkZap = gerarLinkWhatsApp(pedido);
    window.open(linkZap, '_blank');
    // --- FIM DA MUDANÇA ---

    const modalSucesso = document.getElementById("modal-sucesso");
    if (modalSucesso) {
      modalSucesso.style.display = "flex";
      updateModalState(true);
    } else {
      alert("Pedido enviado com sucesso para a loja!");
    }

    sacola.length = 0;
    atualizarSacola();
    fecharModal(revisao);
  } catch (err) {
    console.error("❌ Erro ao enviar pedido para o Worker:", err);
    alert("Erro ao enviar o pedido. Tente novamente.");
  } finally {
    if (revisaoConfirmar) {
      revisaoConfirmar.disabled = false;
      revisaoConfirmar.textContent = "✅ Confirmar Pedido";
    }
  }
}

// ==========================================================
// FUNÇÕES DE ADMIN (Moderador, Adicionais)
// ==========================================================

function prepararCardsModerador() {
  document.querySelectorAll(".item").forEach((card) => {
    if (card.querySelector('.btn-pausar')) return;

    const btnPausar = document.createElement('button');
    btnPausar.className = 'btn-pausar';
    btnPausar.innerHTML = itensPausados.includes(card.dataset.name) ? '▶️' : '⏸️'; // Já nasce com o ícone certo
    btnPausar.style.cssText = `position: absolute; top: 10px; right: 10px; z-index: 9; background: ${itensPausados.includes(card.dataset.name) ? '#4CAF50' : '#ffc107'}; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px;`;

    btnPausar.onclick = async (e) => {
        e.stopPropagation();
        const nome = card.dataset.name;

        // --- Lógica Nova ---
        if (itensPausados.includes(nome)) {
            itensPausados = itensPausados.filter(p => p !== nome);
        } else {
            itensPausados.push(nome);
        }
        aplicarPausasVisuais(); // Atualiza a tela imediatamente
        await salvarStatusLoja(); // Salva na nuvem em segundo plano
        // -------------------
    };

    card.style.position = 'relative';
    card.appendChild(btnPausar);
  });
}

function initModerador() {
  const senhaModerador = "acai123"; // ⚠️ MUDE A SENHA DE ADMIN ⚠️
  if (!btnModerador) return;
  btnModerador.addEventListener("click", () => {
    const senha = prompt("Digite a senha do modo moderador:");
    if (senha !== senhaModerador) return alert("❌ Senha incorreta!");
    document.body.classList.toggle("modoModerador");
    const ativo = document.body.classList.contains("modoModerador");
    const aviso = document.querySelector(".moderador-ativo");
    if (ativo) {
      alert("✅ Modo moderador ativado!");
      if (!aviso) {
        const novoAviso = document.createElement("div");
        novoAviso.className = "moderador-ativo";
        novoAviso.textContent = "🟢 Modo Moderador ativo";
        document.body.appendChild(novoAviso);
      }
      prepararCardsModerador();
    } else {
      alert("🟡 Modo moderador desativado.");
      if (aviso) aviso.remove();
    }
    if (btnGerenciarAdicionais) {
      btnGerenciarAdicionais.style.display = ativo ? "inline-block" : "none";
    }
  });
}



function atualizarEstadoExtras() {
  // Pega todas as DIVs de adicionais (.extra)
  const todosExtras = document.querySelectorAll(".extra");

  todosExtras.forEach((extraDiv) => {
    const input = extraDiv.querySelector("input[type='hidden']");
    if (!input) return;

    const nomeAdicional = input.value;
    // Se estiver na lista de pausados, esconde com display: none
    if (adicionaisPausados.includes(nomeAdicional)) {
        extraDiv.style.display = 'none';
    } else {
        // Restaura o display original (geralmente flex ou block)
        extraDiv.style.display = '';
    }
  });
}

function abrirPainelAdicionais() {
  if (!listaAdicionais || !painelAdicionais) return;

  // Procura todos os inputs de adicionais escondidos nos produtos
  const todosItens = document.querySelectorAll(".item .extra input[type='hidden']");
  const nomesUnicos = new Map();

  todosItens.forEach((input) => {
    const valor = input.value;
    // Usa o valor como nome, evita duplicados
    if (valor && !nomesUnicos.has(valor)) {
      nomesUnicos.set(valor, valor);
    }
  });

  listaAdicionais.innerHTML = "";
  // Ordena alfabeticamente
  const itensOrdenados = [...nomesUnicos.entries()].sort((a, b) => a[1].localeCompare(b[1]));

  if (itensOrdenados.length === 0) {
      listaAdicionais.innerHTML = "<p style='color: #ccc'>Nenhum adicional encontrado nos produtos.</p>";
  }

  itensOrdenados.forEach(([valor, nomeAmigavel]) => {
    const li = document.createElement("li");
    li.style.cssText = "margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;";

    const span = document.createElement("span");
    span.textContent = nomeAmigavel;
    span.style.color = "#fff";

    const btn = document.createElement("button");
    const isPausado = adicionaisPausados.includes(valor);
    btn.textContent = isPausado ? "▶️ ATIVAR" : "⏸️ PAUSAR";
    btn.style.cssText = `padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; color: #000; background: ${isPausado ? '#4CAF50' : '#ffc107'}`;

// ... dentro do loop forEach ...
    btn.addEventListener("click", async () => {
      // --- Lógica Nova ---
      adicionaisPausados = adicionaisPausados.includes(valor)
        ? adicionaisPausados.filter((n) => n !== valor)
        : [...adicionaisPausados, valor];

      aplicarPausasVisuais(); // Atualiza visualmente
      abrirPainelAdicionais(); // Atualiza a lista do painel
      await salvarStatusLoja(); // Salva na nuvem
      // -------------------
    });

    li.appendChild(span);
    li.appendChild(btn);
    listaAdicionais.appendChild(li);
  });

  painelAdicionais.setAttribute("aria-hidden", "false");
  updateModalState(true);
}

window.fecharPainelAdicionais = function () {
  if (!painelAdicionais) return;
  painelAdicionais.setAttribute("aria-hidden", "true");
  updateModalState(false);
};

function initPainelAdicionais() {
  if (!btnGerenciarAdicionais || !painelAdicionais || !listaAdicionais) {
    console.warn("⚠️ Elementos do painel de adicionais não encontrados.");
    return;
  }
  btnGerenciarAdicionais.addEventListener("click", abrirPainelAdicionais);
  atualizarEstadoExtras();
}

// ===================================================================
// ===== INICIALIZAÇÃO (BLOCO ÚNICO CORRIGIDO) =====
// ===================================================================

document.addEventListener("DOMContentLoaded", () => {
  // 🔥 CARREGA O STATUS DA NUVEM ASSIM QUE O SITE ABRE
  


  carregarStatusLoja(); // 🔥 Puxa status da nuvem
  
  initScrollColorChange(); // <--- ADICIONE ESTA LINHA AQUI
  injetarDescricoes();

  // --- LÓGICA DE LOJA FECHADA ---
  // ... (o resto do seu código) ...


  // ==========================================================
  // 1. LÓGICA DE LOJA ABERTA/FECHADA (EXECUTAR PRIMEIRO)
  // ==========================================================
  const overlayFechado = document.getElementById("loja-fechada-overlay");
  // ... resto do código continua igual ...
  const mensagemEl = document.getElementById("loja-fechada-mensagem");

  if (overlayFechado && mensagemEl) {
    const agora = new Date();
    const diaDaSemana = agora.getDay();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const tempoAtualEmMinutos = horaAtual * 60 + minutoAtual;

    // ⚠️ MUDE AQUI OS HORÁRIOS DA NOVA LOJA
    const horaFechamento = 3;
    const minutoFechamento = 5;
    const tempoFechamento = horaFechamento * 60 + minutoFechamento;
    let horaAbertura = 11;
    if (diaDaSemana === 0) {
      horaAbertura = 12;
    }
    const tempoAbertura = horaAbertura * 60;

    const estaAberta = true
      tempoAtualEmMinutos >= tempoAbertura ||
      tempoAtualEmMinutos < tempoFechamento;

    // SE A LOJA ESTIVER FECHADA
    if (!estaAberta) {
      let proximaHoraAberturaStr = "11:00";
      // ... (Sua lógica de mensagem de horário) ...
      // ⚠️ MUDE A MENSAGEM
      const mensagem = `Loja fechada (Horário de teste).`;
      mensagemEl.textContent = mensagem;
      overlayFechado.style.display = "flex";
      return; // PARA a execução do resto deste listener
    }
  }
  // --- FIM DA LÓGICA DE LOJA FECHADA ---

  // --- 2. Atribui todos os elementos do DOM a variáveis ---
  listaSacola = document.getElementById("lista-sacola");
  totalSacola = document.getElementById("total-sacola");
  modal = document.getElementById("modal");
  modalClose = document.getElementById("modalClose");
  modalImg = document.getElementById("modalImg");
  modalTitle = document.getElementById("modalTitle");
  modalDesc = document.getElementById("modalDesc");
  modalPrice = document.getElementById("modalPrice");
  modalFloatPrice = document.getElementById("modalFloatPrice");
 
  modalObs = document.getElementById("modalObs");
  modalAdd = document.getElementById("modalAdd");
  inputRetirada = document.getElementById("opcaoRetirada");
  infoRetirada = document.getElementById("infoRetirada");
  revisao = document.getElementById("revisao");
  revisaoClose = document.getElementById("revisaoClose");
  btnRevisar = document.getElementById("btn-revisar");
  revisaoLista = document.getElementById("revisaoLista");
  revSubtotal = document.getElementById("revSubtotal");
  revTaxa = document.getElementById("revTaxa");
  revTotal = document.getElementById("revTotal");
  inputEndereco = document.getElementById("endereco");
  inputTaxa = document.getElementById("taxa");
  revisaoConfirmar = document.getElementById("revisaoConfirmar");
  btnFlutuante = document.getElementById("btn-flutuante");
  btnCarrinhoNovo = document.getElementById("btnCarrinhoNovo");
  btnModerador = document.getElementById("btnModerador");
  btnGerenciarAdicionais = document.getElementById("btnGerenciarAdicionais");
  painelAdicionais = document.getElementById("painelAdicionais");
  listaAdicionais = document.getElementById("listaAdicionais");
  popupTroco = document.getElementById("popupTroco");
  resumoTroco = document.getElementById("resumoTroco");
  btnConfirmarTroco = document.getElementById("confirmarTroco");
  modalNome = document.getElementById("modal-nome");
  inputNome = document.getElementById("input-nome-cliente");
  btnConfirmarNome = document.getElementById("btn-confirmar-nome");
  modalSucesso = document.getElementById("modal-sucesso");

  // --- 3. Lógica de Inicialização (Pop-up de Nome) ---
  if (modalNome && inputNome && btnConfirmarNome) {
    modalNome.style.display = "flex";
    updateModalState(true);
    btnConfirmarNome.addEventListener("click", () => {
      const nomeDigitado = inputNome.value.trim();
      if (nomeDigitado.length < 2) {
        alert("Por favor, digite um nome válido.");
        return;
      }
      nomeCliente = nomeDigitado;
      modalNome.style.display = "none";
      updateModalState(false);
    });
  }

  // --- 4. Lógica do Modal "Monte seu Açaí" (Se existir) ---
  const modalAcaiBuilder = document.getElementById("modal-acai-builder");
  if (modalAcaiBuilder) {
    const btnAbrirAcai = document.querySelector(".btn-abrir-modal");
    const btnFecharAcai = modalAcaiBuilder.querySelector(".btn-fechar-modal");

    // Torna a função global para que o listener do card a encontre
    window.abrirModalAcai = () => {
      if (modalAcaiBuilder) {
        modalAcaiBuilder.classList.add("aberto");
        updateModalState(true);
      }
    };

    function fecharModalAcai() {
      if (modalAcaiBuilder) {
        modalAcaiBuilder.classList.remove("aberto");
        updateModalState(false);
      }
    }

    if (btnAbrirAcai) {
      btnAbrirAcai.onclick = window.abrirModalAcai;
    }
    if (btnFecharAcai) {
      btnFecharAcai.onclick = fecharModalAcai;
    }
    modalAcaiBuilder.onclick = function (event) {
      if (event.target === modalAcaiBuilder) {
        fecharModalAcai();
      }
    };

    // --- LÓGICA INTERNA DO MODAL AÇAÍ (CÁLCULOS) ---
    const precoTotalEl = modalAcaiBuilder.querySelector(".preco-total-modal");
    const btnAddAcai = modalAcaiBuilder.querySelector(".btn-add-carrinho");
    const allInputs = modalAcaiBuilder.querySelectorAll(
      'input[type="radio"], input[type="checkbox"]'
    );
    const qtdElAcai = modalAcaiBuilder.querySelector(
      ".acai-modal-footer .qtd"
    );
    const btnMenosAcai = modalAcaiBuilder.querySelector(
      ".acai-modal-footer .menos"
    );
    const btnMaisAcai = modalAcaiBuilder.querySelector(
      ".acai-modal-footer .mais"
    );

    function calcularPrecoAcai() {
      if (!modalAcaiBuilder || !precoTotalEl) return 0;
      let precoUnitario = 0;
      const tamanhoChecked = modalAcaiBuilder.querySelector(
        'input[name="tamanho"]:checked'
      );
      if (tamanhoChecked) {
        precoUnitario += parseFloat(tamanhoChecked.dataset.price || 0);
      }
      const basesChecked = modalAcaiBuilder.querySelectorAll(
        'input[name="base_selecao"]:checked'
      );
      basesChecked.forEach((input) => {
        precoUnitario += parseFloat(input.dataset.price || 0);
      });
      const adicionaisChecked = modalAcaiBuilder.querySelectorAll(
        'input[name="adicional"]:checked'
      );
      adicionaisChecked.forEach((input) => {
        precoUnitario += parseFloat(input.dataset.price || 0);
      });
      const caldasChecked = modalAcaiBuilder.querySelectorAll(
        'input[name="calda"]:checked'
      );
      caldasChecked.forEach((input) => {
        precoUnitario += parseFloat(input.dataset.price || 0);
      });
      const premiumChecked = modalAcaiBuilder.querySelectorAll(
        'input[name="premium"]:checked'
      );
      premiumChecked.forEach((input) => {
        precoUnitario += parseFloat(input.dataset.price || 0);
      });
      const quantidade = parseInt(qtdElAcai.textContent || "1");
      const precoFinal = precoUnitario * quantidade;
      precoTotalEl.textContent = brl(precoFinal);
      return precoFinal;
    }

    function resetarModalAcai() {
      modalAcaiBuilder
        .querySelectorAll('input[type="checkbox"]')
        .forEach((chk) => {
          chk.checked = false;
        });
      const defaultTamanho = modalAcaiBuilder.querySelector(
        'input[name="tamanho"][data-price="11.99"]'
      );
      if (defaultTamanho) defaultTamanho.checked = true;
      const defaultBase = modalAcaiBuilder.querySelector("input#b-acai");
      if (defaultBase) defaultBase.checked = true;
      if (qtdElAcai) qtdElAcai.textContent = "1";
      calcularPrecoAcai();
    }
    
    // Assegura que os elementos existem antes de adicionar listeners
    if (allInputs.length > 0) {
      allInputs.forEach((input) => {
        input.addEventListener("change", calcularPrecoAcai);
      });
    }
    if (btnMenosAcai) btnMenosAcai.addEventListener("click", () => {
      let val = parseInt(qtdElAcai.textContent);
      if (val > 1) {
        qtdElAcai.textContent = val - 1;
        calcularPrecoAcai();
      }
    });
    if (btnMaisAcai) btnMaisAcai.addEventListener("click", () => {
      let val = parseInt(qtdElAcai.textContent);
      qtdElAcai.textContent = val + 1;
      calcularPrecoAcai();
    });
    if (btnAddAcai) btnAddAcai.addEventListener("click", () => {
      const basesSelecionadas = modalAcaiBuilder.querySelectorAll(
        'input[name="base_selecao"]:checked'
      );
      if (basesSelecionadas.length === 0) {
        alert("Por favor, selecione pelo menos uma base para continuar.");
        return;
      }
      const nomeAdicionais = [];
      const tamanho = modalAcaiBuilder.querySelector(
        'input[name="tamanho"]:checked'
      );
      const bases = basesSelecionadas;
      if (tamanho) nomeAdicionais.push(tamanho.value);
      bases.forEach((input) => {
        nomeAdicionais.push(input.value);
      });
      const outrosChecked = modalAcaiBuilder.querySelectorAll(
        'input[type="checkbox"]:checked:not([name="base_selecao"])'
      );
      outrosChecked.forEach((input) => {
        nomeAdicionais.push(input.value);
      });
      const nomeFinal = `Açaí Montado (${nomeAdicionais.join(", ")})`;
      const precoFinalTotal = calcularPrecoAcai();
      const quantidade = parseInt(qtdElAcai.textContent || "1");
      const precoUnitario = precoFinalTotal / quantidade;
      for (let i = 0; i < quantidade; i++) {
        sacola.push({
          name: nomeFinal,
          price: precoUnitario,
          obs: null,
        });
      }
      atualizarSacola();
      showConfirmPopup();
      fecharModalAcai();
      resetarModalAcai();
    });
  } // Fim do if(modalAcaiBuilder)
  
  // ==========================================================
  // --- 5. LÓGICA DO NOVO MAPA COM PINO (Leaflet) ---
  // ==========================================================
  const modalMapa = document.getElementById("map-modal-container");
  const btnFecharMapa = document.getElementById("btn-fechar-mapa");
  const btnConfirmarPino = document.getElementById("btn-confirmar-pino");
  const divMapa = document.getElementById("map-leaflet");
  const resultadoEntrega = document.getElementById("resultadoEntrega");
  const btnUsarLocalizacao = document.getElementById("btn-usar-localizacao"); // 👈 Botão novo
  
  let mapaLeaflet = null;
  let pinoCliente = null;

  // ⚠️ MUDE AQUI AS COORDENADAS DA NOVA LOJA ⚠️
  const lojaCoords = [-8.040101064740764, -34.900327235764]; // (Latitude, Longitude)

/**
 * Função chamada pelo botão "Confirmar Endereço no Mapa" (do index.html)
 * Versão Final: Usa o centro do mapa (getCenter) e um alvo visual CSS.
 */
window.abrirModalMapa = async () => {
  // Garantimos que modalMapa e divMapa existam e sejam mapeados globalmente
  const modalMapa = document.getElementById("map-modal-container");
  const divMapa = document.getElementById("map-leaflet");
  if (!modalMapa || !divMapa) return;

  // 1. Pega os valores dos campos de endereço
  const bairroInput = document.getElementById("endereco");
  const ruaInput = document.getElementById("rua");
  const bairro = bairroInput ? bairroInput.value.trim() : "";
  const rua = ruaInput ? ruaInput.value.trim() : "";

  // 2. Trava o botão e mostra "Buscando..."
  const btnCalcular = document.getElementById("btnCalcularEntrega");
  if (btnCalcular) {
    btnCalcular.disabled = true;
    btnCalcular.textContent = "Buscando...";
  }

  let finalCoords = lojaCoords; // Coordenada padrão é a loja
  let zoomLevel = 15; // Zoom padrão (visão do bairro)

  // 3. Lógica de busca de endereço (Nominatim)
  if (rua || bairro) {
    try {
      let coords = null;
      const userAgent = "CardapioNovoCliente/1.0 (seu-email@aqui.com)"; 
      const cidadeEstado = ", Recife, Pernambuco"; 
      
      const buscarEndereco = async (query) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=1`;
        const resp = await fetch(url, { headers: { "User-Agent": userAgent } }); 
        if (!resp.ok) return null;
        const data = await resp.json();
        return (data && data.length > 0) ? [data[0].lat, data[0].lon] : null;
      };

      if (rua) {
        coords = await buscarEndereco(`${rua}${cidadeEstado}`);
        if (coords) zoomLevel = 18;
      }

      if (!coords && bairro) {
        coords = await buscarEndereco(`${bairro}${cidadeEstado}`);
        if (coords) zoomLevel = 15;
      }

      if (coords) {
        finalCoords = coords;
      } else {
        console.error("Não foi possível achar nem rua nem bairro.");
      }

    } catch (e) {
      console.error("Erro no Geocoding do Nominatim:", e);
      // Mantém finalCoords como lojaCoords em caso de erro de rede
    }
  }

  // 4. Destrava o botão
  if (btnCalcular) {
    btnCalcular.disabled = false;
    btnCalcular.textContent = "🚗 Confirmar Endereço no Mapa";
  }

  // 5. ABRE O MODAL E INICIA O MAPA
  try {
    if (!mapaLeaflet) {
      // Se for a primeira vez, cria o mapa
      mapaLeaflet = L.map(divMapa).setView(finalCoords, zoomLevel);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapaLeaflet);
      
      // Marcação da Loja (Manter)
      L.marker(lojaCoords).addTo(mapaLeaflet).bindPopup('<b>Local da Loja</b>');
      
      // O pino do cliente VISUAL é desativado (substituído pelo alvo CSS)
      pinoCliente = null; 
    }
    
    // Centraliza o mapa na coordenada inicial
    mapaLeaflet.setView(finalCoords, zoomLevel);
    
    // Mostra o modal
    modalMapa.classList.add("aberto");
    updateModalState(true);

    // Garante que o Leaflet recalcule o tamanho ao abrir (para não ficar cinza)
    setTimeout(() => mapaLeaflet.invalidateSize(), 300);

  } catch (e) {
    // Trata o erro de inicialização/rede
    console.error("Erro ao inicializar o mapa Leaflet:", e);
    alert("Erro ao carregar o mapa. Verifique sua conexão ou recarregue a página.");
    modalMapa.classList.remove("aberto");
    updateModalState(false);
  }
};

  /**
   * 🔥 NOVA FUNÇÃO: Botão "Usar minha localização atual"
   */
  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    const btn = document.getElementById("btn-usar-localizacao");
    const oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = "📍 Buscando...";

    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // REVERSE GEOCODING (Coords -> Endereço)
      // ⚠️ MUDE O 'User-Agent'
      const userAgent = "CardapioNovoCliente/1.0 (seu-email@aqui.com)";
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      
      try {
        const resp = await fetch(url, { headers: { "User-Agent": userAgent } });
        const data = await resp.json();
        
        if (data && data.address) {
          const bairro = data.address.suburb || data.address.city_district || "";
          const rua = (data.address.road || "") + (data.address.house_number ? `, ${data.address.house_number}` : "");

          // Preenche os campos
          const bairroInput = document.getElementById("endereco");
          const ruaInput = document.getElementById("rua");
          
          if (bairroInput) bairroInput.value = bairro;
          if (ruaInput) ruaInput.value = rua;
          
          // Abre o mapa com o pino JÁ NO LUGAR CERTO
          window.abrirModalMapa(true, [lat, lon]); // 'true' pula a busca

        } else {
          throw new Error("Não foi possível encontrar o nome do bairro.");
        }
      } catch (e) {
        alert("Não foi possível encontrar seu endereço. Tente digitar o bairro manualmente.");
        window.abrirModalMapa(); // Abre o mapa na loja
      } finally {
        btn.disabled = false;
        btn.innerHTML = oldText;
      }

    }, (error) => {
      // Se o usuário negar a permissão
      alert("Você precisa permitir o acesso à localização para usar esta função.");
      btn.disabled = false;
      btn.innerHTML = oldText;
    });
  }


/**
 * Função chamada pelo botão "Confirmar Posição" do modal do mapa
 * 🔥 VERSÃO FINAL COM ALERTA DE LIMITE (7KM) 🔥
 */
function confirmarPosicaoPino() {
  // 1. CHECA O MAPA
  if (!mapaLeaflet || !inputTaxa || !resultadoEntrega) {
    console.error("Erro: Mapa, Input de Taxa ou Resultado não encontrados.");
    return; 
  }

  // 2. PEGA AS COORDENADAS DO CENTRO ATUAL DO MAPA
  const clienteCoords = mapaLeaflet.getCenter(); 
  
  // 3. CALCULA A DISTÂNCIA
  const distanciaKm = calcularDistanciaRaio(
    lojaCoords[0], lojaCoords[1],
    clienteCoords.lat, clienteCoords.lng
  );

  // ==============================================
  // ⚠️ NOVA REGRA DE PREÇO (R$ 1,00 por KM / Máx 7km) ⚠️
  // ==============================================
  
  // 1. Trava de Segurança (Máximo 7km)
  if (distanciaKm > 7) {
    // Feedback no texto da tela
    resultadoEntrega.innerHTML = `❌ Desculpe, não entregamos a <b>${distanciaKm.toFixed(2)} km</b>. (Limite: 7km)`;
    
    // 👇 O ALERTA QUE VOCÊ PEDIU 👇
    alert(`❌ Desculpe, não entregamos neste local!\n\nSua distância: ${distanciaKm.toFixed(1)}km\nNosso raio máximo de entrega é 7km.`);
    
    window.taxaCalculada = false;
    window.atualizarBotaoWhatsApp();
    return; // Para a execução aqui (não fecha o modal)
  }

  // 2. Cálculo da Taxa
  // Math.ceil arredonda para cima (ex: 1.1 vira 2, 2.1 vira 3)
  // Multiplica por 1.00 (valor por km)
let taxa = 5.0;
  // ==============================================

  inputTaxa.value = taxa.toFixed(2);
  resultadoEntrega.innerHTML = `
    🏁 Distância (raio): <b>${distanciaKm.toFixed(2)} km</b><br>
    💰 Taxa de entrega: <b>${brl(taxa)}</b>
  `;

  window.taxaCalculada = true;
  window.atualizarBotaoWhatsApp();
  window.atualizarTotalComTaxa();

  // Fecha o modal
  modalMapa.classList.remove("aberto");
  updateModalState(false);
}

/**
 * Fórmula de Haversine (Cálculo de Raio)
 */
function calcularDistanciaRaio(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = R * c;
  return distancia; // Retorna em KM
}
  // ==========================================================
  // --- FIM DA LÓGICA DO MAPA COM PINO ---
  // ==========================================================


  // --- 6. Adiciona TODOS os Event Listeners (Restantes) ---

  document.querySelectorAll(".item").forEach((card) => {
    const isCardAcaiBuilder = card.querySelector(".btn-abrir-modal");
    if (isCardAcaiBuilder) {
      card.addEventListener("click", (e) => {
        const isBotaoPausar = e.target.closest(".btn-pausar");
        if (!isBotaoPausar) {
          if (typeof window.abrirModalAcai === "function")
            window.abrirModalAcai();
        }
      });
    } else {
      card.addEventListener("click", (e) => {
        const isBotaoPausar = e.target.closest(".btn-pausar");
        const isBotaoQtd = e.target.closest(".qtd-control");
        if (!isBotaoPausar && !isBotaoQtd) {
          abrirModalProduto(card);
        }
      });
    }
  });

  if (modalClose)
    modalClose.addEventListener("click", () => fecharModal(modal));
  if (revisaoClose)
    revisaoClose.addEventListener("click", () => fecharModal(revisao));
  if (modal)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) fecharModal(modal);
    });
  if (revisao)
    revisao.addEventListener("click", (e) => {
      if (e.target === revisao) fecharModal(revisao);
    });

if (modalAdd)
  modalAdd.addEventListener("click", () => {
    if (!produtoAtual) return;

    // VALIDAÇÃO: Verifica se TEM algum tamanho selecionado
    const tamanhoChecked = modal.querySelector('.opcoes-modal input[type="radio"]:checked');

    // Se existem opções de tamanho no modal, MAS nenhuma está marcada:
    if (modal.querySelector('.opcoes-modal input[type="radio"]') && !tamanhoChecked) {
        alert("⚠️ Por favor, selecione um tamanho antes de adicionar.");
        return; // PARA TUDO AQUI!
    }

    const obs = modalObs.value.trim();
    let adicionaisSelecionados = [];
    let extraTotal = 0;

    // 1. PEGA O TAMANHO SELECIONADO (Agora garantido pela validação acima)
    if (tamanhoChecked) {
        const label = tamanhoChecked.closest('label');
        const spanTamanho = label ? label.querySelector('span') : null;
        if (spanTamanho) {
            adicionaisSelecionados.push(`📏 ${spanTamanho.textContent.trim()}`);
        }
        extraTotal += parseFloat(tamanhoChecked.dataset.extra || 0);
    }

    // ... (resto do código continua igual a partir daqui) ...
      // 2. PEGA OS EXTRAS DE QUANTIDADE (Toppings, etc)
      const extras = modal.querySelectorAll(".opcoes-modal .extra");
      extras.forEach((ex) => {
        const input = ex.querySelector("input");
        const qtdEl = ex.querySelector(".qtd");
        const qtd = qtdEl ? parseInt(qtdEl.textContent) || 0 : 0;
        if (qtd > 0) {
          const valorExtra = input ? parseFloat(input.dataset.extra || "0") : 0;
          adicionaisSelecionados.push(`${qtd}x ${input ? input.value : "Adicional"}`);
          extraTotal += qtd * valorExtra;
        }
      });

      // 3. PEGA OS CHECKBOXES (Se houver)
      modal.querySelectorAll('.opcoes-modal input[type="checkbox"]:checked').forEach(chk => {
           const label = chk.closest('label');
           const nome = label ? label.textContent.trim() : chk.value;
           adicionaisSelecionados.push(nome);
           extraTotal += parseFloat(chk.dataset.extra || 0);
      });

      // Calcula preço final
      const finalPrice = precoBase + extraTotal;

      // Monta o nome final do produto para a sacola
      let nomeFinal = produtoAtual.dataset.name;
      if (adicionaisSelecionados.length > 0) {
          nomeFinal += ` (${adicionaisSelecionados.join(", ")})`;
      }

      // Adiciona à sacola
      sacola.push({
        name: nomeFinal,
        price: finalPrice,
        obs: obs || null,
      });

      atualizarSacola();
      showConfirmPopup();
      fecharModal(modal);
    });

  if (listaSacola)
    listaSacola.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-remove");
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      sacola.splice(idx, 1);
      atualizarSacola();
      if (revisao && revisao.getAttribute("aria-hidden") === "false")
        preencherRevisao();
    });

  if (btnRevisar)
    btnRevisar.addEventListener("click", () => {
      if (sacola.length === 0) return alert("Sua sacola está vazia!");
      preencherRevisao();
      if (revisao) revisao.setAttribute("aria-hidden", "false");
      updateModalState(true);
    });

  if (revisaoLista)
    revisaoLista.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-remove");
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      sacola.splice(idx, 1);
      atualizarSacola();
      if (sacola.length === 0) fecharModal(revisao);
      else preencherRevisao();
    });

  if (inputTaxa)
    inputTaxa.addEventListener("input", window.atualizarTotalComTaxa);
  if (revisaoConfirmar)
    revisaoConfirmar.addEventListener("click", enviarPedido);

  const header = document.querySelector(".brand-header");
  if (header) {
    window.addEventListener("scroll", () => {
      header.classList.toggle("minimized", window.scrollY > 50);
    });
  }

  if (btnCarrinhoNovo)
    btnCarrinhoNovo.addEventListener("click", () => {
      if (sacola.length === 0) return;
      preencherRevisao();
      if (revisao) revisao.setAttribute("aria-hidden", "false");
      updateModalState(true);
    });

  // Gatilho para "sujar" o cálculo se o Bairro for alterado
  if (inputEndereco) {
    inputEndereco.addEventListener("input", () => {
      if (window.taxaCalculada) {
        window.taxaCalculada = false;
        window.atualizarBotaoWhatsApp();
      }
    });
  }
  
  // Gatilho para atualizar o botão ao digitar a Rua
  const ruaInput = document.getElementById("rua");
  if (ruaInput) {
    ruaInput.addEventListener("input", () => {
      window.atualizarBotaoWhatsApp();
    });
  }

 

  // Gatilho para Entrega/Retirada
  document.querySelectorAll('input[name="tipoEntrega"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const tipoSelecionadoRadio = document.querySelector(
        'input[name="tipoEntrega"]:checked'
      );
      const tipoSelecionado = tipoSelecionadoRadio
        ? tipoSelecionadoRadio.value
        : "entrega";
      const campoEndereco = document.getElementById("campoEndereco");
      const infoRetirada = document.getElementById("infoRetirada");
      const resultadoEntrega = document.getElementById("resultadoEntrega");

      if (
        campoEndereco &&
        infoRetirada &&
        inputTaxa &&
        inputEndereco &&
        resultadoEntrega
      ) {
        if (tipoSelecionado === "retirada") {
          campoEndereco.style.display = "none";
          infoRetirada.style.display = "block";
          inputTaxa.value = "0.00";
          inputEndereco.disabled = true;
          resultadoEntrega.innerHTML =
            "ℹ️ Retirada no local selecionada. Sem taxa de entrega.";
          window.taxaCalculada = true;
        } else {
          campoEndereco.style.display = "block";
          infoRetirada.style.display = "none";
          inputEndereco.disabled = false;
          if(window.taxaCalculada) {
             resultadoEntrega.innerHTML = "";
          }
          window.taxaCalculada = false;
        }
        window.atualizarTotalComTaxa();
        window.atualizarBotaoWhatsApp();
      }
    });
  });

  // Gatilho do Pop-up de Troco
  document.querySelectorAll('input[name="pagamento"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const valorInput = document.getElementById("valorTroco");
      if (popupTroco && valorInput && resumoTroco) {
        if (radio.value === "Dinheiro" && radio.checked) {
          popupTroco.style.display = "block";
          popupTroco.setAttribute("aria-hidden", "false");
          valorInput.focus();
        } else {
          popupTroco.style.display = "none";
          popupTroco.setAttribute("aria-hidden", "true");
          resumoTroco.style.display = "none";
          resumoTroco.textContent = "";
        }
      }
    });
  });

  // Gatilho do Botão de Troco
  if (btnConfirmarTroco)
    btnConfirmarTroco.addEventListener("click", () => {
      const valorInput = document.getElementById("valorTroco");
      const revTotalEl = document.getElementById("revTotal");
      if (valorInput && revTotalEl && resumoTroco && popupTroco) {
        const valor = parseFloat(valorInput.value);
        const totalPedido = parseFloat(
          revTotalEl.textContent.replace("R$", "").replace(",", ".").trim()
        );
        if (isNaN(valor) || valor <= 0)
          return alert("Por favor, insira um valor válido.");
        if (valor < totalPedido)
          return alert(
            "O valor para troco deve ser maior ou igual ao total do pedido."
          );
        resumoTroco.textContent = `Troco para R$ ${valor
          .toFixed(2)
          .replace(".", ",")}`;
        resumoTroco.style.display = "block";
        valorInput.blur();
        popupTroco.style.display = "none";
        popupTroco.setAttribute("aria-hidden", "true");

        
      }

      
    });

  // --- 7. Inicializa os Módulos Admin ---
  initModerador();
  initPainelAdicionais();

  // --- 8. Força Estado Inicial ---
  atualizarSacola();
  window.atualizarBotaoWhatsApp();
  const tipoInicialRadio = document.querySelector(
    'input[name="tipoEntrega"]:checked'
  );
  const tipoInicial = tipoInicialRadio ? tipoInicialRadio.value : "entrega";
  if (inputEndereco) inputEndereco.disabled = tipoInicial === "retirada";
  const campoEnderecoEl = document.getElementById("campoEndereco");
  const infoRetiradaEl = document.getElementById("infoRetirada");
  if (campoEnderecoEl && infoRetiradaEl) {
    if (tipoInicial === "retirada") {
      campoEnderecoEl.style.display = "none";
      infoRetiradaEl.style.display = "block";
    } else {
      campoEnderecoEl.style.display = "block";
      infoRetiradaEl.style.display = "none";
    }
  }
  // 👇 ADICIONE ESTA VERIFICAÇÃO E LISTENER AQUI 👇
  if (btnConfirmarPino) {
    btnConfirmarPino.addEventListener("click", confirmarPosicaoPino);
  }
});

// ==========================================================
// 🔥 NOVA FUNÇÃO: GERADOR DE LINK DO WHATSAPP 🔥
// ==========================================================
function gerarLinkWhatsApp(pedido) {
  const telefoneLoja = "558188008881"; // 👈 MUDE PARA O NÚMERO DA LOJA

  let texto = `*NOVO PEDIDO!* 🛵\n\n`;
  texto += `*Código:* #${pedido.codigo}\n`;
  texto += `*Cliente:* ${pedido.nomeCliente}\n\n`;

  texto += `*📋 RESUMO:*\n`;
  pedido.itens.forEach(item => {
    // Função auxiliar brl() já existe no seu código
    texto += `• ${item.name} - ${brl(item.price)}\n`;
    if (item.obs) texto += `  _Obs: ${item.obs}_\n`;
  });

  texto += `\n*Subtotal:* ${brl(pedido.subtotal)}\n`;
  texto += `*Taxa de Entrega:* ${brl(pedido.taxa)}\n`;
  texto += `*TOTAL:* ${brl(pedido.total)}\n\n`;

  if (pedido.endereco === "Retirada no local") {
     texto += `*📍 RETIRADA NO LOCAL*\n`;
  } else {
     texto += `*📍 ENDEREÇO DE ENTREGA:*\n${pedido.endereco}\n`;
  }

  texto += `\n*💳 Pagamento:* ${pedido.pagamento}\n`;
  if (pedido.obsPagamento) {
      texto += `_(${pedido.obsPagamento})_\n`;
  }

  // Retorna o link pronto para ser aberto
  return `https://wa.me/${telefoneLoja}?text=${encodeURIComponent(texto)}`;
}

// ==========================================================
// 🔥 NOVAS FUNÇÕES: SINCRONIZAÇÃO COM O SERVIDOR 🔥
// ==========================================================

// 1. Carrega o status (usado ao abrir a página)
async function carregarStatusLoja() {
  try {
    const response = await fetch(`${API_BASE_URL}/get-status`);
    if (response.ok) {
        const data = await response.json();
        // Atualiza as variáveis globais com o que veio do servidor
        itensPausados = data.itensPausados || [];
        adicionaisPausados = data.adicionaisPausados || [];

        // Aplica as pausas visuais na hora
        aplicarPausasVisuais();
    }
  } catch (error) {
    console.error("Erro ao carregar status da loja:", error);
  }
}

// 2. Salva o status (usado pelo Admin ao clicar)
async function salvarStatusLoja() {
  try {
    await fetch(`${API_BASE_URL}/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itensPausados: itensPausados,
        adicionaisPausados: adicionaisPausados
      })
    });
    console.log("Status salvo na nuvem!");
  } catch (error) {
    alert("Erro ao salvar status na nuvem. Verifique sua conexão.");
  }
}

// 3. Função Auxiliar para atualizar a tela
function aplicarPausasVisuais() {
  // Pausa Produtos (Cards)
  document.querySelectorAll('.item').forEach(card => {
      const nome = card.dataset.name;
      const btn = card.querySelector('.btn-pausar');
      if (itensPausados.includes(nome)) {
          card.classList.add('pausado');
          if (btn) { btn.innerHTML = '▶️'; btn.style.background = '#4CAF50'; }
      } else {
          card.classList.remove('pausado');
          if (btn) { btn.innerHTML = '⏸️'; btn.style.background = '#ffc107'; }
      }
  });
  // Pausa Adicionais (esconde as divs)
  atualizarEstadoExtras();
}


// ==========================================================
// 🔥 CSS MALUCO: FUNÇÃO DO OBSERVADOR (VERSÃO DEBUG 🕵️‍♂️)
// ==========================================================
function initScrollColorChange() {
  
  // Confirma que a função foi chamada
  console.log("🔥 Observador de Cor INICIADO!");

  const themeMap = {
    "acai-bases":        ["#f5f6f6", "#000000"],
    "smoothies":       ["#8c5d9f", "#ffffff"],
    "leve-pra-casa":   ["#412745", "#ffffff"],
    "monte-sua-salada":["#f5f6f6", "#000000"],
    "verde-se":        ["#013033", "#ffffff"],
    "wrap-se":         ["#013033", "#ffffff"],
    "bread-se":        ["#013033", "#ffffff"],
    "bebidas":         ["#8d5ea0", "#ffffff"]
  };

  const options = {
    root: null,
    rootMargin: "-40% 0px -40% 0px",
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // Vai nos dizer QUAL seção ele está vendo
      console.log("👀 Observador VIU:", entry.target.id); 

      if (entry.isIntersecting) {
        console.log("✅ SEÇÃO ATIVA:", entry.target.id);
        const theme = themeMap[entry.target.id];
        
        if (theme) {
          // Vai nos dizer QUAL COR está aplicando
          console.log("🎨 Aplicando Tema:", theme[0], theme[1]); 
          document.body.style.backgroundColor = theme[0];
          document.body.style.color = theme[1];
        } else {
          console.error("❌ Erro: Seção não encontrada no themeMap:", entry.target.id);
        }
      }
    });
  }, options);

  // Vigia todas as seções
  Object.keys(themeMap).forEach(id => {
    const section = document.getElementById(id);
    if (section) {
      observer.observe(section);
      console.log("👍 Vigiando seção:", id);
    } else {
      // VAI ACUSAR SE A ID ESTIVER ERRADA
      console.warn("⚠️ AVISO: Não achei a seção com ID:", id); 
    }
  });
}
// ==========================================================
// 🔥 FUNÇÃO: INJETA DESCRIÇÕES DOS ITENS NA LISTA
// ==========================================================
function injetarDescricoes() {
  // Pega todos os itens do cardápio
  const todosOsItens = document.querySelectorAll('.item');

  todosOsItens.forEach(item => {
    // 1. Pega a descrição do atributo 'data-desc'
    const descTexto = item.dataset.desc;
    
    // 2. Acha onde vamos colocar o texto (a div .item-info)
    const infoDiv = item.querySelector('.item-info');
    
    // 3. Acha o título (h3) para colocar a descrição logo abaixo
    const titulo = infoDiv ? infoDiv.querySelector('h3') : null;

    // Se tiver descrição, um lugar para por, e um título...
    if (descTexto && infoDiv && titulo) {
      // 4. Cria um novo elemento <p>
      const p = document.createElement('p');
      p.className = 'item-desc'; // Aplica o CSS que fizemos
      p.textContent = descTexto; // Coloca o texto
      
      // 5. Insere a descrição logo depois do título
      titulo.insertAdjacentElement('afterend', p);
    }
  });
}
// ==========================================================
// FUNÇÃO QUE FALTAVA: GERAR CÓDIGO DO PEDIDO
// ==========================================================
function gerarCodigoPedido(nome) {
  let prefixo = "PED";
  // Se tiver nome, usa as 3 primeiras letras
  if (nome && nome !== "Cliente" && nome.length >= 3) {
    prefixo = nome.substring(0, 3).toUpperCase();
  } else if (nome && nome !== "Cliente" && nome.length > 0) {
    prefixo = nome.toUpperCase();
  }
  // Gera 3 números aleatórios
  const sufixo = Math.floor(100 + Math.random() * 900).toString();
  
  return `${prefixo}-${sufixo}`;
}


/**
 * Configura a lógica de Toppings Grátis dinâmicos baseada no tamanho do produto.
 * * @param {string} containerSelector - Seletor CSS para o div.item específico (ex: '[data-name="Açaí Artesanal"]').
 * @param {string} sizeInputName - O valor do atributo 'name' dos radio buttons de tamanho (ex: 'tamanho_artesanal').
 * @param {string} freeSpanId - O ID do span que mostra o limite de toppings grátis (ex: 'max-free-toppings_artesanal').
 * @param {number} max700ml - O limite de toppings grátis quando o tamanho '700ml' é selecionado.
 */
function configurarToppingsDinamicos(containerSelector, sizeInputName, freeSpanId, max700ml) {
    // 1. Busca os elementos DENTRO do container específico
    const itemContainer = document.querySelector(containerSelector);
    if (!itemContainer) return;

    const sizeRadios = itemContainer.querySelectorAll(`input[name="${sizeInputName}"]`);
    const maxFreeSpan = itemContainer.querySelector(`#${freeSpanId}`);
    const freeToppingGroup = itemContainer.querySelector('.free-topping-group');
    const freeCheckboxes = itemContainer.querySelectorAll('.free-check');
    
    // Define o limite padrão para 300ml e 500ml
    const maxPadrao = 2; 

    // 2. Função principal de atualização (lógica de limite e reset)
    function atualizarToppings(event) {
        let maxToppings = maxPadrao; 
        
        // Determina o tamanho selecionado (considera o padrão se nada estiver checked na inicialização)
        const checkedSizeRadio = itemContainer.querySelector(`input[name="${sizeInputName}"]:checked`);
        const tamanhoSelecionado = checkedSizeRadio ? checkedSizeRadio.value : '300ml';

        // Lógica para determinar o limite: se for 700ml, usa o limite fornecido (max700ml)
        if (tamanhoSelecionado === "700ml") {
            maxToppings = max700ml;
        }

        // --- CORREÇÃO DO BUG (DESMARCAR e HABILITAR ao trocar o tamanho) ---
        // Se o evento foi um 'change' e o alvo é um rádio de tamanho, reseta os checkboxes.
        if (event && event.type === 'change' && event.target.name === sizeInputName) {
            freeCheckboxes.forEach(checkbox => {
                checkbox.checked = false; 
            });
        }
        // -------------------------------------------------------------------
        
        // Atualiza o texto e o atributo de controle para a lógica de limite visual
        if (maxFreeSpan) {
            maxFreeSpan.textContent = maxToppings;
        }
        if (freeToppingGroup) {
            freeToppingGroup.setAttribute('data-max-free', maxToppings);
        }

        // Lógica de desabilitar/habilitar checkboxes ao atingir o limite
        const checkedCount = itemContainer.querySelectorAll('.free-check:checked').length;
        
        freeCheckboxes.forEach(checkbox => {
            // Se a contagem atingiu o limite E este checkbox NÃO está marcado, ele é desabilitado.
            if (checkedCount >= maxToppings && !checkbox.checked) {
                checkbox.disabled = true; 
            } else {
                checkbox.disabled = false; // Caso contrário, fica habilitado.
            }
        });
    }

    // 3. Adiciona event listeners para RÁDIOS (mudar o limite e resetar)
    sizeRadios.forEach(radio => {
        radio.addEventListener('change', atualizarToppings);
    });
    
    // 4. Adiciona event listeners para CHECKBOXES (para controlar o limite de marcação)
    freeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', atualizarToppings);
    });

    // 5. Executa a função na inicialização para definir o estado inicial (2 Grátis)
    // O timeout é opcional, mas garante que o DOM esteja completamente pronto, se necessário.
    setTimeout(() => {
        atualizarToppings({type: 'initial'}); 
    }, 0);
}

// =========================================================================
// CHAMADAS PARA OS PRODUTOS
// =========================================================================

// 1. AÇAÍ ARTESANAL: Limite de 2 grátis (300/500ml) ou 3 grátis (700ml)
configurarToppingsDinamicos(
    '[data-name="Açaí Artesanal"]',      // Seletor do container
    'tamanho_artesanal',                // Nome do radio group
    'max-free-toppings_artesanal',      // ID do span
    3                                   // Limite quando 700ml é selecionado
);

// 2. BLEND-SE: Limite FIXO de 4 grátis (Para este exemplo, o limite é 4, independente do tamanho)
// Se o Blend-se tiver apenas 2 tamanhos e for sempre 4 grátis, basta passar 4 como o 'max700ml'.
configurarToppingsDinamicos(
    '[data-name="Blend-se"]',          // Seletor do container
    'tamanho_blend',                   // Nome do radio group
    'max-free-toppings_blend',         // ID do span
    4                                  // Limite quando 700ml/maior for selecionado (ou o limite fixo)
);
// Adicione outras chamadas para outros itens aqui...