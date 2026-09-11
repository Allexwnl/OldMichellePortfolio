import { element, projectImage, renderProject, renderTimeline, setImageSizes } from './render.js';
const menu = document.querySelector('#menu-toggle');
menu?.addEventListener('click', () => {
  const open = document.querySelector('#nav-links').classList.toggle('show');
  menu.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('#nav-links a').forEach(a => a.addEventListener('click', () => {
  document.querySelector('#nav-links').classList.remove('show'); menu?.setAttribute('aria-expanded', 'false');
}));
document.querySelector('#play-background')?.addEventListener('click', async event => {
  const video = document.querySelector('#backgroundvideo');
  if (!video.src) video.src = video.dataset.src;
  if (!video.paused) { video.pause(); event.target.textContent = 'Animatie afspelen'; return; }
  event.target.disabled = true; event.target.textContent = 'Animatie laden…';
  try { await video.play(); event.target.textContent = 'Animatie pauzeren'; }
  catch { event.target.textContent = 'Opnieuw afspelen'; }
  finally { event.target.disabled = false; }
});
async function loadContent() {
  const status = document.querySelector('#content-status');
  try {
    const response = await fetch('portfolio.json');
    if (!response.ok) throw new Error('load');
    const data = await response.json();
    setImageSizes(data.imageSizes);
    const root = document.querySelector('#project-detail');
    if (root) {
      const id = document.body.dataset.project || new URLSearchParams(location.search).get('id');
      const project = data.projects.find(p => p.id === id);
      if (!project) root.replaceChildren(element('h1', '', 'Project niet gevonden'), element('p', '', 'Dit project is niet meer beschikbaar. Bekijk de andere projecten op de homepage.'));
      else { document.title = `${project.title} · Michelle Jonk`; renderProject(root, project); }
    } else {
      const grid = document.querySelector('#project-grid'); grid.replaceChildren();
      for (const project of data.projects) {
        const card = element('a', 'project-card'); card.href = `project.html?id=${encodeURIComponent(project.id)}`;
        card.append(projectImage(project.cover, project.title), element('h2', '', project.title)); grid.append(card);
      }
      if (!data.projects.length) grid.append(element('p', '', 'Nieuwe projecten volgen binnenkort.'));
      renderTimeline(document.querySelector('#timeline'), data.timeline);
    }
    status.hidden = true;
  } catch {
    status.replaceChildren(element('span', '', 'De inhoud kon niet worden geladen. '));
    const retry = element('button', '', 'Opnieuw proberen');
    retry.addEventListener('click', () => { status.textContent = 'Inhoud laden…'; loadContent(); }); status.append(retry);
  }
}
loadContent();
