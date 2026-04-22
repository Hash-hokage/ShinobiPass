const noop = () => Promise.resolve(null);

const asyncStorageShim = {
  getItem: noop,
  setItem: noop,
  removeItem: noop,
  mergeItem: noop,
  clear: noop,
  getAllKeys: () => Promise.resolve([]),
  flushGetRequests: () => {},
  multiGet: () => Promise.resolve([]),
  multiSet: noop,
  multiRemove: noop,
  multiMerge: noop,
};

export default asyncStorageShim;
