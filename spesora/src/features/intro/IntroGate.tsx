import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../app/AppProvider';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { onReplayIntro } from './introBus';
import { MinaIntro } from './MinaIntro';

/**
 * Mostra l'animazione iniziale una sola volta (primo avvio, o quando cambia la versione dell'intro),
 * oppure su richiesta dalle Impostazioni. Con "Riduci movimento" non viene mostrata.
 * L'app è già pronta sotto: l'intro non blocca né ritarda l'accesso.
 */
export function IntroGate() {
  const { status, service } = useApp();
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status.kind !== 'ready' || !service) return;
    let alive = true;
    void service.introSeen().then((seen) => {
      if (!alive || seen) return;
      if (reduced) void service.markIntroSeen();
      else setShow(true);
    });
    return () => {
      alive = false;
    };
  }, [status.kind, service, reduced]);

  useEffect(() => onReplayIntro(() => setShow(true)), []);

  const done = useCallback(() => {
    setShow(false);
    void service?.markIntroSeen();
  }, [service]);

  if (!show) return null;
  return <MinaIntro onDone={done} />;
}
