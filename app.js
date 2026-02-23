/**
 * VVF Autorespiratore - Multi-squadre, vista dettaglio.
 * Nessuna dipendenza esterna. Compatibile con Capacitor.
 */

(function () {
  "use strict";

  let squadre = [];
  let nextSquadraId = 1;
  let vigili = [];
  let tempoAccelerato = false;
  const MOLTIPLICATORE_ACCELERATO = 10;
  const NOMI_DISPONIBILI = ["Fabio Mezzi", "Rudi Poletti", "Alessandro Giacco", "Alessandro Berti 02", "Michele Lovato", "Danilo Bertolotti", "Riccardo Zontini", "Stefano Manzoni", "Daniele Bonomini", "Andrea Mezzi", "Michele Giacometti", "Mirco Poletti", "Marco Melzani", "Gaia Pelanda", "Andrea Simoni", "Rolando Zanetti", "Riccardo Scalmazzi", "Riccardo Valentini", "Michele Mezzi", "Denis Mora", "Luigi Targhettini", "Pierantonio Scaglia", "Dario Beltramolli", "Matteo Sembenotti", "Claudio Righetti", "Denny Beltramolli", "AlessandroBerti 96", "Leonardo Zontini", "Yuri Cortella", "Claudio Caola", "Mattia Kerschbamer", "Maurizio Giovanelli", "Michele Tonini", "Gianluca Bertoli", "Francesco Romele", "Angelo Vanin"];
  let intervallo = null;
  let squadraSelezionataId = null;
  let allarmeInterval = null;
  const SOGLIA_BAR_ALARM = 65;

  const vistaLista = document.getElementById("vista-lista");
  const vistaDettaglio = document.getElementById("vista-dettaglio");
  const elBombola = document.getElementById("bombola");
  const elPressione = document.getElementById("pressione");
  const elConsumo = document.getElementById("consumo");
  const toggleAccelerato = document.getElementById("toggle-accelerato");
  const toggleLabel = document.getElementById("toggle-label");
  const emptyState = document.getElementById("empty-state");
  const squadreList = document.getElementById("squadre-list");
  const vigiliPillsContainer = document.getElementById("vigili-pills");
  const btnAggiungiVigile = document.getElementById("btn-aggiungi-vigile");
  const btnEliminaSquadra = document.getElementById("btn-elimina-squadra");
  const btnCrea = document.getElementById("btn-crea");
  const btnReset = document.getElementById("btn-reset");
  const popupVigili = document.getElementById("popup-vigili");
  const popupCercaNome = document.getElementById("popup-cerca-nome");
  const popupToggleStoro = document.getElementById("popup-toggle-storo");
  const popupListaNomiContainer = document.getElementById("popup-lista-nomi-container");
  const popupListaNomi = document.getElementById("popup-lista-nomi");
  const popupNomeNuovo = document.getElementById("popup-nome-nuovo");
  const popupBtnAggiungiNome = document.getElementById("popup-btn-aggiungi-nome");
  const popupVigiliAttuali = document.getElementById("popup-vigili-attuali");
  const popupNessunVigile = document.getElementById("popup-nessun-vigile");
  const popupChiudi = document.getElementById("popup-chiudi");
  const dettaglioIndietro = document.getElementById("dettaglio-indietro");
  const dettaglioTitolo = document.getElementById("dettaglio-titolo");
  const dettaglioControls = document.getElementById("dettaglio-controls");
  const dettaglioAvvia = document.getElementById("dettaglio-avvia");
  const dettaglioPausa = document.getElementById("dettaglio-pausa");
  const dettaglioFine = document.getElementById("dettaglio-fine");
  const cardGrafico = document.getElementById("card-grafico");
  const graficoCanvas = document.getElementById("grafico-canvas");
  const dettTempo = document.getElementById("dett-tempo");
  const dettBarStimati = document.getElementById("dett-bar-stimati");
  const dettBarAttuali = document.getElementById("dett-bar-attuali");
  const dettAggiornaBar = document.getElementById("dett-aggiorna-bar");
  const dettConsumo = document.getElementById("dett-consumo");
  const dettAutonomia = document.getElementById("dett-autonomia");
  const dettLitri = document.getElementById("dett-litri");
  const dettConsumoInput = document.getElementById("dett-consumo-input");
  const dettVigiliTitolo = document.getElementById("dett-vigili-titolo");
  const dettVigiliList = document.getElementById("dett-vigili-list");
  const dettNessunVigile = document.getElementById("dett-nessun-vigile");
  const dettAggiungiVigile = document.getElementById("dett-aggiungi-vigile");
  const popupDettaglioVigili = document.getElementById("popup-dettaglio-vigili");
  const popupDettCercaNome = document.getElementById("popup-dett-cerca-nome");
  const popupDettToggleStoro = document.getElementById("popup-dett-toggle-storo");
  const popupDettListaNomiContainer = document.getElementById("popup-dett-lista-nomi-container");
  const popupDettListaNomi = document.getElementById("popup-dett-lista-nomi");
  const popupDettNome = document.getElementById("popup-dett-nome");
  const popupDettAggiungi = document.getElementById("popup-dett-aggiungi");
  const popupDettChiudi = document.getElementById("popup-dett-chiudi");

  function formatOreMinutiSecondi(totalSeconds) {
    if (totalSeconds < 0) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return [String(h).padStart(2, "0"), String(m).padStart(2, "0"), String(s).padStart(2, "0")].join(":");
  }

  function getSecondiPerTick() {
    return tempoAccelerato ? MOLTIPLICATORE_ACCELERATO : 1;
  }

  function barPerSquadra(s) {
    if (s.barAttualiManuale != null) return s.barAttualiManuale;
    if (s.litriBombola <= 0) return 0;
    const ariaTotale = s.litriBombola * s.pressioneIniziale;
    const minutiTrascorsi = s.secondiTrascorsi / 60;
    const ariaConsumata = s.consumoMedio * minutiTrascorsi;
    const ariaResidua = Math.max(0, ariaTotale - ariaConsumata);
    return Math.max(0, Math.round((ariaResidua / s.litriBombola) * 10) / 10);
  }

  function autonomiaSecondiPerSquadra(s) {
    const bar = barPerSquadra(s);
    const litriResidui = s.litriBombola * bar;
    if (s.consumoMedio <= 0) return 0;
    return Math.max(0, Math.floor((litriResidui / s.consumoMedio) * 60));
  }

  function litriResiduiPerSquadra(s) {
    return Math.round(s.litriBombola * barPerSquadra(s));
  }

  function leggiConfig() {
    const litri = parseFloat(elBombola.value) || 7.2;
    const p = parseInt(elPressione.value, 10);
    const pressione = (isNaN(p) || p < 1) ? 300 : Math.min(300, p);
    const c = parseInt(elConsumo.value, 10);
    const consumo = (isNaN(c) || c < 1) ? 50 : Math.min(200, c);
    elPressione.value = pressione;
    elConsumo.value = consumo;
    return { litriBombola: litri, pressioneIniziale: pressione, consumoMedio: consumo };
  }

  function creaSquadra() {
    const config = leggiConfig();
    if (vigili.length === 0) return;
    const squadra = {
      id: nextSquadraId++,
      nomi: vigili.slice(),
      secondiTrascorsi: 0,
      inEsecuzione: false,
      finePremuto: false,
      litriBombola: config.litriBombola,
      pressioneIniziale: config.pressioneIniziale,
      consumoMedio: config.consumoMedio,
      barAttualiManuale: null,
      storicoGrafico: []
    };
    squadre.push(squadra);
    vigili = [];
    renderPills();
    renderSquadreCards();
    avviaIntervalSeNecessario();
  }

  function getSquadraById(id) {
    return squadre.find(function (s) { return s.id === id; });
  }

  function renderSquadreCards() {
    emptyState.hidden = squadre.length > 0;
    squadreList.innerHTML = "";
    squadre.forEach(function (s) {
      const bar = barPerSquadra(s);
      const card = document.createElement("div");
      card.className = "squadra-card" + (bar < SOGLIA_BAR_ALARM ? " sotto-65" : "");
      card.innerHTML =
        '<div class="squadra-card-header">' +
          '<span class="squadra-card-nomi">Squadra ' + s.id + (s.nomi.length ? ': ' + s.nomi.join(' | ') : '') + '</span>' +
          '<span class="squadra-card-bar' + (bar <= 50 ? ' bar-basso' : '') + '">' + bar + ' bar</span>' +
        '</div>' +
        '<div class="squadra-card-grid">' +
          '<div class="monitor-item"><span class="label">Tempo trascorso</span><span class="value tempo-card">' + formatOreMinutiSecondi(s.secondiTrascorsi) + '</span></div>' +
          '<div class="monitor-item"><span class="label">Autonomia residua</span><span class="value auto-card' + (autonomiaSecondiPerSquadra(s) < 300 && autonomiaSecondiPerSquadra(s) > 0 ? ' sotto-5min' : '') + '">' + formatOreMinutiSecondi(autonomiaSecondiPerSquadra(s)) + '</span></div>' +
        '</div>' +
        '<div class="squadra-card-footer">' +
          '<button type="button" class="btn btn-vai" data-id="' + s.id + '"><span class="btn-icon">→</span> Vai</button>' +
          '<button type="button" class="btn btn-elimina-card" data-id="' + s.id + '" aria-label="Elimina monitoraggio"><span class="btn-icon">×</span> Elimina</button>' +
        '</div>';
      const tempoEl = card.querySelector(".tempo-card");
      const autoEl = card.querySelector(".auto-card");
      const barEl = card.querySelector(".squadra-card-bar");
      card.dataset.squadraId = String(s.id);
      squadreList.appendChild(card);
      card.querySelector(".btn-vai").addEventListener("click", function () {
        apriDettaglio(s.id);
      });
      card.querySelector(".btn-elimina-card").addEventListener("click", function () {
        eliminaSquadraById(s.id);
      });
    });
  }

  function aggiornaCardSquadra(s) {
    const card = squadreList.querySelector("[data-squadra-id=\"" + s.id + "\"]");
    if (!card) return;
    const bar = barPerSquadra(s);
    const autoSec = autonomiaSecondiPerSquadra(s);
    card.querySelector(".squadra-card-bar").textContent = bar + " bar";
    card.querySelector(".squadra-card-bar").classList.toggle("bar-basso", bar <= 50);
    card.querySelector(".tempo-card").textContent = formatOreMinutiSecondi(s.secondiTrascorsi);
    card.querySelector(".auto-card").textContent = formatOreMinutiSecondi(autoSec);
    card.querySelector(".auto-card").classList.toggle("sotto-5min", autoSec > 0 && autoSec < 300);
    card.classList.toggle("sotto-65", bar < SOGLIA_BAR_ALARM);
  }

  function tick() {
    squadre.forEach(function (s) {
      if (s.inEsecuzione) {
        s.secondiTrascorsi += getSecondiPerTick();
        const bar = barPerSquadra(s);
        if (bar <= 0) s.inEsecuzione = false;
        s.storicoGrafico.push({ t: s.secondiTrascorsi, bar: bar, consumo: s.consumoMedio });
        aggiornaCardSquadra(s);
      }
    });
    if (squadraSelezionataId) updateDettaglioUI();
    aggiornaStatoAllarme();
    const anyRunning = squadre.some(function (s) { return s.inEsecuzione; });
    if (!anyRunning && intervallo) {
      clearInterval(intervallo);
      intervallo = null;
    }
  }

  function avviaIntervalSeNecessario() {
    const anyRunning = squadre.some(function (s) { return s.inEsecuzione; });
    if (anyRunning && !intervallo) intervallo = setInterval(tick, 1000);
  }

  function eliminaSquadraById(id) {
    squadre = squadre.filter(function (s) { return s.id !== id; });
    if (squadraSelezionataId === id) {
      chiudiDettaglio();
    }
    renderSquadreCards();
    aggiornaStatoAllarme();
  }

  function apriDettaglio(id) {
    const s = getSquadraById(id);
    if (!s) return;
    squadraSelezionataId = id;
    vistaLista.hidden = true;
    vistaDettaglio.hidden = false;
    dettaglioTitolo.textContent = "Squadra " + s.id;
    dettConsumoInput.value = s.consumoMedio;
    dettBarAttuali.value = s.barAttualiManuale != null ? s.barAttualiManuale : "";
    dettBarAttuali.placeholder = "es. 250";
    renderDettaglioVigili();
    dettaglioAvvia.disabled = s.inEsecuzione || s.finePremuto;
    dettaglioPausa.disabled = !s.inEsecuzione || s.finePremuto;
    dettaglioFine.disabled = s.finePremuto;
    cardGrafico.hidden = s.secondiTrascorsi < 20;
    updateDettaglioUI();
  }

  function chiudiDettaglio() {
    squadraSelezionataId = null;
    vistaDettaglio.hidden = true;
    vistaLista.hidden = false;
    vistaDettaglio.classList.remove("sotto-65");
  }

  function updateDettaglioUI() {
    const s = getSquadraById(squadraSelezionataId);
    if (!s) return;
    const bar = barPerSquadra(s);
    dettTempo.textContent = formatOreMinutiSecondi(s.secondiTrascorsi);
    dettBarStimati.textContent = bar + " bar";
    dettBarStimati.classList.toggle("bar-basso", bar <= 50);
    dettConsumo.textContent = s.consumoMedio + " L/min";
    dettAutonomia.textContent = formatOreMinutiSecondi(autonomiaSecondiPerSquadra(s));
    dettAutonomia.classList.toggle("sotto-5min", autonomiaSecondiPerSquadra(s) > 0 && autonomiaSecondiPerSquadra(s) < 300);
    dettLitri.textContent = litriResiduiPerSquadra(s) + " L";
    dettaglioAvvia.disabled = s.inEsecuzione;
    dettaglioPausa.disabled = !s.inEsecuzione;
    dettaglioFine.disabled = !s.inEsecuzione;
    dettaglioControls.classList.toggle("sessione-terminata", s.finePremuto);
    vistaDettaglio.classList.toggle("sotto-65", bar < SOGLIA_BAR_ALARM);
    if (s.secondiTrascorsi >= 20 && s.storicoGrafico.length > 0) {
      cardGrafico.hidden = false;
      disegnaGrafico(s);
    }
  }

  function disegnaGrafico(s) {
    if (!graficoCanvas || !s.storicoGrafico.length) return;
    const dati = s.storicoGrafico;
    const ctx = graficoCanvas.getContext("2d");
    const w = graficoCanvas.width;
    const h = graficoCanvas.height;
    const padL = 36;
    const padR = 20;
    const padT = 12;
    const padB = 20;
    const graphW = w - padL - padR;
    const graphH = h - padT - padB;
    ctx.clearRect(0, 0, w, h);
    const maxT = Math.max(20, dati[dati.length - 1].t);
    const minT = Math.max(0, maxT - 120);
    const rangeT = maxT - minT || 1;
    const maxBar = s.pressioneIniziale || 300;
    const maxConsumo = Math.max(80, Math.max.apply(null, dati.map(function (d) { return d.consumo; })));
    function x(t) { return padL + ((t - minT) / rangeT) * graphW; }
    function yBar(b) { return padT + graphH - (b / maxBar) * graphH; }
    function yConsumo(c) { return padT + graphH - (c / maxConsumo) * graphH; }
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = padT + (graphH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }
    var validi = dati.filter(function (d) { return d.t >= minT; });
    if (validi.length < 2) return;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x(validi[0].t), yBar(validi[0].bar));
    for (var j = 1; j < validi.length; j++) {
      ctx.lineTo(x(validi[j].t), yBar(validi[j].bar));
    }
    ctx.stroke();
    ctx.strokeStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(x(validi[0].t), yConsumo(validi[0].consumo));
    for (var k = 1; k < validi.length; k++) {
      ctx.lineTo(x(validi[k].t), yConsumo(validi[k].consumo));
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(160,160,176,0.8)";
    ctx.font = "10px sans-serif";
    ctx.fillText("Bar", 4, padT + 8);
    ctx.fillText("L/min", w - 38, padT + 8);
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  function aggiornaStatoAllarme() {
    const anySotto65 = squadre.some(function (s) { return barPerSquadra(s) < SOGLIA_BAR_ALARM; });
    if (anySotto65) {
      if (!allarmeInterval) {
        playBeep();
        allarmeInterval = setInterval(playBeep, 3000);
      }
      squadre.forEach(function (s) {
        const card = squadreList.querySelector("[data-squadra-id=\"" + s.id + "\"]");
        if (card) card.classList.toggle("sotto-65", barPerSquadra(s) < SOGLIA_BAR_ALARM);
      });
      if (squadraSelezionataId) {
        const s = getSquadraById(squadraSelezionataId);
        vistaDettaglio.classList.toggle("sotto-65", s && barPerSquadra(s) < SOGLIA_BAR_ALARM);
      }
    } else {
      if (allarmeInterval) {
        clearInterval(allarmeInterval);
        allarmeInterval = null;
      }
      squadreList.querySelectorAll(".squadra-card.sotto-65").forEach(function (el) { el.classList.remove("sotto-65"); });
      vistaDettaglio.classList.remove("sotto-65");
    }
  }

  function renderDettaglioVigili() {
    const s = getSquadraById(squadraSelezionataId);
    if (!s) return;
    dettVigiliTitolo.textContent = "Vigili (" + s.nomi.length + ")";
    dettVigiliList.innerHTML = "";
    if (s.nomi.length === 0) {
      dettNessunVigile.hidden = false;
      return;
    }
    dettNessunVigile.hidden = true;
    s.nomi.forEach(function (nome, i) {
      const row = document.createElement("div");
      row.className = "dett-vigile-row";
      row.setAttribute("role", "listitem");
      row.innerHTML = '<span class="nome">' + nome + '</span><button type="button" class="dett-vigile-remove" aria-label="Rimuovi ' + nome + '" data-index="' + i + '">🗑</button>';
      row.querySelector(".dett-vigile-remove").addEventListener("click", function () {
        s.nomi.splice(i, 1);
        renderDettaglioVigili();
      });
      dettVigiliList.appendChild(row);
    });
  }

  dettaglioIndietro.addEventListener("click", chiudiDettaglio);
  dettaglioAvvia.addEventListener("click", function () {
    const s = getSquadraById(squadraSelezionataId);
    if (!s || s.inEsecuzione || s.finePremuto) return;
    s.inEsecuzione = true;
    if (s.storicoGrafico.length === 0) {
      s.storicoGrafico.push({ t: 0, bar: s.pressioneIniziale, consumo: s.consumoMedio });
    }
    avviaIntervalSeNecessario();
    updateDettaglioUI();
  });
  dettaglioPausa.addEventListener("click", function () {
    const s = getSquadraById(squadraSelezionataId);
    if (!s) return;
    s.inEsecuzione = false;
    updateDettaglioUI();
  });
  dettaglioFine.addEventListener("click", function () {
    const s = getSquadraById(squadraSelezionataId);
    if (!s) return;
    s.inEsecuzione = false;
    s.finePremuto = true;
    dettaglioAvvia.disabled = true;
    dettaglioPausa.disabled = true;
    dettaglioControls.classList.add("sessione-terminata");
    updateDettaglioUI();
  });
  dettAggiornaBar.addEventListener("click", function () {
    const s = getSquadraById(squadraSelezionataId);
    if (!s) return;
    const v = parseInt(dettBarAttuali.value, 10);
    const barVal = (isNaN(v) || v < 0) ? null : Math.min(300, v);
    s.barAttualiManuale = barVal;
    if (barVal != null && s.secondiTrascorsi > 0) {
      const minutiTrascorsi = s.secondiTrascorsi / 60;
      const litriConsumati = s.litriBombola * (s.pressioneIniziale - barVal);
      const consumoDerived = minutiTrascorsi > 0 ? litriConsumati / minutiTrascorsi : s.consumoMedio;
      s.consumoMedio = Math.max(1, Math.min(200, Math.round(consumoDerived)));
      dettConsumoInput.value = s.consumoMedio;
    }
    if (barVal != null && s.inEsecuzione && s.storicoGrafico.length > 0) {
      s.storicoGrafico.push({ t: s.secondiTrascorsi, bar: barVal, consumo: s.consumoMedio });
    }
    dettConsumo.textContent = s.consumoMedio + " L/min";
    dettAutonomia.textContent = formatOreMinutiSecondi(autonomiaSecondiPerSquadra(s));
    dettAutonomia.classList.toggle("sotto-5min", autonomiaSecondiPerSquadra(s) > 0 && autonomiaSecondiPerSquadra(s) < 300);
    dettLitri.textContent = litriResiduiPerSquadra(s) + " L";
    dettBarStimati.textContent = barPerSquadra(s) + " bar";
    dettBarStimati.classList.toggle("bar-basso", barPerSquadra(s) <= 50);
    vistaDettaglio.classList.toggle("sotto-65", barPerSquadra(s) < SOGLIA_BAR_ALARM);
    if (s.secondiTrascorsi >= 20 && s.storicoGrafico.length > 0) {
      cardGrafico.hidden = false;
      disegnaGrafico(s);
    }
    updateDettaglioUI();
    aggiornaCardSquadra(s);
    aggiornaStatoAllarme();
  });
  dettConsumoInput.addEventListener("change", function () {
    const s = getSquadraById(squadraSelezionataId);
    if (!s) return;
    const c = parseInt(dettConsumoInput.value, 10);
    s.consumoMedio = (isNaN(c) || c < 1) ? 70 : Math.min(200, c);
    updateDettaglioUI();
  });

  function renderPopupDettListaNomi(filter) {
    const s = getSquadraById(squadraSelezionataId);
    if (!s) return;
    const q = (filter || "").trim().toLowerCase();
    popupDettListaNomi.innerHTML = "";
    NOMI_DISPONIBILI.filter(function (nome) {
      return !q || nome.toLowerCase().indexOf(q) !== -1;
    }).forEach(function (nome) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "popup-nome-btn";
      if (s.nomi.indexOf(nome) !== -1) btn.classList.add("gia-in-squadra");
      btn.textContent = nome;
      btn.addEventListener("click", function () {
        if (s.nomi.indexOf(nome) !== -1) return;
        s.nomi.push(nome);
        renderDettaglioVigili();
        popupDettaglioVigili.hidden = true;
      });
      popupDettListaNomi.appendChild(btn);
    });
  }

  dettAggiungiVigile.addEventListener("click", function () {
    popupDettaglioVigili.hidden = false;
    popupDettNome.value = "";
    popupDettCercaNome.value = "";
    popupDettToggleStoro.setAttribute("aria-expanded", "true");
    popupDettListaNomiContainer.classList.add("open");
    renderPopupDettListaNomi("");
    popupDettCercaNome.focus();
  });

  popupDettAggiungi.addEventListener("click", function () {
    const s = getSquadraById(squadraSelezionataId);
    if (!s) return;
    const nome = (popupDettNome.value || "").trim();
    if (nome.length === 0 || s.nomi.indexOf(nome) !== -1) return;
    s.nomi.push(nome);
    popupDettNome.value = "";
    renderDettaglioVigili();
  });
  popupDettChiudi.addEventListener("click", function () {
    popupDettaglioVigili.hidden = true;
  });

  function eliminaSquadra() {
    vigili = [];
    renderPills();
  }

  function apriPopupVigili() {
    popupVigili.hidden = false;
    popupNomeNuovo.value = "";
    popupCercaNome.value = "";
    popupToggleStoro.setAttribute("aria-expanded", "true");
    popupListaNomiContainer.classList.add("open");
    renderPopupListaNomi("");
    renderPopupVigiliAttuali();
    popupCercaNome.focus();
  }

  function chiudiPopupVigili() {
    popupVigili.hidden = true;
    renderPills();
  }

  function renderPopupListaNomi(filter) {
    const q = (filter || "").trim().toLowerCase();
    const vigiliInSquadra = vigili;
    popupListaNomi.innerHTML = "";
    NOMI_DISPONIBILI.filter(function (nome) {
      return !q || nome.toLowerCase().indexOf(q) !== -1;
    }).forEach(function (nome) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "popup-nome-btn";
      if (vigiliInSquadra.indexOf(nome) !== -1) btn.classList.add("gia-in-squadra");
      btn.textContent = nome;
      btn.addEventListener("click", function () {
        if (vigiliInSquadra.indexOf(nome) !== -1) return;
        vigili.push(nome);
        renderPopupListaNomi(popupCercaNome.value);
        renderPopupVigiliAttuali();
      });
      popupListaNomi.appendChild(btn);
    });
  }

  function renderPopupVigiliAttuali() {
    popupVigiliAttuali.innerHTML = "";
    if (vigili.length === 0) {
      popupNessunVigile.hidden = false;
      return;
    }
    popupNessunVigile.hidden = true;
    vigili.forEach(function (nome, index) {
      const pill = document.createElement("span");
      pill.className = "vigile-pill";
      pill.setAttribute("role", "listitem");
      pill.innerHTML = '<span class="pill-nome">' + nome + '</span><button type="button" class="pill-remove" aria-label="Rimuovi ' + nome + '" data-index="' + index + '">×</button>';
      pill.querySelector(".pill-remove").addEventListener("click", function () {
        vigili.splice(parseInt(this.dataset.index, 10), 1);
        renderPopupListaNomi();
        renderPopupVigiliAttuali();
      });
      popupVigiliAttuali.appendChild(pill);
    });
  }

  function popupAggiungiNomeCustom() {
    const nome = (popupNomeNuovo.value || "").trim();
    if (nome.length === 0 || vigili.indexOf(nome) !== -1) return;
    vigili.push(nome);
    popupNomeNuovo.value = "";
    renderPopupListaNomi();
    renderPopupVigiliAttuali();
  }

  function renderPills() {
    vigiliPillsContainer.innerHTML = "";
    vigili.forEach(function (nome, index) {
      const pill = document.createElement("span");
      pill.className = "vigile-pill";
      pill.setAttribute("role", "listitem");
      pill.innerHTML = '<span class="pill-nome">' + nome + '</span><button type="button" class="pill-remove" aria-label="Rimuovi ' + nome + '" data-index="' + index + '">×</button>';
      pill.querySelector(".pill-remove").addEventListener("click", function () {
        vigili.splice(parseInt(this.dataset.index, 10), 1);
        renderPills();
      });
      vigiliPillsContainer.appendChild(pill);
    });
  }

  function onReset() {
    vigili = [];
    elPressione.value = 300;
    elConsumo.value = 50;
    elBombola.value = "7.2";
    renderPills();
  }

  function onToggleAccelerato() {
    tempoAccelerato = !tempoAccelerato;
    toggleAccelerato.setAttribute("aria-checked", tempoAccelerato ? "true" : "false");
    toggleLabel.textContent = tempoAccelerato ? "On" : "Off";
  }

  btnCrea.addEventListener("click", creaSquadra);
  btnReset.addEventListener("click", onReset);
  toggleAccelerato.addEventListener("click", onToggleAccelerato);
  btnAggiungiVigile.addEventListener("click", apriPopupVigili);
  btnEliminaSquadra.addEventListener("click", eliminaSquadra);
  popupBtnAggiungiNome.addEventListener("click", popupAggiungiNomeCustom);
  popupCercaNome.addEventListener("input", function () {
    renderPopupListaNomi(popupCercaNome.value);
  });
  popupToggleStoro.addEventListener("click", function () {
    const expanded = popupToggleStoro.getAttribute("aria-expanded") === "true";
    popupToggleStoro.setAttribute("aria-expanded", !expanded);
    popupListaNomiContainer.classList.toggle("open", !expanded);
  });
  popupDettCercaNome.addEventListener("input", function () {
    renderPopupDettListaNomi(popupDettCercaNome.value);
  });
  popupDettToggleStoro.addEventListener("click", function () {
    const expanded = popupDettToggleStoro.getAttribute("aria-expanded") === "true";
    popupDettToggleStoro.setAttribute("aria-expanded", !expanded);
    popupDettListaNomiContainer.classList.toggle("open", !expanded);
  });
  popupChiudi.addEventListener("click", chiudiPopupVigili);
  popupNomeNuovo.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); popupAggiungiNomeCustom(); }
  });
  popupVigili.addEventListener("click", function (e) {
    if (e.target === popupVigili) chiudiPopupVigili();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !popupVigili.hidden) chiudiPopupVigili();
    if (e.key === "Escape" && !popupDettaglioVigili.hidden) popupDettaglioVigili.hidden = true;
  });

  renderPills();
  renderSquadreCards();
})();
