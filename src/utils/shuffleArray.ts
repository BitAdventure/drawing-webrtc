const shuffleArray = <T>(array: Array<T>): Array<T> =>
  array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

export default shuffleArray;
