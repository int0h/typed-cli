/** @hidden */
import { Option } from './option';

export type GetPropertyNames<T extends Record<string, unknown>, P> = {
    [K in keyof T]: T[K] extends P ? K : never;
}[keyof T];

export type GetProperties<T extends Record<string, unknown>, P> = Pick<T, GetPropertyNames<T, P>>;

export type OptionSet = Record<string, Option<any, boolean, boolean>>;


type PickRequiredOpts<O extends OptionSet> = GetProperties<O, Option<any, true, boolean> | Option<any, boolean, true>>;
type PickNonRequiredOpts<O extends OptionSet> = GetProperties<O, Option<any, false, boolean>>;

type ResolveOptionType<O extends Option<any, boolean, boolean>> = O extends Option<infer R, boolean, boolean>
    ? R
    : never;

type ResolveOption<O extends Option<any, boolean, boolean>> = O extends Option<any, boolean, true>
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
    useEnv?: boolean;
    envPrefix?: string;
    _?: Option<any, boolean, boolean>;
}

export type ResolveCliDeclaration<D extends CliDeclaration> = {
    options: D['options'] extends OptionSet ? ResolveOptionSet<D['options']> : {};
    _: D['_'] extends Option<any, infer R, any>
        ? R extends true
            ? ResolveOption<D['_']>
            : ResolveOption<D['_']> | undefined
        : undefined;
}
