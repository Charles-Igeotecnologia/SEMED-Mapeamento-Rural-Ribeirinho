(() => {
  'use strict';

  // Âncoras editoriais WGS 84, escolhidas na base de referência para
  // distinguir as duas regiões. Não são coordenadas do levantamento.
  const regioes = [
    { id: 'negro', nome: 'Rio Negro', centro: [-3.07, -60.16], posts: ['expedicao-rio-negro'] },
    { id: 'amazonas', nome: 'Rio Amazonas', centro: [-3.08, -59.76], posts: ['expedicao-rio-amazonas', 'rio-amazonas-etapas', 'porto-de-bom-sucesso', 'rumo-ao-parana-da-eva'] }
  ];
  const todos = ['expedicoes-fluviais', 'expedicao-rio-negro', 'expedicao-rio-amazonas'];
  const posts = new Map(window.PUBLICACOES.map(post => [post.id, post]));
  const area = document.getElementById('atlas-mapa');
  const lista = document.getElementById('atlas-regioes');
  const leituras = document.getElementById('atlas-leituras');
  const aviso = document.getElementById('atlas-aviso');
  let mapa;
  const controles = new Map();
  const marcas = new Map();

  function linkPost(id) {
    const link = document.createElement('a');
    link.href = '#post=' + id;
    link.dataset.post = id;
    link.textContent = posts.get(id).titulo + ' ↗';
    return link;
  }

  function miniatura(id) {
    const img = document.createElement('img');
    img.src = posts.get(id).capa;
    img.alt = '';
    img.width = img.height = 52;
    img.loading = 'lazy';
    img.className = 'atlas-thumb';
    return img;
  }

  function renderLeituras(regiao) {
    const heading = document.createElement('h3');
    heading.textContent = regiao ? 'Leituras · ' + regiao.nome : 'Leituras das expedições';
    const ul = document.createElement('ul');
    for (const id of regiao?.posts ?? todos) {
      const li = document.createElement('li');
      const link = linkPost(id);
      const titulo = document.createElement('span');
      titulo.textContent = link.textContent;
      link.replaceChildren(miniatura(id), titulo);
      li.append(link);
      ul.append(li);
    }
    leituras.replaceChildren(heading, ul);
    for (const [id, botao] of controles) botao.setAttribute('aria-pressed', String(id === regiao?.id));
    for (const [id, marca] of marcas) marca.getElement()?.classList.toggle('is-active', id === regiao?.id);
  }

  function visaoGeral() {
    mapa?.fitBounds(regioes.map(regiao => regiao.centro), { padding: [34, 34], maxZoom: 10, animate: false });
  }

  function abrirRegiao(regiao, mover) {
    iniciarMapa();
    renderLeituras(regiao);
    if (mover) mapa?.setView(regiao.centro, 10, { animate: false });
    marcas.get(regiao.id)?.openPopup();
  }

  function iniciarMapa() {
    if (mapa) return;
    if (!window.L) {
      area.querySelector('.map-placeholder').textContent = 'Mapa indisponível. As leituras continuam acessíveis ao lado.';
      return;
    }
    area.replaceChildren();
    mapa = L.map(area, { scrollWheelZoom: false, minZoom: 5, maxZoom: 12, zoomControl: false });
    L.control.zoom({ zoomInTitle: 'Ampliar mapa', zoomOutTitle: 'Reduzir mapa' }).addTo(mapa);
    visaoGeral();

    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
    const imagem = L.tileLayer(esri + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 12,
      attribution: 'Imagens: <a href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">Esri</a>, Vantor, Earthstar Geographics e comunidade GIS'
    });
    const rotulos = L.tileLayer(esri + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 12, zIndex: 2,
      attribution: 'Rótulos: Esri, HERE, Garmin, <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> e comunidade GIS'
    });
    const satelite = L.layerGroup([imagem, rotulos]);
    const referencia = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">Colaboradores do OpenStreetMap</a>'
    });
    for (const base of [imagem, referencia]) {
      let carregada = false;
      base.on('add', () => { carregada = false; aviso.hidden = true; });
      base.on('tileerror', () => {
        if (carregada) return;
        aviso.textContent = 'A base selecionada não carregou. Experimente a outra opção no controle de camadas.';
        aviso.hidden = false;
      });
      base.on('tileload', () => { carregada = true; aviso.hidden = true; });
    }
    satelite.addTo(mapa);
    const camadas = L.control.layers({ 'Satélite com rótulos': satelite, 'Mapa de referência': referencia }).addTo(mapa);
    const alternar = camadas.getContainer().querySelector('.leaflet-control-layers-toggle');
    alternar.title = 'Camadas do mapa';
    alternar.setAttribute('aria-label', 'Camadas do mapa');

    regioes.forEach((regiao, index) => {
      const icon = L.divIcon({ className: 'atlas-pin', html: String(index + 1).padStart(2, '0'), iconSize: [29, 29], iconAnchor: [14, 14], popupAnchor: [0, -14] });
      const popup = document.createElement('div');
      const nome = document.createElement('strong');
      nome.textContent = regiao.nome;
      const legenda = document.createElement('small');
      legenda.textContent = 'Referência regional aproximada';
      popup.append(nome, legenda, linkPost(regiao.posts[0]));
      const marker = L.marker(regiao.centro, { icon, title: regiao.nome }).addTo(mapa).bindPopup(popup);
      marker.getElement().setAttribute('aria-label', regiao.nome + ' — referência regional aproximada');
      marker.on('popupopen', () => renderLeituras(regiao));
      marcas.set(regiao.id, marker);
    });
  }

  regioes.forEach(regiao => {
    const botao = document.createElement('button');
    botao.type = 'button';
    const texto = document.createElement('span');
    const nome = document.createElement('strong');
    nome.textContent = regiao.nome;
    const detalhe = document.createElement('small');
    detalhe.textContent = 'Referência regional aproximada';
    texto.append(nome, detalhe);
    botao.append(miniatura(regiao.posts[0]), texto);
    botao.setAttribute('aria-controls', 'atlas-leituras');
    botao.addEventListener('click', () => abrirRegiao(regiao, true));
    controles.set(regiao.id, botao);
    lista.append(botao);
  });
  renderLeituras();
  document.getElementById('atlas-reset').addEventListener('click', () => {
    iniciarMapa();
    mapa?.closePopup();
    visaoGeral();
    renderLeituras();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      iniciarMapa();
      observer.disconnect();
    }, { rootMargin: '160px' });
    observer.observe(area);
  } else iniciarMapa();
})();
