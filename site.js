(() => {
  'use strict';
  const posts = window.PUBLICACOES;
  const byId = new Map(posts.map(post => [post.id, post]));
  const destaques = ['expedicao-rio-negro', 'expedicao-rio-amazonas', 'expedicoes-fluviais'];
  const emFoco = ['equipe-de-campo', 'caminho-ate-a-escola', 'rumo-ao-parana-da-eva'];
  const temas = ['Todos', 'Expedições', 'Diário de campo', 'Transporte escolar', 'Rotas e logística', 'Equipe'];
  const get = id => document.getElementById(id);
  const normalize = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  const reader = get('leitor');
  let tema = 'Todos';
  let previousHash = '';
  let postLink = '';
  let opener = null;

  function card(post) {
    const node = document.createElement('a');
    node.className = 'card';
    node.href = '#post=' + post.id;
    node.dataset.post = post.id;
    node.innerHTML = '<div class="card-media"><img alt="" loading="lazy" decoding="async"></div><div class="card-copy"><span class="card-theme"></span><h3></h3><p></p><span class="card-link">Ler publicação <span aria-hidden="true">↗</span></span></div>';
    node.querySelector('.card-media').style.setProperty('--poster', 'url("' + post.capa + '")');
    node.querySelector('img').src = post.capa;
    node.querySelector('.card-theme').textContent = post.categoria;
    node.querySelector('h3').textContent = post.titulo;
    node.querySelector('p').textContent = post.resumo;
    return node;
  }

  function render() {
    const query = normalize(get('busca').value);
    const filtered = Boolean(query) || tema !== 'Todos';
    const lista = filtered
      ? posts.filter(p => (tema === 'Todos' || p.categoria === tema) && normalize([p.titulo, p.categoria, p.resumo].join(' ')).includes(query))
      : [...emFoco.map(id => byId.get(id)), ...posts.filter(p => !emFoco.includes(p.id))];
    const visible = filtered ? lista : lista.slice(0, emFoco.length);
    const rest = lista.slice(visible.length);
    get('lista').replaceChildren(...visible.map(card));
    get('lista-mais').replaceChildren(...rest.map(card));
    get('mais').hidden = !rest.length;
    get('mais').open = false;
    get('mais-titulo').textContent = 'Ver outras ' + rest.length + ' publicações';
    get('resultados').textContent = !lista.length
      ? 'Nenhuma publicação encontrada. Tente outro termo ou tema.'
      : lista.length + (lista.length === 1 ? ' publicação' : ' publicações') + (filtered ? ' na seleção' : ' no acervo');
  }

  get('total-acervo').textContent = posts.length;
  get('destaques').append(...destaques.map((id, index) => {
    const post = byId.get(id);
    const link = document.createElement('a');
    const cover = document.createElement('img');
    const label = document.createElement('span');
    link.href = '#post=' + id;
    link.dataset.post = id;
    link.className = 'floating-post poster-' + index;
    cover.src = index === 1 ? post.imagem : post.capa;
    cover.alt = '';
    cover.loading = 'lazy';
    cover.decoding = 'async';
    label.textContent = (index === 1 ? 'Em destaque · ' : '') + post.titulo + ' ↗';
    link.append(cover, label);
    return link;
  }));
  get('leitura-complementar').append(card(byId.get('caminho-ate-a-escola')));
  for (const categoria of temas) {
    const button = document.createElement('button');
    const count = document.createElement('sup');
    count.textContent = categoria === 'Todos' ? posts.length : posts.filter(p => p.categoria === categoria).length;
    button.type = 'button';
    button.append(categoria, count);
    button.setAttribute('aria-pressed', String(categoria === tema));
    button.addEventListener('click', () => {
      tema = categoria;
      for (const chip of get('filtros').children) chip.setAttribute('aria-pressed', String(chip === button));
      render();
    });
    get('filtros').append(button);
  }
  get('busca').addEventListener('input', render);
  render();

  function open(post, trigger = null) {
    const hash = '#post=' + post.id;
    if (!reader.open) {
      previousHash = location.hash.startsWith('#post=') ? '' : location.hash;
      opener = trigger;
    }
    const image = get('leitor-imagem');
    image.src = post.imagem;
    image.alt = 'Peça editorial: ' + post.titulo;
    get('leitor-titulo').textContent = post.titulo;
    get('leitor-tema').textContent = post.categoria;
    get('leitor-resumo').textContent = post.resumo;
    get('ampliar').href = post.imagem;
    get('baixar').href = post.imagem;
    get('aviso-link').textContent = '';
    get('link-manual').hidden = true;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    postLink = location.href;
    if (!reader.open) reader.showModal();
    reader.scrollTop = 0;
  }

  function sync() {
    const post = byId.get(location.hash.replace(/^#post=/, ''));
    if (location.hash.startsWith('#post=') && post) open(post);
    else if (reader.open) reader.close();
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-post]');
    if (!trigger || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(byId.get(trigger.dataset.post), trigger);
  });
  get('fechar').addEventListener('click', () => reader.close());
  reader.addEventListener('click', event => { if (event.target === reader) reader.close(); });
  reader.addEventListener('close', () => {
    if (location.hash.startsWith('#post=')) history.replaceState(null, '', previousHash || location.pathname + location.search);
    opener?.focus({preventScroll: true});
  });
  get('copiar').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(postLink);
      get('aviso-link').textContent = 'Link copiado.';
    } catch {
      const field = get('link-manual');
      field.value = postLink;
      field.hidden = false;
      field.select();
      field.focus();
      get('aviso-link').textContent = 'Copie o endereço abaixo.';
    }
  });
  addEventListener('hashchange', sync);
  sync();
})();
