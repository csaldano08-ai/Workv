import { describe, expect, it } from 'vitest';
import { EMPTY_DIRECTOR, MINA_RULES, clearScope, decide, type DirectorState, type MinaEvent } from '../ui/mascot/director';

const run = (events: [MinaEvent, number][]) => {
  let st: DirectorState = EMPTY_DIRECTOR;
  const out: (number | null)[] = [];
  for (const [ev, at] of events) {
    const r = decide(st, ev, at);
    st = r.state;
    out.push(r.reaction ? r.reaction.id : null);
  }
  return { st, out };
};

describe('regia di Mina: priorità, ripetizioni, interruzioni', () => {
  it('un evento diventa una reazione della sua pagina', () => {
    const { st, out } = run([[{ scope: 'shopping', kind: 'listCompleted' }, 1000]]);
    expect(out).toEqual([1]);
    expect(st.current.shopping?.kind).toBe('listCompleted');
    expect(st.current.pantry).toBeUndefined();
  });

  it('lo stesso evento ripetuto a breve viene ignorato (niente scena ripetuta)', () => {
    const ev: MinaEvent = { scope: 'home', kind: 'missingIngredients', key: 'pasto-1' };
    const { out } = run([
      [ev, 0],
      [ev, 60_000],
      [ev, MINA_RULES.missingIngredients.repeatMs + 1],
    ]);
    expect(out).toEqual([1, null, 2]);
    // con un'altra chiave (un altro pasto) non è una ripetizione
    expect(run([[ev, 0], [{ ...ev, key: 'pasto-2' }, 10]]).out).toEqual([1, 2]);
  });

  it('una reazione importante in corso non viene interrotta da una minore; dopo, sì', () => {
    const done: MinaEvent = { scope: 'cooking', kind: 'timerDone', key: 'p1' };
    const start: MinaEvent = { scope: 'cooking', kind: 'timerStarted', key: 'p2' };
    const hold = MINA_RULES.timerDone.holdMs;
    const { out } = run([
      [done, 0],
      [start, 500],
      [{ ...start, key: 'p3' }, hold + 1],
    ]);
    expect(out).toEqual([1, null, 2]);
  });

  it('una reazione di pari o maggiore priorità interrompe quella in corso', () => {
    const { st, out } = run([
      [{ scope: 'pantry', kind: 'shortage', key: 'a' }, 0],
      [{ scope: 'pantry', kind: 'shortageResolved' }, 300],
    ]);
    expect(out).toEqual([1, 2]);
    expect(st.current.pantry?.kind).toBe('shortageResolved');
  });

  it('lasciando la pagina la reazione si azzera, ma le ripetizioni restano ricordate', () => {
    const ev: MinaEvent = { scope: 'week', kind: 'mealPlanned', key: 'x' };
    let { st } = run([[ev, 0]]);
    st = clearScope(st, 'week');
    expect(st.current.week).toBeUndefined();
    expect(decide(st, ev, 100).reaction).toBeNull();
    expect(clearScope(st)).toBe(st); // niente da togliere: stesso stato
  });

  it('ogni reazione ha un id nuovo (fa ripartire il gesto) e una durata', () => {
    const { st } = run([
      [{ scope: 'week', kind: 'mealPlanned', key: 'a' }, 0],
      [{ scope: 'week', kind: 'mealPlanned', key: 'b' }, 5000],
    ]);
    expect(st.current.week?.id).toBe(2);
    expect(st.current.week!.until - st.current.week!.at).toBe(MINA_RULES.mealPlanned.holdMs);
  });
});
