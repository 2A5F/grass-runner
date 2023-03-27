import { npm, node, sub, once, queue, run } from 'darl'

export const dev = [
    npm`swc`('--', 'src', '-d', 'lib', '--config-file', 'cjs.swcrc', '-w'),
]


export const build = once([
    npm`swc`('--', 'src', '-d', 'lib', '--config-file', 'cjs.swcrc'),
    npm`tsc`,
])
