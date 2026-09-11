import { element, renderProject, renderTimeline } from './render.js';

const $ = selector => document.querySelector(selector);
const newId = () => crypto.randomUUID();
export function startAdmin(auth) {
  let user, state, revision, selected, tab = 'projects', dirty = false, busy = false, pollTimer, pollGeneration = 0;
  let cropImage, cropProject, dragStart;
  const urls = new Map();
  const pendingKey = 'michelle-pending-publication';
  const remember = value => { try { value ? sessionStorage.setItem(pendingKey, value) : sessionStorage.removeItem(pendingKey); } catch { /* Storage may be disabled. */ } };
  const recalled = () => { try { return sessionStorage.getItem(pendingKey); } catch { return null; } };
  function notice(message, error = false) { $('#operation-status').textContent = message; $('#operation-status').classList.toggle('error', error); }
  function changed() { dirty = true; $('#save-state').textContent = 'Niet-opgeslagen wijzigingen'; }
  function lock(value) {
    busy = value;
    for (const selector of ['#editor-controls', '#save', '#publish', '#logout', '#retry-deploy']) $(selector).disabled = value;
  }
  async function task(work) {
    if (busy) return;
    lock(true);
    try { await work(); } catch (error) { notice(error.message || 'Er ging iets mis. Probeer het opnieuw.', true); }
    finally { lock(false); }
  }
  async function api(action, body, binary = false) {
    if (!user) throw new Error('Log eerst in met Google.');
    const response = await fetch(`/.netlify/functions/admin?action=${action}`, {
      method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store', signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Verzoek mislukt (${response.status}). Probeer het opnieuw.`);
    }
    return binary ? response.blob() : response.json();
  }
  async function resolveImage(path) {
    if (!path.startsWith('media/')) return path;
    if (!urls.has(path)) {
      const promise = api(`media&path=${encodeURIComponent(path)}`, undefined, true).then(blob => URL.createObjectURL(blob));
      urls.set(path, promise);
      promise.catch(() => urls.delete(path));
    }
    return urls.get(path);
  }
  const current = () => state[tab].find(item => item.id === selected);
  function button(text, click, className = '') {
    const node = element('button', className, text); node.type = 'button'; node.addEventListener('click', click); return node;
  }
  function field(label, value, update, { type = 'text', max = 150, options } = {}) {
    const wrapper = element('label', 'field', label);
    const input = element(options ? 'select' : type === 'textarea' ? 'textarea' : 'input');
    if (options) for (const [value, title] of options) { const option = element('option', '', title); option.value = value; input.append(option); }
    else { if (type !== 'textarea') input.type = type; input.maxLength = max; }
    input.value = value;
    input.addEventListener('input', () => { update(input.value); changed(); });
    wrapper.append(input); return wrapper;
  }
  function move(items, index, offset) {
    const next = index + offset;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]]; changed(); render();
  }
  function renderList() {
    const list = $('#item-list'); list.replaceChildren();
    state[tab].forEach((item, index) => {
      const row = element('li', `item-row${selected === item.id ? ' selected' : ''}`);
      const select = button(item.title, () => { selected = item.id; render(); }, 'select-item');
      select.append(element('small', '', tab === 'projects' ? item.status === 'draft' ? 'Concept · niet zichtbaar' : 'Zichtbaar na publiceren' : item.type === 'education' ? 'Opleiding' : 'Werkervaring'));
      select.setAttribute('aria-current', selected === item.id ? 'true' : 'false');
      const order = element('div', 'order-buttons');
      const up = button('↑', () => move(state[tab], index, -1)); up.setAttribute('aria-label', `${item.title} omhoog`); up.disabled = index === 0;
      const down = button('↓', () => move(state[tab], index, 1)); down.setAttribute('aria-label', `${item.title} omlaag`); down.disabled = index === state[tab].length - 1;
      order.append(up, down); row.append(select, order); list.append(row);
    });
  }
  function preview(item) {
    if (tab === 'projects') renderProject($('#preview-content'), item, resolveImage);
    else renderTimeline($('#preview-content'), state.timeline);
    $('#preview-dialog').showModal();
  }
  function render() {
    renderList(); const editor = $('#editor'); editor.replaceChildren();
    const item = current();
    if (!item) { editor.append(element('h2', '', tab === 'projects' ? 'Ruimte voor een nieuw project' : 'Jouw volgende stap'), element('p', 'muted', 'Voeg een item toe of selecteer er een uit de lijst.')); return; }
    const title = element('div', 'editor-title');
    title.append(element('h2', '', tab === 'projects' ? 'Project bewerken' : 'Tijdlijn bewerken'), button('Voorbeeld bekijken ↗', () => preview(item)));
    editor.append(title);
    editor.append(field('Titel', item.title, value => { item.title = value; renderList(); }));
    const grid = element('div', 'field-grid');
    if (tab === 'projects') {
      grid.append(field('Categorie', item.category, value => item.category = value, { max: 100 }), field('Jaar / periode', item.year, value => item.year = value, { max: 40 }));
      editor.append(grid, field('Zichtbaarheid bij de volgende publicatie', item.status, value => { item.status = value; renderList(); }, {
        options: [['published', 'Zichtbaar op de website'], ['draft', 'Concept — alleen in beheer']]
      }), field('Projecttekst', item.description, value => item.description = value, { type: 'textarea', max: 30000 }));
      editor.append(element('p', 'muted', 'Gebruik een lege regel voor een nieuwe alinea. De tekst verschijnt tussen de eerste twee afbeeldingen en de rest van de galerij.'));
      renderGallery(editor, item);
    } else {
      grid.append(field('Soort', item.type, value => { item.type = value; renderList(); }, { options: [['education', 'Opleiding'], ['work', 'Werkervaring']] }),
        field('Periode', item.period, value => item.period = value, { max: 100 }));
      editor.append(grid, field('School / organisatie', item.organization, value => item.organization = value),
        field('Omschrijving (optioneel)', item.description, value => item.description = value, { type: 'textarea', max: 2000 }));
    }
    const remove = element('div', 'delete-row');
    remove.append(button(tab === 'projects' ? 'Project verwijderen' : 'Tijdlijnitem verwijderen', () => {
      if (!confirm(`“${item.title}” verwijderen? Dit gaat pas live als je publiceert.`)) return;
      state[tab] = state[tab].filter(i => i.id !== item.id); selected = state[tab][0]?.id; changed(); render();
    }, 'danger')); editor.append(remove);
  }
  function uploadInput(label, handler, multiple = false) {
    const wrapper = element('label', 'upload-label', label); const input = element('input');
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.multiple = multiple;
    input.addEventListener('change', () => { const files = [...input.files]; input.value = ''; if (files.length) handler(files); }); wrapper.append(input); return wrapper;
  }
  function renderGallery(editor, project) {
    const heading = element('div', 'gallery-header');
    heading.append(element('h3', '', 'Afbeeldingen'), element('p', 'muted', 'Foto’s worden automatisch verkleind. Kies één afbeelding als omslag. JPG, PNG of WebP, maximaal 60 MB per bronbestand.'));
    const uploads = element('div', 'upload-row');
    uploads.append(uploadInput('+ Afbeeldingen uploaden', files => task(async () => {
      if (project.images.length + files.length > 40) throw new Error('Maximaal 40 afbeeldingen per project.');
      for (const [index, file] of files.entries()) {
        notice(`Afbeelding ${index + 1} van ${files.length} verkleinen en uploaden…`);
        const bitmap = await decode(file);
        try { await addImage(project, await compress(bitmap), file.name.replace(/\.[^.]+$/, '')); } finally { bitmap.close(); }
        render();
      }
      notice('Afbeeldingen toegevoegd. Sla het concept op of publiceer je wijzigingen.');
    }), true), uploadInput('Uitsnede uit projectpagina', files => task(async () => {
      cropImage?.close(); cropImage = await decode(files[0]); cropProject = project;
      for (const [id, value] of [['x',0],['y',0],['w',100],['h',100]]) $(`#crop-${id}`).value = value;
      $('#crop-status').textContent = ''; drawCrop(); $('#crop-dialog').showModal();
    })));
    heading.append(uploads); editor.append(heading);
    const gallery = element('div', 'gallery-editor');
    project.images.forEach((img, index) => {
      const card = element('div', 'image-card'); const image = element('img'); image.alt = img.alt || project.title;
      resolveImage(img.src).then(url => { image.src = url; }).catch(() => { image.alt = 'Voorbeeld niet beschikbaar'; }); card.append(image);
      card.append(field('Afbeeldingsomschrijving', img.alt, value => img.alt = value, { max: 300 }), field('Bijschrift', img.caption, value => img.caption = value, { max: 500 }));
      const actions = element('div', 'button-row');
      const cover = button(project.cover === img.src ? '✓ Omslag' : 'Als omslag', () => { project.cover = img.src; changed(); render(); }, project.cover === img.src ? 'cover-active' : '');
      const up = button('↑', () => move(project.images, index, -1)); up.disabled = index === 0; up.setAttribute('aria-label', `Afbeelding ${index + 1} omhoog`);
      const down = button('↓', () => move(project.images, index, 1)); down.disabled = index === project.images.length - 1; down.setAttribute('aria-label', `Afbeelding ${index + 1} omlaag`);
      actions.append(cover, up, down, button('Verwijderen', () => {
        project.images.splice(index, 1);
        if (project.cover === img.src && !project.images.some(i => i.src === img.src)) project.cover = project.images[0]?.src || '';
        changed(); render();
      }, 'danger')); card.append(actions); gallery.append(card);
    });
    editor.append(gallery);
    if (project.cover && !project.images.some(i => i.src === project.cover)) editor.append(element('p', 'muted', 'De bestaande kaartafbeelding is nog je omslag. Klik op “Als omslag” om een andere te kiezen.'));
  }
  async function decode(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 60 * 1024 * 1024) throw new Error('Kies een JPG, PNG of WebP van maximaal 60 MB.');
    try { return await createImageBitmap(file); } catch { throw new Error('Deze afbeelding kan niet worden geopend. Probeer een kleiner JPG- of PNG-bestand.'); }
  }
  async function compress(bitmap, crop = { x: 0, y: 0, w: bitmap.width, h: bitmap.height }) {
    const scale = Math.min(1, 2000 / Math.max(crop.w, crop.h));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(crop.w * scale)); canvas.height = Math.max(1, Math.round(crop.h * scale));
    canvas.getContext('2d').drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
    for (const quality of [.85, .72, .58]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob?.type === 'image/webp' && blob.size <= 2 * 1024 * 1024) return blob;
    }
    throw new Error('Verkleinen is niet gelukt. Kies een kleinere afbeelding of een kleinere uitsnede.');
  }
  async function addImage(project, blob, alt = '') {
    if (project.images.length >= 40) throw new Error('Maximaal 40 afbeeldingen per project.');
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
    const result = await api('upload', { data }); urls.set(result.path, Promise.resolve(URL.createObjectURL(blob)));
    project.images.push({ src: result.path, alt, caption: '' }); if (!project.cover) project.cover = result.path; changed();
  }
  function selection() {
    const [x,y,w,h] = ['x','y','w','h'].map(id => Number($(`#crop-${id}`).value));
    if ([x,y,w,h].some(v => !Number.isFinite(v)) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 100.1 || y + h > 100.1) throw new Error('De uitsnede moet binnen de afbeelding vallen.');
    return { x, y, w: Math.min(w, 100-x), h: Math.min(h, 100-y) };
  }
  function drawCrop() {
    if (!cropImage) return;
    const canvas = $('#crop-canvas'), scale = Math.min(1, 1000 / cropImage.width, 700 / cropImage.height);
    canvas.width = Math.round(cropImage.width * scale); canvas.height = Math.round(cropImage.height * scale);
    const ctx = canvas.getContext('2d'); ctx.drawImage(cropImage, 0, 0, canvas.width, canvas.height);
    try {
      const r = selection(); ctx.fillStyle = '#18213488'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(cropImage, r.x/100*cropImage.width, r.y/100*cropImage.height, r.w/100*cropImage.width, r.h/100*cropImage.height,
        r.x/100*canvas.width,r.y/100*canvas.height,r.w/100*canvas.width,r.h/100*canvas.height);
      ctx.strokeStyle = '#589efa'; ctx.lineWidth = 3; ctx.strokeRect(r.x/100*canvas.width,r.y/100*canvas.height,r.w/100*canvas.width,r.h/100*canvas.height);
    } catch { /* Allow partial numeric input while editing. */ }
  }
  function point(event) { const rect = $('#crop-canvas').getBoundingClientRect(); return { x: Math.max(0, Math.min(100, (event.clientX-rect.left)/rect.width*100)), y: Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100)) }; }
  $('#crop-canvas').addEventListener('pointerdown', event => { dragStart = point(event); event.target.setPointerCapture(event.pointerId); });
  $('#crop-canvas').addEventListener('pointermove', event => {
    if (!dragStart) return; const end = point(event);
    const values = { x: Math.min(dragStart.x,end.x), y: Math.min(dragStart.y,end.y), w: Math.abs(end.x-dragStart.x), h: Math.abs(end.y-dragStart.y) };
    for (const [key,value] of Object.entries(values)) $(`#crop-${key}`).value = value.toFixed(1); drawCrop();
  });
  for (const event of ['pointerup','pointercancel']) $('#crop-canvas').addEventListener(event, () => { dragStart = null; });
  for (const id of ['x','y','w','h']) $(`#crop-${id}`).addEventListener('input', drawCrop);
  $('#upload-crop').addEventListener('click', () => task(async () => {
    $('#upload-crop').disabled = true; $('#close-crop').disabled = true;
    try {
      const r = selection(); $('#crop-status').textContent = 'Uitsnede verkleinen en uploaden…';
      await addImage(cropProject, await compress(cropImage, { x:r.x/100*cropImage.width,y:r.y/100*cropImage.height,w:r.w/100*cropImage.width,h:r.h/100*cropImage.height }));
      render(); $('#crop-status').textContent = 'Toegevoegd! Selecteer eventueel een volgende afbeelding, of sluit dit venster.';
    } catch (error) { $('#crop-status').textContent = error.message; }
    finally { $('#upload-crop').disabled = false; $('#close-crop').disabled = false; }
  }));
  $('#crop-dialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  $('#close-crop').addEventListener('click', () => { $('#crop-dialog').close(); cropImage?.close(); cropImage = null; });
  $('#close-preview').addEventListener('click', () => $('#preview-dialog').close());
  async function save(publish) {
    notice(publish ? 'Wijzigingen bewaren en publicatie starten…' : 'Concept opslaan…');
    const result = await api(publish ? 'publish' : 'save', { state, revision });
    revision = result.revision; dirty = false; $('#save-state').textContent = 'Alle wijzigingen opgeslagen';
    notice(publish ? 'Je wijzigingen zijn opgeslagen.' : 'Concept opgeslagen. De live website is nog niet gewijzigd.');
    if (publish) publication(result);
  }
  function publication(result) {
    clearTimeout(pollTimer); pollGeneration++;
    remember(result.publishedRevision); $('#publication').hidden = false;
    if (!result.deploymentStarted) {
      $('#publish-spinner').hidden = true; $('#retry-deploy').hidden = false;
      $('#publish-status').textContent = 'Inhoud opgeslagen, maar Netlify kon niet starten. Controleer de build hook in Netlify en probeer opnieuw.';
      return;
    }
    waitForPublication(result.publishedRevision);
  }
  function waitForPublication(expected) {
    clearTimeout(pollTimer); const generation = ++pollGeneration, started = Date.now();
    $('#publication').hidden = false; $('#publish-spinner').hidden = false; $('#retry-deploy').hidden = true;
    $('#publish-status').textContent = 'Netlify bouwt je website. We controleren wanneer je wijzigingen live staan…';
    async function check() {
      if (generation !== pollGeneration || !user) return;
      try {
        const response = await fetch(`portfolio.json?publication=${encodeURIComponent(expected)}&t=${Date.now()}`, { cache:'no-store', signal: AbortSignal.timeout(10000) });
        const data = response.ok ? await response.json() : null;
        if (generation !== pollGeneration) return;
        if (data?.revision === expected) {
          $('#publish-spinner').hidden = true; $('#publish-status').textContent = '✓ Je wijzigingen staan live!'; remember(null); return;
        }
      } catch { /* Keep checking through a temporary network interruption. */ }
      if (generation !== pollGeneration) return;
      if (Date.now() - started > 5 * 60 * 1000) {
        $('#publish-spinner').hidden = true; $('#retry-deploy').hidden = false;
        $('#publish-status').textContent = 'Je wijzigingen staan nog niet live. Controleer de deploy in Netlify; de build kan langer duren of zijn mislukt. Je inhoud is veilig opgeslagen.'; return;
      }
      pollTimer = setTimeout(check, 5000);
    }
    check();
  }
  $('#save').addEventListener('click', () => task(() => save(false)));
  $('#publish').addEventListener('click', () => task(() => save(true)));
  $('#retry-deploy').addEventListener('click', () => task(async () => publication(await api('deploy', {}))));
  $('#add').addEventListener('click', () => {
    const item = tab === 'projects' ? { id:newId(), title:'Nieuw project', category:'', year:'', description:'', status:'draft', cover:'', images:[], video:'' }
      : { id:newId(), type:'education', title:'Nieuwe stap', organization:'', period:'', description:'' };
    state[tab].push(item); selected = item.id; changed(); render(); $('#editor input')?.focus();
  });
  for (const name of ['projects', 'timeline']) $(`#tab-${name}`).addEventListener('click', () => {
    tab = name; selected = state[tab][0]?.id;
    for (const value of ['projects','timeline']) { $(`#tab-${value}`).classList.toggle('active', value === tab); $(`#tab-${value}`).setAttribute('aria-pressed', String(value === tab)); }
    $('#add').textContent = tab === 'projects' ? '+ Nieuw project' : '+ Nieuwe stap'; render();
  });
  $('#login').disabled = false;
  $('#login').addEventListener('click', async () => {
    $('#login').disabled = true; $('#auth-status').textContent = 'Google openen…';
    try { await auth.login(); } catch { $('#auth-status').textContent = 'Inloggen is niet gelukt. Sta pop-ups toe en probeer opnieuw.'; }
    finally { $('#login').disabled = false; }
  });
  $('#logout').addEventListener('click', async () => {
    if (dirty && !confirm('Je hebt niet-opgeslagen wijzigingen. Toch uitloggen?')) return;
    try { await auth.logout(); } catch { notice('Uitloggen is niet gelukt. Probeer opnieuw.', true); }
  });
  auth.observe(async account => {
    user = account;
    if (!account) {
      clearTimeout(pollTimer); pollGeneration++; state = undefined; dirty = false;
      for (const promise of urls.values()) promise.then(url => URL.revokeObjectURL(url)).catch(() => {}); urls.clear();
      $('#editor').replaceChildren(); $('#item-list').replaceChildren(); $('#preview-content').replaceChildren();
      $('#preview-dialog').close(); $('#crop-dialog').close(); cropImage?.close(); cropImage = null;
      $('#publication').hidden = true; notice('');
      $('#workspace').hidden = true; $('#login-panel').hidden = false; $('#logout').hidden = true; $('#auth-status').textContent = ''; return;
    }
    $('#auth-status').textContent = 'Toegang controleren en portfolio laden…'; $('#logout').hidden = false;
    try {
      const result = await api('state');
      if (user !== account) return;
      state = result.state; revision = result.revision; selected = state[tab][0]?.id; dirty = false;
      $('#account').textContent = `Ingelogd als ${result.email}`;
      $('#auth-status').textContent = ''; $('#login-panel').hidden = true; $('#workspace').hidden = false; render();
      $('#save-state').textContent = 'Alle wijzigingen opgeslagen';
      if (recalled()) waitForPublication(recalled());
    } catch (error) { $('#auth-status').textContent = error.message; $('#workspace').hidden = true; }
  });
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
}
