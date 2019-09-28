module.exports = {
    out: '../typed-cli-docs/',
    theme: 'minimal',

    readme: 'readme.md',
    includes: './index.ts',
    exclude: [
        './presets/index.ts',
        'src/type-logic.ts',
        'src/completer.ts',
        'src/decorator.ts',
        'src/default-cli.ts',
        'src/errors.ts',
        'src/i18n.ts',
        'src/pipeline.ts',
        'src/printer.ts',
        'src/report.ts',
        'src/utils.ts',
        'tests/**/*',
        'pg/**/*',
        'presets/**/*',
        'option-helper/**/*'
    ],
    excludeNotExported: true,
    excludePrivate: true
};
