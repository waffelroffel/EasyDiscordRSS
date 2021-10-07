import {
	Client,
	ColorResolvable,
	CommandInteraction,
	Intents,
	TextChannel,
} from "discord.js"
import { existsSync, mkdirSync, readFileSync } from "fs"
import { writeFile } from "fs/promises"
import { homedir } from "os"
import { join } from "path"
import Feed from "./Feeds/Feed"
import RSSFeed from "./Feeds/RSSFeed"

interface Setting {
	feeds: {
		name: string
		url: string
		channels: string[]
		isCustom: boolean
		color: ColorResolvable
	}[]
}

export interface RSSOpts {
	fetchInterval?: number
	saveInterval?: number
	pruneThreshold?: number
}

const DEFAULT_OPTS: Required<RSSOpts> = {
	fetchInterval: 1000 * 60 * 10, // 10 min
	saveInterval: 1000 * 60 * 60, // 1 hour
	pruneThreshold: 1000 * 60 * 60 * 24 * 7, // 1 week
}

function resolveOptions(opts?: RSSOpts): Required<RSSOpts> {
	if (!opts) return DEFAULT_OPTS
	opts.fetchInterval = opts.fetchInterval ?? DEFAULT_OPTS.fetchInterval
	opts.saveInterval = opts.saveInterval ?? DEFAULT_OPTS.saveInterval
	opts.pruneThreshold = opts.pruneThreshold ?? DEFAULT_OPTS.pruneThreshold
	return opts as Required<RSSOpts>
}

export const APP_FOLDER = join(homedir(), ".rssbot")
export const HISTORY_FOLDER = join(APP_FOLDER, "history")
export const SETTING_FILE = join(APP_FOLDER, "setting.json")

export default class RSSBot {
	readonly client: Client = new Client({ intents: [Intents.FLAGS.GUILDS] })
	readonly opts: Required<RSSOpts>
	readonly feeds = new Map<string, Feed>()

	readonly customFeeds = new Map<string, Feed>()

	get allFeeds(): Feed[] {
		return [...this.feeds.values(), ...this.customFeeds.values()]
	}

	constructor(token: string, opts?: RSSOpts) {
		// change to client or token parameter
		this.opts = resolveOptions(opts)
		this.setupOnReady()
		this.setupOnCmd()
		this.client.login(token)
	}

	loadSetting(): void {
		mkdirSync(APP_FOLDER, { recursive: true })
		mkdirSync(HISTORY_FOLDER, { recursive: true })
		if (!existsSync(SETTING_FILE)) return // log
		const data = readFileSync(SETTING_FILE, { encoding: "utf8" })
		if (!data) return // warning
		const setting: Setting = JSON.parse(
			readFileSync(SETTING_FILE, { encoding: "utf8" })
		)
		setting.feeds.forEach(f => {
			if (f.isCustom) return
			const msg = this.addRSS(f.name, f.url)
			if (msg) throw Error(`[ERROR:startup] ${msg}`)
			const feed = this.feeds.get(f.name)
			if (!feed) throw Error("[ERROR:startup] Failed to add RSS.")
			feed.color = f.color
			f.channels.forEach(id => {
				this.client.channels.fetch(id).then(chan => {
					if (!chan)
						throw Error(`[ERROR:startup] Failed to find channel ${id}.`)
					// chan.isText()
					if (!(chan instanceof TextChannel))
						throw Error(
							`[ERROR:startup] Channel ${chan.id} is not a TextChannel.`
						)
					feed.addChannel(chan)
				})
			})
		})
	}

	saveSetting(): void {
		const setting: Setting = {
			feeds: this.allFeeds.map(feed => {
				return {
					name: feed.name,
					url: feed.url,
					channels: feed.getChannelIds(),
					isCustom: feed.isCustom,
					color: feed.color,
				}
			}),
		}
		writeFile(SETTING_FILE, JSON.stringify(setting))
	}

	setupOnReady(): void {
		this.client.once("ready", () => {
			console.log(`${this.client.user?.username} is online!`)
			this.client.user?.setActivity("GME stonks", { type: "WATCHING" })
			this.loadSetting()
			this.feeds.forEach(feed => {
				feed.loadHistory(HISTORY_FOLDER)
				feed.pruneHistory(this.opts.pruneThreshold)
				feed.saveHistory(HISTORY_FOLDER)
			})
			setInterval(
				() => this.allFeeds.forEach(feed => feed.fetch()),
				this.opts.fetchInterval
			)
			setInterval(() => {
				this.allFeeds.forEach(feed => {
					feed.pruneHistory(this.opts.pruneThreshold)
					feed.saveHistory(HISTORY_FOLDER)
				})
			}, this.opts.saveInterval)
		})
	}

	setupOnCmd(): void {
		this.client.on("interactionCreate", cmd => {
			if (!cmd.isCommand()) return
			if (cmd.commandName === "rss") return this.rssCommands(cmd)
			if (cmd.commandName === "feed") return this.feedCommands(cmd)
		})
		// list all avaiable feeds
	}

	rssCommands(cmd: CommandInteraction): void {
		if (!(cmd.channel instanceof TextChannel)) return
		switch (cmd.options.getSubcommand(true)) {
			case "add":
				cmd.reply(
					this.addRSSToChannel(
						cmd.options.getString("name", true),
						cmd.channel,
						cmd.options.getString("url")
					)
				)
				return
			case "rem":
				cmd.reply(
					this.remRSSFromChannel(
						cmd.options.getString("name", true),
						cmd.channel
					)
				)
				return
			case "list": // split
				cmd.reply(this.listFeedsInChannel(cmd.channel))
				return
			case "fetch":
				cmd.reply(this.fetchFeeds(cmd.channel))
				return
			case "fetchall":
				cmd.reply(this.fetchAllFeeds())
				return
			case "save":
				cmd.reply(this.saveSettingAndHistory())
				return
			case "prune":
				cmd.reply(this.pruneHistory())
				return
		}
	}

	feedCommands(cmd: CommandInteraction): void {
		if (!(cmd.channel instanceof TextChannel)) return
		switch (cmd.options.getSubcommand(true)) {
			case "add":
				cmd.reply(
					this.addCustomFeedToChannel(
						cmd.options.getString("name", true),
						cmd.channel
					)
				)
				return
			case "rem":
				cmd.reply(
					this.remCustomFeedFromChannel(
						cmd.options.getString("name", true),
						cmd.channel
					)
				)
				return
		}
	}

	addRSSToChannel(name: string, chan: TextChannel, url: string | null): string {
		if (url) {
			const msg = this.addRSS(name, url)
			if (msg) return msg
		}
		const feed = this.feeds.get(name)
		if (!feed) return "RSS Feed not found."
		if (!feed.addChannel(chan)) return "RSS Feed already in channel."
		return "RSS Feed added to channel."
	}

	addRSS(name: string, url: string): string | null {
		if (this.customFeeds.has(name)) return "Name in use by a custom feed."
		const parsedUrl = parseUrl(url)
		// add url check
		const existingFeed = this.feeds.get(name)
		if (!existingFeed) {
			this.feeds.set(name, new RSSFeed(name, parsedUrl))
		} else if (existingFeed.url !== parsedUrl)
			return "Feed name already in use."
		return null
	}

	remRSSFromChannel(name: string, chan: TextChannel): string {
		const feed = this.feeds.get(name)
		if (!feed) return "Feed doesn't exist."
		if (!feed.removeChannel(chan)) return "Feed not in channel."
		return "Feed removed from channel"
	}

	remRSS(name: string): string {
		let feed = this.feeds.get(name)
		if (!feed) return "Feed doesn't exist."
		if (feed.getNumOfChannels() !== 0)
			return `Feed still in use in:\n${feed.getChannelNames().join("\n- ")}`
		this.feeds.delete(name)
		return "Feed deleted."
	}

	listFeedsInChannel(chan: TextChannel): string {
		const feeds = [...this.allFeeds.values()]
			.flatMap(feed =>
				feed.channels.map(chan => [feed.name, feed.url, chan.id])
			)
			.filter(([_, __, chanId]) => chanId === chan.id)
			.map(([name, url]) => `[${name}] ${url}`)
		if (feeds.length === 0) return "No feeds in this channel."
		return `Feeds in this channel:\n- ${feeds.join("\n- ")}`
	}

	fetchFeeds(chan: TextChannel): string {
		this.allFeeds.forEach(async feed => {
			if (feed.channels.some(c => c.id === chan.id)) feed.fetch()
		})
		return "Fetching feeds"
	}

	fetchAllFeeds(): string {
		this.allFeeds.forEach(async feed => feed.fetch())
		return "Fetching all feeds"
	}

	saveSettingAndHistory(): string {
		this.saveSetting()
		this.allFeeds.forEach(async feed => {
			feed.pruneHistory(this.opts.pruneThreshold)
			feed.saveHistory(HISTORY_FOLDER)
		})
		return "Saving settings and history"
	}

	pruneHistory(): string {
		this.allFeeds.forEach(async feed =>
			feed.pruneHistory(this.opts.pruneThreshold)
		)
		return "Removing old items from history"
	}

	// ------------------------------------------
	addCustomFeedToChannel(name: string, chan: TextChannel): string {
		const feed = this.customFeeds.get(name)
		if (!feed) return "Custom feed doesn't exist."
		if (!feed.addChannel(chan)) return "Custom feed already in channel."
		return "Custom feed added to channel."
	}

	addCustomFeed(feed: Feed): string {
		if (this.feeds.has(feed.name)) return "Name in use by a rss feed."
		const existingFeed = this.customFeeds.get(feed.name)
		if (!existingFeed) {
			this.customFeeds.set(feed.name, feed)
			return ""
		}
		if (existingFeed.url !== feed.url) return "Feed name already in use."
		return ""
	}

	remCustomFeedFromChannel(name: string, chan: TextChannel): string {
		const feed = this.customFeeds.get(name)
		if (!feed) return "Feed doesn't exist."
		if (!feed.removeChannel(chan)) return "Feed not in channel."
		return "Feed removed from channel"
	}

	loadCustomFeedHistory(): void {
		this.customFeeds.forEach(feed => {
			feed.loadHistory(HISTORY_FOLDER)
			feed.pruneHistory(this.opts.pruneThreshold)
			feed.saveHistory(HISTORY_FOLDER)
		})
	}
}

function parseUrl(url: string): string {
	if (url.substr(0, 8) === "https://") return url
	if (url.substr(0, 7) === "http://") return url.replace("http://", "https://")
	return `https://${url}`
}
