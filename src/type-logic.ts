import { Option, OptionSet, Types } from './option';

export type GetPropertiyNames<T extends Record<string, unknown>, P> = {
    [K in keyof T]: T[K] extends P ? K : never;
}[keyof T];

export type GetProperties<T extends Record<string, unknown>, P> = Pick<T, GetPropertiyNames<T, P>>;

type PickRequiredOpts<O extends OptionSet> = GetProperties<O, Option<any, true, boolean, any> | Option<any, boolean, true, any>>;
type PickNonRequiredOpts<O extends OptionSet> = GetProperties<O, Option<any, false, boolean, any>>;

type ResolveOptionType<O extends Option<Types, boolean, boolean, any>> = O extends Option<any, boolean, boolean, infer R>
    ? R
    : never;

type ResolveOption<O extends Option<Types, boolean, boolean, any>> = O extends Option<Types, boolean, true, any>
    ? Array<ResolveOptionType<O>>
    : ResolveOptionType<O>;

type ResolveOptionSet<O extends OptionSet> = {
    [key in keyof PickRequiredOpts<O>]: ResolveOption<PickRequiredOpts<O>[key]>;
} & {
    [key in keyof PickNonRequiredOpts<O>]?: ResolveOption<PickNonRequiredOpts<O>[key]>;
}

export type CliDeclaration = {
    name?: string;
    options?: OptionSet;
    description?: string;
    _?: Option<Types, boolean, boolean, any>;
}

export type ResolveCliDeclaration<D extends CliDeclaration> = {
    options: D['options'] extends OptionSet ? ResolveOptionSet<D['options']> : {};
    _: D['_'] extends Option<any, infer R, any, any>
        ? R extends true
            ? ResolveOption<D['_']>
            : ResolveOption<D['_']> | undefined
        : undefined;
}
