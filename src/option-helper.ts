import { Option, Types, ResolveType } from "./option";
import { oneOf, url } from "../presets";

/**
 * Defines a new option
 * @param type option data type
 */
export function option<T extends Types>(type: T): Option<T, false, false, ResolveType<T>> {
    return new Option<T, false, false, ResolveType<T>>(type);
}

option.int = option('int');
option.number = option('number');
option.boolean = option('boolean');
option.string = option('string');
option.any = option('any');

option.oneOf = oneOf;
option.url = url;
