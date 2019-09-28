# typed-cli

![typed-cli logo](./logo128.png)

A library to help you create **type-safe** CLI's fast and simple.

# Usage example

```typescript
import {cli, option} from 'typed-cli';
import app from './app';

const {options} = cli({
    options: {
        env: option.oneOf(['dev', 'prod'] as const)
            .alias('e')
            .required()
            .description('app environment'),
        port: option.int
            .alias('p')
            .default(80)
            .description('port'),
    }
});

// port: number
// env: 'dev' | 'prod'
const {port, env} = options;


const DB_HOSTS = {
    dev: 'localhost:1234',
    prod: '1.2.3.4:9999',
} as const;

// Type safe!
// no "No index signature with a parameter of type 'string'" kind of errors
// because typeof env is 'dev' | 'prod'
app.run({
    db: DB_HOSTS[env],
    port
});
```

This code will behave like this:

![terminal-demo](./demo.gif)

# Playground

You can test it without installing _anything_ on your machine. Just go to the

**[Interactive Demo](https://int0h.github.io/typed-cli-pg/index.html)**

(⚠️it's about 20Mb of traffic).
It has _interactive_ terminal and code editor, you can change the samples and see how it reacts.

# Key features

- **Type safety**
- input validation (customizable)
- help generation
- printing reports for invalid data
- **tab completions**
- input data transformation
- support for **commands**

# Documentation
The docs can be found here: [https://int0h.github.io/typed-cli-docs/](https://int0h.github.io/typed-cli-docs/)
