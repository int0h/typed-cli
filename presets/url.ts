import url, { UrlWithStringQuery } from 'url';

import { Option } from '../src/option';
import { opt } from '../src/option';

const urlOption: () => Option<'string', boolean, boolean, UrlWithStringQuery> = () => opt('string')
    .label('url')
    .process('post', str => {
        return url.parse(str);
    });

export default urlOption;
