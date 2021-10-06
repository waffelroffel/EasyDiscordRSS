import { existsSync, readFileSync } from "fs"
import { writeFile } from "fs/promises"
import { join } from "path"
import { exit } from "process"
import { createInterface } from "readline"
import { APP_FOLDER, SlashOpts } from "../src"

const CONF_FILE = join(APP_FOLDER, "conf.txt")

export function loadOpts(): Partial<SlashOpts> {
	if (existsSync(CONF_FILE))
		return JSON.parse(readFileSync(CONF_FILE, { encoding: "utf8" }))
	return {}
}

export async function checkOpts(opts: Partial<SlashOpts>): Promise<SlashOpts> {
	let n = 0
	if (!opts.token) {
		opts.token = await ask("Token:")
		n++
	}
	if (!opts.clientId) {
		opts.clientId = await ask("Client id:")
		n++
	}
	if (!opts.puclicKey) {
		opts.puclicKey = await ask("Public key:")
		n++
	}
	if (!opts.guildId) {
		opts.guildId = await ask("Server id:")
		n++
	}
	if (n === 4) saveOpts(opts)
	return opts as SlashOpts
}

export function saveOpts(opts: Partial<SlashOpts>): void {
	writeFile(CONF_FILE, JSON.stringify(opts))
}

const readline = createInterface({
	input: process.stdin,
	output: process.stdout,
})

export async function ask(q: string): Promise<string> {
	return new Promise(resolve => readline.question(q, resolve))
}

export function close(): never {
	readline.close()
	exit(0)
}
