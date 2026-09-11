import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import seed from '../../content/seed.json' with {type:'json'};

test('Homepage, all legacy project links, mobile menu and lightweight images',async({page})=>{
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  const requested=[]; page.on('request',request=>requested.push(request.url()));
  await page.goto('/'); await expect(page.locator('.project-card')).toHaveCount(7); await expect(page.locator('.timeline-item')).toHaveCount(7);
  expect(requested.some(url=>url.endsWith('.mp4')||url.includes('pagina%20met'))).toBe(false);
  for(const path of ['bedrijfsproject.html','rendersBjörnBorg.html','guesproject.html','raverun.html','happy socks.html','lampproject.html','hotelkamerproject.html']){
    await page.goto('/'+encodeURI(path)); await expect(page.locator('#project-detail h1')).not.toBeEmpty();
    await expect(page.locator('.project-description')).not.toBeEmpty();
    await page.locator('.project-gallery img').first().waitFor();
    await expect.poll(()=>page.locator('.project-gallery img').first().evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    if(path==='bedrijfsproject.html') {
      for(const img of await page.locator('.project-gallery img').all()) {
        await expect(img).toHaveAttribute('width', /\d+/);
        await img.scrollIntoViewIfNeeded(); await expect.poll(()=>img.evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);
      }
      await page.screenshot({path:'.preview/project-desktop.png',fullPage:true});
    }
  }
  await page.setViewportSize({width:390,height:844}); await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(7); await page.locator('#menu-toggle').click();
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.locator('.project-card').first().scrollIntoViewIfNeeded();
  await expect.poll(()=>page.locator('.project-card img').first().evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await page.screenshot({path:'.preview/home-mobile.png',fullPage:true}); expect(errors).toEqual([]);
});

test('Admin explains setup when accounts are not connected',async({page})=>{
  await page.route('**/public-config.json',route=>route.fulfill({json:{configured:false}}));
  await page.goto('/admin/'); await expect(page.locator('#setup')).toBeVisible();
  await expect(page.locator('#login')).toBeDisabled(); await expect(page.locator('#workspace')).toBeHidden();
  await page.screenshot({path:'.preview/admin-setup.png',fullPage:true});
});

async function editor(page,{deny=false,hook=true}={}) {
  // Test-only entry replaces Firebase in the browser. It is served by Playwright routing,
  // never copied into dist or shipped as a login bypass.
  const entry=`import {startAdmin} from './src/admin-app.js'; let observer; startAdmin({login:async()=>{},logout:async()=>observer(null),observe:cb=>{observer=cb;cb({getIdToken:async()=> 'test-token'});}});`;
  const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'esm'});
  await page.route('**/admin.js',route=>route.fulfill({contentType:'application/javascript',body:bundle.outputFiles[0].text}));
  let saved=structuredClone(seed), revision='initial', live={...structuredClone(seed),revision:'old'};
  const uploadPath=`media/${'a'.repeat(64)}.webp`;
  const uploaded=await readFile('assets/michelle.webp');
  await page.route('**/.netlify/functions/admin?**',async route=>{
    if(deny) return route.fulfill({status:403,json:{error:'Dit Google-account heeft geen toegang tot het beheer.'}});
    const action=new URL(route.request().url()).searchParams.get('action');
    if(action==='state') return route.fulfill({json:{state:saved,revision,email:'alexanderzoet@gmail.com'}});
    if(action==='media') return route.fulfill({contentType:'image/webp',body:uploaded});
    if(action==='upload') return route.fulfill({json:{path:uploadPath}});
    const body=route.request().postDataJSON();
    if(action==='save'||action==='publish'){
      saved=body.state; revision='saved-'+Date.now();
      if(action==='publish'&&hook) live={...saved,projects:saved.projects.filter(p=>p.status==='published'),revision:'new-publication'};
      return route.fulfill({json:{revision,publishedRevision:action==='publish'?'new-publication':null,deploymentStarted:action==='publish'&&hook}});
    }
    return route.fulfill({status:400,json:{error:'Unknown action'}});
  });
  await page.route('**/portfolio.json?**',route=>route.fulfill({json:live}));
  await page.goto('/admin.html');
  return {saved:()=>saved};
}

test('Editor supports drafts, text, upload, cover, preview, timeline and confirmed publication',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const fixture=await editor(page); await expect(page.locator('#workspace')).toBeVisible();
  await page.locator('#add').click(); await page.getByLabel('Titel',{exact:true}).fill('Nieuw ontwerp');
  await page.getByLabel('Projecttekst',{exact:true}).fill('Een eigen projecttekst.\n\nMet een tweede alinea.');
  await page.locator('input[type=file]').first().setInputFiles('assets/michelle.webp');
  await expect(page.locator('.image-card')).toHaveCount(1); await expect(page.locator('#save')).toBeEnabled();
  await page.getByRole('button',{name:'Voorbeeld bekijken'}).click();
  await expect(page.locator('#preview-content h1')).toHaveText('Nieuw ontwerp'); await page.locator('#close-preview').click();
  await page.locator('#save').click(); await expect(page.locator('#operation-status')).toContainText('Concept opgeslagen');
  expect(fixture.saved().projects.at(-1).status).toBe('draft');
  await page.getByLabel('Zichtbaarheid bij de volgende publicatie').selectOption('published');
  await page.locator('#tab-timeline').click(); await page.locator('#add').click();
  await page.getByLabel('Titel',{exact:true}).fill('Nieuwe baan'); await page.getByRole('combobox',{name:'Soort',exact:true}).selectOption('work');
  await page.getByLabel('Periode',{exact:true}).fill('2026 – heden');
  await page.locator('#publish').click(); await expect(page.locator('#publish-status')).toContainText('Je wijzigingen staan live');
  expect(fixture.saved().timeline.at(-1).title).toBe('Nieuwe baan');
  await page.locator('#tab-projects').click(); await page.screenshot({path:'.preview/admin-editor.png',fullPage:true});
  await page.setViewportSize({width:390,height:844}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'.preview/admin-mobile.png',fullPage:true}); expect(errors).toEqual([]);
});

test('Unauthorized accounts see no editor and failed deployment is never reported as live',async({page})=>{
  await editor(page,{deny:true}); await expect(page.locator('#auth-status')).toContainText('geen toegang'); await expect(page.locator('#workspace')).toBeHidden();
  await page.unrouteAll(); await editor(page,{hook:false}); await expect(page.locator('#workspace')).toBeVisible();
  await page.locator('#publish').click(); await expect(page.locator('#publish-status')).toContainText('Netlify kon niet starten');
  await expect(page.locator('#retry-deploy')).toBeVisible(); await expect(page.locator('#publish-status')).not.toContainText('staan live');
});

test('Crop extraction, reorder and delete work without changing the live site before publishing',async({page})=>{
  const fixture=await editor(page); await expect(page.locator('#workspace')).toBeVisible();
  await page.locator('#add').click();
  await page.locator('input[type=file]').nth(1).setInputFiles('assets/michelle.webp');
  await expect(page.locator('#crop-dialog')).toBeVisible(); await page.locator('#crop-w').fill('50');
  await page.locator('#upload-crop').click(); await expect(page.locator('#crop-status')).toContainText('Toegevoegd');
  await page.locator('#close-crop').click(); await expect(page.locator('.image-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Nieuw project omhoog',exact:true}).click();
  await page.locator('#save').click(); await expect(page.locator('#operation-status')).toContainText('Concept opgeslagen');
  expect(fixture.saved().projects.at(-2).title).toBe('Nieuw project');
  page.on('dialog',dialog=>dialog.accept()); await page.getByRole('button',{name:'Project verwijderen',exact:true}).click();
  await page.locator('#save').click(); await expect(page.locator('#operation-status')).toContainText('Concept opgeslagen');
  expect(fixture.saved().projects).toHaveLength(7);
});
