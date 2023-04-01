const { run } = require('../lib/index.js')

run({
    runtime: 'deno-eval',
    code: '1 + 1',
}, console.log, console.error)
