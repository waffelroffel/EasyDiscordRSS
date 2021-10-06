# EasyDiscordRSS

Turn your Discord server into a rss feed

## Quick Start

Follow these two instructions to add a bot to your server.

1. [Create bot application](https://discordjs.guide/preparations/setting-up-a-bot-application.html)
2. [Add bot to server](https://discordjs.guide/preparations/adding-your-bot-to-servers.html)

Rembember to select both `bot` and `applications.commands` for the OAuth2 URL generator.

You should note down the `token`, `client id`, `public key`, and the `server id` as they will be needed own the initial registration of slash commands.

```bash
npm i -g rssbot
rssbot register # register slash commands
rssbot run
```

If everything went well then the bot should be up and running and typing `/rss` in any channel will show a list of all available commands.

### Add RRS Feed To Channel

```
/rss add name url
```

- `name:` should be unique
- `url:` usually just the base url with /rss or /feed

### Remove RRS Feed From Channel

```
/rss rem name
```

---

## Use In Your Own Project

```
npm i rssbot
```

```ts
registerInteractions(opts) // register slash commands
const bot = new RSSBot("token") // create and start bot
bot.client // standard Discord client
```

Turn any site into a rssbot compatable source by extending the `Feed` class.

```ts
class SomeRandomSiteFeed extends Feed {
	async _fetch(): Promise<Article> {
		/*
        get site data and scrape
        */
	}
}

bot.addCustomFeed(new CustomSiteFeed())
```

The custom feed will then be available with

```
/feed add name
```
