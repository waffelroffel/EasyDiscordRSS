import { ColorResolvable, MessageEmbed, TextChannel } from "discord.js"
import { existsSync, promises, readFileSync } from "fs"
import { join } from "path"
import History, { PrunableHistory } from "./History"

export interface Post {
	title: string
	url?: string
}

export default abstract class Feed {
	abstract readonly name: string
	abstract readonly url: string
	abstract readonly history: History
	abstract readonly isCustom: boolean

	readonly channels: TextChannel[] = []

	color: ColorResolvable = genRandColor()

	protected abstract _fetch(): Promise<Post[]>

	async fetch(): Promise<void> {
		if (this.channels.length === 0) return
		try {
			const items = await this._fetch()
			if (items.length === 0) return
			const embed = new MessageEmbed()
				.setTitle(`[${this.name.toUpperCase()}] ${new URL(this.url).hostname}`)
				.setURL(this.url)
			items.forEach(item =>
				embed.addField(
					item.title.replaceAll("&#039;", "'").replaceAll("&amp;", "&"),
					item.url ?? "\u200B"
				)
			)
			embed.setColor(this.color)
			this.send(embed)
		} catch (err) {
			this.send(`[ERROR:${this.name}]: ${(err as Error).message}`)
		}
	}

	send(msg: string | MessageEmbed): void {
		this.channels.forEach(c =>
			typeof msg === "string" ? c.send(msg) : c.send({ embeds: [msg] })
		)
	}

	hasChannel(chan: TextChannel): boolean {
		return this.channels.some(c => c.id === chan.id)
	}

	addChannel(chan: TextChannel): boolean {
		if (this.hasChannel(chan)) return false
		this.channels.push(chan)
		return true
	}

	removeChannel(chan: TextChannel): boolean {
		const i = this.channels.indexOf(chan)
		if (i === -1) return false
		this.channels.splice(i, 1)
		return true
	}

	getChannelNames(): string[] {
		return this.channels.map(c => c.name)
	}

	getChannelIds(): string[] {
		return this.channels.map(c => c.id)
	}

	getNumOfChannels(): number {
		return this.channels.length
	}

	saveHistory(path: string): void {
		promises.writeFile(
			join(path, this.name + ".json"),
			this.history.serialize()
		)
	}

	loadHistory(path: string): void {
		const historyPath = join(path, this.name + ".json")
		if (!existsSync(historyPath)) return
		const data = readFileSync(historyPath, { encoding: "utf8" })
		if (!data) return
		this.history.load(JSON.parse(data))
	}

	pruneHistory(millis: number): void {
		if (this.history instanceof PrunableHistory) this.history.prune(millis)
	}
}

function genRandColor(): [number, number, number] {
	return hslToRgb((Math.random() + 0.618033988749895) % 1, 0.5, 0.95)
}

// https://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
function hslToRgb(h: number, s: number, v: number): [number, number, number] {
	const h_i = Math.floor(h * 6)
	const f = h * 6 - h_i
	const p = v * (1 - s)
	const q = v * (1 - f * s)
	const t = v * (1 - (1 - f) * s)
	let r, g, b: number
	if (h_i === 0) [r, g, b] = [v, t, p]
	else if (h_i === 1) [r, g, b] = [q, v, p]
	else if (h_i === 2) [r, g, b] = [p, v, t]
	else if (h_i === 3) [r, g, b] = [p, q, v]
	else if (h_i === 4) [r, g, b] = [t, p, v]
	else if (h_i === 5) [r, g, b] = [v, p, q]
	else throw Error("Math gone bad")
	return [Math.floor(r * 256), Math.floor(g * 256), Math.floor(b * 256)]
}
