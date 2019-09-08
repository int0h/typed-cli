import {Option, OptionSet, Types, ResolveType} from './option';

export type GetPropertiyNames<T extends Object, P> = {
    [K in keyof T]: T[K] extends P ? K : never;
}[keyof T];

export type GetProperties<T extends Object, P> = Pick<T, GetPropertiyNames<T, P>>;

type PickRequiredOpts<O extends OptionSet> = GetProperties<O, Option<any, true, boolean> | Option<any, boolean, true>>;
type PickNonRequiredOpts<O extends OptionSet> = GetProperties<O, Option<any, false, boolean>>;

type ResolveOptionType<O extends Option<Types, boolean, boolean>> = O extends Option<infer T, boolean, boolean>
    ? ResolveType<T>
    : never;

type ResolveOption<O extends Option<Types, boolean, boolean>> = O extends Option<Types, boolean, true>
    ? Array<ResolveOptionType<O>>
    : ResolveOptionType<O>;

type ResolveOptionSet<O extends OptionSet> = {
    [key in keyof PickRequiredOpts<O>]: ResolveOption<PickRequiredOpts<O>[key]>;
} & {
    [key in keyof PickNonRequiredOpts<O>]?: ResolveOption<PickNonRequiredOpts<O>[key]>;
}

export type CliDeclaration = {
    options?: OptionSet;
    description?: string;
    _?: Option<Types, boolean, boolean>;
}

const aliasStorage = new WeakMap<any, Set<string>[]>();

export type ResolveCliDeclaration<D extends CliDeclaration> = {
    options: D['options'] extends OptionSet ? ResolveOptionSet<D['options']> : {};
    _: D['_'] extends Option<any, infer R, any>
        ? R extends true
            ? ResolveOption<D['_']>
            : ResolveOption<D['_']> | undefined
        : undefined;
}