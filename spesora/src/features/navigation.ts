import { router, type Href } from 'expo-router';

/** Torna alla schermata precedente; se non esiste (es. pagina aperta da un link diretto) va a `fallback`. */
export function goBack(fallback: Href = '/'): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
