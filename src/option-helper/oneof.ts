
import { objMap } from '../utils';
import { Option } from '../option';
import { allIssues } from '../errors';
import {option} from './base-opts';

type OneOfDecl = readonly string[] | {
    [key: string]: any | {
        description?: string;
        value?: any;
    };
}

type OneOfDeclNorm = {
    [key: string]: {
        description: string;
        value: any;
    };
}

type ResolveOneOfDeclType<T extends OneOfDecl> = T extends readonly string[]
    ? T[number]
    : {
        [key in keyof T]: T[key] extends {value: infer V}
            ? V
            : T[key]
    }[keyof T];

function fromPairs(pairs: [string, any][]): any {
    const res: any = {};
    for (const [key, value] of pairs) {
        res[key] = value;
    }
    return res;
}

function normalizeDecl(decl: OneOfDecl): OneOfDeclNorm {
    if (Array.isArray(decl)) {
        const pairs = decl.map(key => [key, {
            description: '',
            value: key
        }]);
        return fromPairs(pairs as any);
    }
    return objMap(decl, (value, key) => {
        if (typeof value === 'string') {
            return {
                value,
                description: ''
            };
        }
        return {
            value: key,
            description: '',
            ...value,
        }
    });
}

export const oneOf = <T extends OneOfDecl>(decl: T): Option<ResolveOneOfDeclType<T>, false, false> => {
    const normDecl = normalizeDecl(decl);
    const keys = Object.keys(normDecl);
    return option.string
        .label(keys.join('|'))
        .completer(partial => {
            return keys
                .filter(key => key.indexOf(partial) === 0)
                .map(key => {
                    return {
                        completion: key,
                        description: normDecl[key].description
                    };
                });
        })
        .validate(value => {
            if (keys.includes(value)) {
                return;
            }
            throw new allIssues.TypeMismatchError(keys.map(k => `'${k}'`).join(' | '), value);
        }) as any;
};
