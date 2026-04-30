export function createEntityRegistry() {
  const groups = new Map();

  function ensureGroup(groupName) {
    if (!groups.has(groupName)) {
      groups.set(groupName, new Map());
    }

    return groups.get(groupName);
  }

  return {
    register(groupName, id, entity) {
      if (!groupName || !id || !entity) {
        return entity;
      }

      ensureGroup(groupName).set(id, entity);
      return entity;
    },
    unregister(groupName, id) {
      groups.get(groupName)?.delete(id);
    },
    replaceGroup(groupName, entities = [], getId = (entry) => entry?.id ?? entry?.npcId) {
      const nextGroup = new Map();
      entities.forEach((entity) => {
        const id = getId(entity);
        if (id) {
          nextGroup.set(id, entity);
        }
      });
      groups.set(groupName, nextGroup);
      return entities;
    },
    list(groupName) {
      return Array.from(groups.get(groupName)?.values() ?? []);
    },
    clearGroup(groupName) {
      groups.delete(groupName);
    },
    clear() {
      groups.clear();
    },
  };
}
