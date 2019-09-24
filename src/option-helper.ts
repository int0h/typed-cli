import { opt } from "./option";
import { oneOf, url } from "../presets";

/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const option = {
    get int(){return opt('int')},
    get number(){return opt('number')},
    get boolean(){return opt('boolean')},
    get string(){return opt('string')},
    get any(){return opt('any')},

    // presets:
    oneOf,
    get url() {return url()}
};
