export function createKebabAlias(str: string): string | undefined {
    if (!/[a-z][A-Z]/.test(str)) {
        return;
    }
    return str.replace(/[a-z][A-Z]/g, subStr => subStr.split('').join('-')).toLowerCase();
}

export function objMap<T, R>(obj: Record<string, T>, fn: (item: T) => R): Record<string, R> {
    const res: any = {};
    for (const [name, value] of Object.entries(obj)) {
        res[name] = fn(value);
    }
    return res;
}