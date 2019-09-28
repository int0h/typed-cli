const tabtab = require('tabtab');

tabtab
    .install({
        name: 'calc-area',
        completer: 'calc-area',
        completeCmd: 'typed-cli--complete-input'
    })
    .catch(err => {
        console.error('INSTALL ERROR', err);
    });
