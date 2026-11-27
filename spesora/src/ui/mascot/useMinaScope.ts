import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { resetMina, useMinaReaction, type MinaReaction, type MinaScope } from './director';

/**
 * La reazione corrente di Mina in una pagina. Lasciando la pagina (o mandando l'app in background) la reazione
 * si azzera: al ritorno Mina non ripete una scena vecchia. Gli ascoltatori vengono rimossi allo smontaggio.
 */
export function useMinaScope(scope: MinaScope): MinaReaction | undefined {
  const reaction = useMinaReaction(scope);
  useFocusEffect(useCallback(() => () => resetMina(scope), [scope]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') resetMina(scope);
    });
    return () => sub.remove();
  }, [scope]);
  return reaction;
}
