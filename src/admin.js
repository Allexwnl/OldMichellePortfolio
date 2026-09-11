import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { startAdmin } from './admin-app.js';

async function boot() {
  const response = await fetch('public-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('De instellingen konden niet worden geladen. Herlaad de pagina.');
  const config = await response.json();
  if (!config.configured) {
    document.querySelector('#setup').hidden = false;
    document.querySelector('#auth-status').textContent = 'De beheeromgeving is klaar om te koppelen.';
    return;
  }
  const auth = getAuth(initializeApp(config.firebase));
  await setPersistence(auth, browserSessionPersistence);
  const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
  startAdmin({ login: () => signInWithPopup(auth, provider), logout: () => signOut(auth),
    observe: callback => onAuthStateChanged(auth, callback) });
}
boot().catch(() => { document.querySelector('#auth-status').textContent = 'Beheer kon niet starten. Controleer de Firebase-instellingen en herlaad de pagina.'; });
