type KeyMap<T> = {
  [K in keyof T]: (value: T[K]) => any;
};

type MappedObject<T, M extends KeyMap<T>> = {
  [K in keyof T]: ReturnType<M[K]>;
};

export function mapKeys<T extends Record<string, any>, M extends KeyMap<T>>(
  obj: T,
  map: M,
) {
  const result = {} as MappedObject<T, M>;
  for (const key in obj) {
    // map[key] might be null, if obj has a field at runntime, not included in it's type.
    // This field will NOT be included in the output of this function.
    if (map[key]) {
      result[key] = map[key](obj[key]);
    }
  }
  return result;
}
