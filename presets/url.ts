import url from 'url';

import {option} from '../';

const urlOption = option('string')
    .label('url')
    .process('post', str => {
        return url.parse(str);
    });

export default urlOption;
