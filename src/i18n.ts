type Locale = {
    expected_but_received: (params: {expected: string, received: string}) => string;
}

// const locale: Locale = {
//     expected_but_received: ({expected, received}) => `expected <${expected}>, but received <${received}>`
// };
