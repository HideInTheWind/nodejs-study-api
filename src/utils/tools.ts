/**
 * 是否为正整数
 * @param n
 * @returns
 */
export const isPositiveInteger = (n: number): boolean => {
  const formattedNumber = Number(n);
  return Number.isInteger(formattedNumber) && formattedNumber > 0;
};
