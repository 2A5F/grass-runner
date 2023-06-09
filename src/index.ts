import { spawn } from 'child_process'

const default_cmd = 'podman'

export type Runtime = 'node' | 'node-eval' | 'deno' | 'deno-eval' | 'shell' | 'bash' | 'pwsh'

export type Config = {
    cmd?: 'podman'
    runtime: Runtime
    code: string
    /** default 1 */
    cpus?: number
    /** default 128m */
    memory?: number | string
    /** default 512m */
    memorySwap?: number | string
    /** default 60 */
    timeout?: number
}

export function hasRuntime(str: string): str is Runtime {
    return str == 'node' || str == 'node-eval' || str == 'deno' || str == 'deno-eval' || str == 'shell' || str == 'bash' || str == 'pwsh'
}

function runtime2image(runtime: Runtime): string {
    if (runtime == 'node' || runtime == 'node-eval') return 'node'
    if (runtime == 'deno' || runtime == 'deno-eval') return 'denoland/deno'
    if (runtime == 'shell') return 'ubuntu'
    if (runtime == 'bash') return 'bash'
    if (runtime == 'pwsh') return 'mcr.microsoft.com/powershell'
    else throw new Error(`unknow runtime ${runtime}`)
}

function quoted(code: string): string {
    return code.replaceAll('"', '\\"')
}

function runtime2command(runtime: Runtime, code: string): string[] {
    if (runtime == 'node') return ['node', '-e', code]
    if (runtime == 'node-eval') return ['node', '-e', `console.log(eval("${quoted(code)}"))`]
    if (runtime == 'deno') return ['bash', '-c', `DENO_DIR=/run/deno && NO_COLOR=true && deno eval --check --ext ts -q "${quoted(code)}"`]
    if (runtime == 'deno-eval') return ['bash', '-c', `DENO_DIR=/run/deno && NO_COLOR=true && deno eval --check --ext ts -q -p "${quoted(code)}"`]
    if (runtime == 'shell') return ['bash', '-c', code]
    if (runtime == 'bash') return ['bash', '-c', code]
    if (runtime == 'pwsh') return ['pwsh', '-Command', code]
    else throw new Error(`unknow runtime ${runtime}`)
}

export async function run(
    { cmd, runtime, code, cpus, memory, memorySwap, timeout }: Config,
    msg: (msg: string) => void,
    err: (msg: string) => void
): Promise<boolean> {
    cmd ??= default_cmd
    if (cmd != 'podman') throw new Error(`unknow cmd ${cmd}`)
    cpus ??= 1
    memory ??= `128m`
    memorySwap ??= `512m`
    timeout ??= 60
    timeout = Math.max(timeout, 60)
    const image = runtime2image(runtime)
    const command = runtime2command(runtime, code)
    const args = [
        'run',
        '--cpus',
        `${cpus}`,
        '--image-volume',
        'tmpfs',
        '--memory',
        `${memory}`,
        '--memory-swap',
        `${memorySwap}`,
        '--network',
        'none',
        '--read-only',
        '--rm',
        '--timeout',
        `${timeout}`,
        '--workdir',
        '/run',
        image,
        ...command,
    ]
    const cps = spawn(cmd, args, {})
    cps.on('error', e => err(`${e.message}`))
    cps.stdout.setEncoding('utf-8')
    cps.stderr.setEncoding('utf-8')
    const msgs: string[] = []
    const errs: string[] = []
    cps.stdout.on('data', e => msgs.push(e))
    cps.stderr.on('data', e => errs.push(e))
    await new Promise(res => {
        cps.on('close', res)
    })
    if (msgs.length) msg(rmln(msgs.join('')))
    if (errs.length) err(rmln(errs.join('')))
    return msgs.length > 0 || errs.length > 0
}

function rmln(s: string) {
    if (s[s.length - 1] == '\n') return s.slice(0, s.length - 1)
    return s
}
