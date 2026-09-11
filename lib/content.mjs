export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const mediaPattern = /^media\/[a-f0-9]{64}\.webp$/;
export const localImagePattern = /^assets\/[a-z0-9-]+\.webp$/;
export function imagePath(value) {
  if (typeof value !== 'string' || !(mediaPattern.test(value) || localImagePattern.test(value))) {
    throw new HttpError(400, 'Ongeldig afbeeldingspad. Upload de afbeelding opnieuw.');
  }
  return value;
}
function string(value, max, label, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new HttpError(400, `Controleer ${label} (maximaal ${max} tekens).`);
  }
  return value.trim();
}
function list(value, max, label) {
  if (!Array.isArray(value) || value.length > max) throw new HttpError(400, `Te veel of ongeldige ${label}.`);
  return value;
}
function id(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) throw new HttpError(400, 'Ongeldige identificatie.');
  return value;
}
function unique(items) {
  if (new Set(items.map(item => item.id)).size !== items.length) throw new HttpError(400, 'Dubbele identificatie.');
  return items;
}
export function validateState(input) {
  if (!input || input.version !== 1) throw new HttpError(400, 'Onbekende inhoudsversie.');
  const projects = unique(list(input.projects, 100, 'projecten').map(p => {
    if (!p || !['draft', 'published'].includes(p.status)) throw new HttpError(400, 'Ongeldige projectstatus.');
    const images = list(p.images, 40, 'afbeeldingen').map(img => ({
      src: imagePath(img.src), alt: string(img.alt, 300, 'de afbeeldingsomschrijving'),
      caption: string(img.caption, 500, 'het bijschrift')
    }));
    const cover = p.cover ? imagePath(p.cover) : '';
    if (p.status === 'published' && !cover) throw new HttpError(400, 'Een zichtbaar project heeft een omslagafbeelding nodig.');
    return {
      id: id(p.id), title: string(p.title, 150, 'de titel', true),
      category: string(p.category, 100, 'de categorie'), year: string(p.year, 40, 'het jaar'),
      description: string(p.description, 30000, 'de projecttekst'), status: p.status, cover, images,
      video: p.video === 'img/raverunfilmpje.mp4' ? p.video : ''
    };
  }));
  const timeline = unique(list(input.timeline, 100, 'tijdlijnitems').map(t => {
    if (!['education', 'work'].includes(t.type)) throw new HttpError(400, 'Kies opleiding of werkervaring.');
    return {
      id: id(t.id), type: t.type, title: string(t.title, 150, 'de tijdlijntitel', true),
      organization: string(t.organization, 150, 'de organisatie'), period: string(t.period, 100, 'de periode'),
      description: string(t.description, 2000, 'de tijdlijnomschrijving')
    };
  }));
  return { version: 1, projects, timeline };
}

export function publishedContent(state, revision) {
  const validated = validateState(state);
  return { ...validated, revision, projects: validated.projects.filter(p => p.status === 'published') };
}
export function referencedImages(content) {
  return [...new Set(content.projects.flatMap(p => [p.cover, ...p.images.map(i => i.src)]).filter(Boolean))];
}
