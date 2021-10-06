#!/usr/bin/env node
import {
	deleteInteractions,
	getApplicationCommands,
	registerInteractions,
} from "../src/slashCommands"
import RSSBot from "../src/bot"
import { ask, checkOpts, close, loadOpts } from "./util"
const opts = loadOpts()

if (process.argv.length < 3) close()

main()

async function main(): Promise<void> {
	switch (process.argv[2]) {
		case "register":
			await register()
			close()
			return
		case "unregister":
			await unregister()
			close()
			return
		case "unregisterall":
			await unregister(true)
			close()
			return
		case "run":
			await run()
			return
	}
}

async function register(): Promise<void> {
	const optsAll = await checkOpts(opts)
	await registerInteractions(optsAll)
}

async function unregister(all: boolean = false): Promise<void> {
	const optsAll = await checkOpts(opts)
	const cmds = await getApplicationCommands(optsAll)
	if (cmds.length === 0) return
	if (all)
		await Promise.all(cmds.map(cmd => deleteInteractions(cmd.id, optsAll)))
	else {
		console.log("Registered commands:")
		cmds.forEach((cmd, i) => console.log(`${i + 1}) ${cmd.name}`))

		let i = 0
		do i = +(await ask("Delete cmd:"))
		while (i <= 0 || i > cmds.length || isNaN(i))
		await deleteInteractions(cmds[i - 1].id, optsAll)
	}
}

async function run(): Promise<void> {
	const optsAll = await checkOpts(opts)
	new RSSBot(optsAll.token)
}
