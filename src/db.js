import { defaults, validate } from './domain.js';
import { emptyPlan, initialSettings, validateLedger } from './plan.js';
export async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('my-ireland', 2);
    request.onupgradeneeded = event => {
      const database = request.result;
      if (event.oldVersion < 1) database.createObjectStore('settings');
      if (event.oldVersion < 2) database.createObjectStore('plan');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadSettings(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.get('personal');
    let result;
    let error;
    request.onsuccess = () => {
      try {
        result = request.result ? validate({ ...defaults, ...request.result }) : { ...defaults, ...initialSettings };
        if (!request.result) store.add(result, 'personal');
      } catch (cause) {
        error = cause;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(error ?? tx.error ?? new Error('Não foi possível abrir as configurações.'));
  });
}
export async function saveSettings(db, settings) {
  validate(settings);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['settings', 'plan'], 'readwrite');
    const request = tx.objectStore('plan').get('personal');
    let error;
    request.onsuccess = () => {
      try {
        validateLedger(request.result?.entries ?? [], settings.balance);
        tx.objectStore('settings').put(settings, 'personal');
      } catch (cause) {
        error = cause;
        tx.abort();
      }
    };
    tx.oncomplete = resolve;
    tx.onabort = () => reject(error ?? tx.error ?? new Error('Não foi possível salvar.'));
  });
}

export function loadPlan(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('plan').objectStore('plan').get('personal');
    request.onsuccess = () => resolve(request.result ?? emptyPlan());
    request.onerror = () => reject(request.error);
  });
}

export function updatePlan(db, change) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['plan', 'settings'], 'readwrite');
    const store = tx.objectStore('plan');
    const settings = tx.objectStore('settings').get('personal');
    const request = store.get('personal');
    let result;
    let error;
    request.onsuccess = () => {
      try {
        result = change(request.result ?? emptyPlan(), settings.result);
        store.put(result, 'personal');
      } catch (cause) {
        error = cause;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(error ?? tx.error ?? new Error('Não foi possível salvar.'));
  });
}

export function restorePlan(db, backup, canRestore) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['plan', 'settings'], 'readwrite');
    const settingsStore = tx.objectStore('settings');
    const planStore = tx.objectStore('plan');
    const settings = settingsStore.get('personal');
    const current = planStore.get('personal');
    let error;
    current.onsuccess = () => {
      try {
        if (!canRestore(settings.result, current.result ?? emptyPlan())) {
          throw new Error('A restauração só é permitida em um navegador sem planejamento cadastrado.');
        }
        settingsStore.put(backup.settings, 'personal');
        planStore.put(backup.plan, 'personal');
      } catch (cause) {
        error = cause;
        tx.abort();
      }
    };
    tx.oncomplete = resolve;
    tx.onabort = () => reject(error ?? tx.error ?? new Error('Não foi possível restaurar.'));
  });
}
