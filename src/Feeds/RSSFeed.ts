import axios from "axios"
import { parse } from "fast-xml-parser"
import Feed, { Article } from "./Feed"
import { PrunableHistory } from "./History"

interface Item {
	title: string
	link: string
}

interface Site {
	rss: { channel: { item: Item[] } }
}

export default class RSSFeed extends Feed {
	readonly name: string
	readonly url: string
	readonly history = new PrunableHistory()
	readonly isCustom = false

	constructor(name: string, url: string) {
		super()
		this.name = name
		this.url = url
	}

	async *_fetch(): AsyncGenerator<Article, void, void> {
		const res = await axios.get<string>(this.url)
		const site: Site = parse(res.data)
		for (const item of site.rss.channel.item) {
			if (this.history.has(item.link)) continue
			this.history.set(item.link, new Date().getTime())
			yield {
				title: `[${this.name.toUpperCase()}] ${item.title}`,
				link: item.link,
			}
		}
	}
}
