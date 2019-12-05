function arrayify<T>(arg: T | T[]): T[] {
  if (Array.isArray(arg)) {
    return arg
  }
  return [arg]
}
