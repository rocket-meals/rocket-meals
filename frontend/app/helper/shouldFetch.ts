export const shouldFetch = (
  key: string | string[],
  serverMap: Record<string, string>,
  localMap: Record<string, string>
): boolean => {
  const keys = Array.isArray(key) ? key : [key];

  return keys.some((k) => {
    const serverDate = serverMap[k] ? new Date(serverMap[k]) : null;
    const localDate = localMap[k] ? new Date(localMap[k]) : null;

    if (!localDate) return true;

    return !!serverDate && serverDate > localDate;
  });
};
