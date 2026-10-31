import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

/**
 * Finestre di avviso/conferma multipiattaforma.
 * Su iPhone e Android usa l'Alert nativo; sul web (anteprima di sviluppo) usa
 * window.alert / window.confirm, perché l'Alert di React Native Web non mostra nulla.
 */
function webAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  const text = message ? `${title}\n\n${message}` : title;
  const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
  const cancel = (buttons ?? []).find((b) => b.style === 'cancel');
  if (actions.length === 0 || (actions.length === 1 && !cancel)) {
    window.alert(text);
    actions[0]?.onPress?.();
    return;
  }
  // Una conferma per azione: la prima accettata viene eseguita.
  for (const action of actions) {
    const question = actions.length === 1 ? text : `${text}\n\n${action.text}?`;
    if (window.confirm(question)) {
      action.onPress?.();
      return;
    }
  }
  cancel?.onPress?.();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (Platform.OS === 'web') webAlert(title, message, buttons);
    else NativeAlert.alert(title, message, buttons);
  },
};
