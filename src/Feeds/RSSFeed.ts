import axios from "axios"
import { parse } from "fast-xml-parser"
import Feed, { Post } from "./Feed"
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

	async _fetch(): Promise<Required<Post>[]> {
		const res = await axios.get<string>(this.url)
		const site: Site = parse(res.data)
		return site.rss.channel.item
			.filter(item => !this.history.has(item.link))
			.map(item => {
				return {
					title: item.title,
					url: item.link,
				}
			})
	}
}
