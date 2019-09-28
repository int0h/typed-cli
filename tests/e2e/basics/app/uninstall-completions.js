const tabtab = require('tabtab');

tabtab
    .uninstall({
        name: 'calc-area',
    })
    .catch(err => {
        console.error('UNINSTALL ERROR', err);
    });
