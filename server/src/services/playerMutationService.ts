const mutationTails = new Map<string, Promise<void>>();

async function runQueuedMutation<T>(key: string, action: () => Promise<T> | T): Promise<T> {
  const previousTail = mutationTails.get(key) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const currentTail = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const chainedTail = previousTail.catch(() => undefined).then(() => currentTail);
  mutationTails.set(key, chainedTail);

  await previousTail.catch(() => undefined);

  try {
    return await action();
  } finally {
    releaseCurrent();
    if (mutationTails.get(key) === chainedTail) {
      mutationTails.delete(key);
    }
  }
}

export function runPlayerMutation<T>(playerKey: string, action: () => Promise<T> | T): Promise<T> {
  return runQueuedMutation(playerKey, action);
}

export function runPlayerPairMutation<T>(playerKeys: string[], action: () => Promise<T> | T): Promise<T> {
  const orderedKeys = [...new Set(playerKeys.filter(Boolean))].sort();

  if (orderedKeys.length === 0) {
    return Promise.resolve(action());
  }

  const [currentKey, ...restKeys] = orderedKeys;
  return runQueuedMutation(currentKey, () => runPlayerPairMutation(restKeys, action));
}
