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

export function alignTextMatrix(textMatrix: string[][], alignment?: ('left' | 'right')[]): string[][] {
    const colSizes: number[] = [];
    textMatrix.forEach(line => {
        line.forEach((text, index) => colSizes[index] = Math.max(colSizes[index] || 0, text.length));
    });
    return textMatrix.map(line => {
        return line.map((text, index) => {
            const align = alignment && alignment[index] || 'left';
            return align === 'left'
                ? text.padEnd(colSizes[index], ' ')
                : text.padStart(colSizes[index], ' ');
        });
    });
}

export function arrayPartition<T>(array: T[], fn: (item: T, index: number, array: T[]) => boolean): [T[], T[]] {
    return [
        array.filter((item, index, array) => fn(item, index, array)),
        array.filter((item, index, array) => !fn(item, index, array))
    ];
}

export function tabText(text: string, prefix: string): string {
    return text.split('\n')
        .map(line => prefix + line)
        .join('\n');
}

export function findKeyCollision(keys: string[]): string | null {
    const usedKeys = new Set<string>();
    for (const key of keys) {
        if (usedKeys.has(key)) {
            return key;
        }
        usedKeys.add(key);
    }
    return null;
}
