import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { useApp } from '../app/AppProvider';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { onReplayIntro, setIntroState } from './introBus';
import { MinaIntro } from './MinaIntro';

/**
 * Mostra l'animazione iniziale una sola volta (primo avvio, o quando cambia la versione dell'intro),
 * oppure su richiesta dalle Impostazioni. Con "Riduci movimento" o con lo screen reader attivo non viene mostrata.
 * L'app è già pronta sotto: l'intro non blocca né ritarda l'accesso. Mentre si controlla se va mostrata resta
 * il fondo avorio (lo stesso della schermata di avvio nativa), così la schermata sotto non lampeggia.
 */
export function IntroGate() {
  const { status, service } = useApp();
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<'checking' | 'show' | 'hidden'>('checking');

  useEffect(() => {
    if (status.kind !== 'ready' || !service) return;
    let alive = true;
    // (sul web react-native-web risponde sempre «sì» allo screen reader: lì vale solo "Riduci movimento")
    const reader = Platform.OS === 'web' ? Promise.resolve(false) : AccessibilityInfo.isScreenReaderEnabled().catch(() => false);
    void Promise.all([service.introSeen(), reader]).then(([seen, readerOn]) => {
      if (!alive) return;
      if (seen) return setMode('hidden');
      if (reduced || readerOn) {
        void service.markIntroSeen();
        return setMode('hidden');
      }
      setIntroState('playing');
      setMode('show');
    }, () => alive && setMode('hidden'));
    return () => {
      alive = false;
    };
  }, [status.kind, service, reduced]);

  useEffect(
    () =>
      onReplayIntro(() => {
        setIntroState('playing');
        setMode('show');
      }),
    [],
  );

  const done = useCallback(() => {
    setMode('hidden');
    setIntroState('done');
    void service?.markIntroSeen();
  }, [service]);

  if (mode === 'checking') return status.kind === 'ready' ? <View style={styles.cover} pointerEvents="none" /> : null;
  if (mode === 'hidden') return null;
  return <MinaIntro onDone={done} />;
}

const styles = StyleSheet.create({ cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ivory } });
