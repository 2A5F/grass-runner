const { run } = require('../lib/index.js')

run({
    runtime: 'node-eval',
    code: '2 ** 5',
}, console.log, console.error)
