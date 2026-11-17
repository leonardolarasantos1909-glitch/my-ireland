import { defaults, validate } from './domain.js';
export async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('my-ireland', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadSettings(db) {
  const existing = await new Promise((resolve, reject) => {
    const request = db.transaction('settings').objectStore('settings').get('personal');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (existing) return validate({ ...defaults, ...existing });
  await saveSettings(db, { ...defaults });
  return { ...defaults };
}
export async function saveSettings(db, settings) {
  validate(settings);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put(settings, 'personal');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Não foi possível salvar.'));
  });
}
