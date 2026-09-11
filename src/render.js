let imageSizes = {};
export function setImageSizes(sizes) { imageSizes = sizes || {}; }
export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function projectImage(src, alt, eager = false, resolve) {
  const wrapper = element('div', 'image-frame loading');
  const img = element('img');
  img.alt = alt; img.loading = eager ? 'eager' : 'lazy'; img.decoding = 'async';
  if (imageSizes[src]) { img.width = imageSizes[src].width; img.height = imageSizes[src].height; }
  img.addEventListener('load', () => wrapper.classList.remove('loading'));
  img.addEventListener('error', () => {
    wrapper.classList.remove('loading');
    wrapper.append(element('p', 'image-error', 'Afbeelding kon niet worden geladen.'));
  }, { once: true });
  if (resolve) resolve(src).then(url => { img.src = url; }).catch(() => img.dispatchEvent(new Event('error')));
  else {
    img.src = src;
    img.srcset = `${src.replace('.webp', '-640.webp')} 640w, ${src.replace('.webp', '-1280.webp')} 1280w, ${src} 2000w`;
    img.sizes = '(max-width: 700px) 92vw, 46vw';
  }
  wrapper.append(img);
  return wrapper;
}
export function renderProject(root, project, resolve) {
  root.replaceChildren();
  const heading = element('header', 'project-heading');
  heading.append(element('p', 'eyebrow', [project.category, project.year].filter(Boolean).join(' · ')), element('h1', '', project.title));
  root.append(heading);
  const images = project.images.length ? project.images : project.cover ? [{ src: project.cover, alt: project.title, caption: '' }] : [];
  function gallery(items, first = false) {
    const grid = element('div', 'project-gallery');
    for (const [i, image] of items.entries()) {
      const figure = element('figure');
      figure.append(projectImage(image.src, image.alt || project.title, first && i < 2, resolve));
      if (image.caption) figure.append(element('figcaption', '', image.caption));
      grid.append(figure);
    }
    root.append(grid);
  }
  gallery(images.slice(0, 2), true);
  const text = element('div', 'project-description');
  for (const paragraph of project.description.split(/\n\s*\n/).filter(Boolean)) text.append(element('p', '', paragraph));
  root.append(text);
  gallery(images.slice(2));
  if (project.video) {
    const video = element('video', 'project-video');
    video.controls = true; video.preload = 'none'; video.playsInline = true; video.src = project.video;
    video.setAttribute('aria-label', 'Video van Rave Run'); root.append(video);
  }
}
export function renderTimeline(root, items) {
  root.replaceChildren(element('h2', '', 'Opleiding & werkervaring'));
  const list = element('ol', 'timeline');
  for (const item of items) {
    const row = element('li', `timeline-item ${item.type}`);
    row.append(element('p', 'eyebrow', item.type === 'education' ? 'Opleiding' : 'Werkervaring'),
      element('h3', '', item.title), element('p', 'organization', item.organization), element('p', 'period', item.period));
    if (item.description) row.append(element('p', '', item.description));
    list.append(row);
  }
  root.append(list);
}
